import type { ChatMessage, Endpoint } from '../store/types'

const ENDPOINTS: Record<Endpoint, string> = {
  global: 'https://api.minimax.io/v1',
  cn: 'https://api.minimaxi.com/v1',
}

export interface ApiChatRequest {
  endpoint: Endpoint
  apiKey: string
  model: string
  systemPrompt: string
  history: ChatMessage[] // assistant + user messages only
  userMessage: string
  temperature: number
  maxTokens: number
  signal?: AbortSignal
}

interface ApiError extends Error {
  status?: number
  body?: string
}

function makeError(msg: string, status?: number, body?: string): ApiError {
  const err = new Error(msg) as ApiError
  err.status = status
  err.body = body
  return err
}

interface RawMessage {
  role: 'system' | 'user' | 'assistant' | string
  content: string
}

function buildRequestBody(req: ApiChatRequest, stream: boolean) {
  const messages: RawMessage[] = [
    { role: 'system', content: req.systemPrompt },
    ...req.history.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: req.userMessage },
  ]
  // thinking 字段：M3 支持，M2-her 忽略；显式禁用 thinking 避免模型把推理过程输出到 content
  return {
    model: req.model,
    messages,
    temperature: req.temperature,
    max_completion_tokens: req.maxTokens,
    stream,
    thinking: { type: 'disabled' },
  } as Record<string, unknown>
}

async function parseError(res: Response): Promise<ApiError> {
  const text = await res.text().catch(() => '')
  let detail = text
  try {
    const j = JSON.parse(text)
    detail = j?.error?.message || j?.message || text
  } catch {
    /* keep text */
  }
  if (res.status === 401) return makeError('API Key 无效或已过期（401）', 401, detail)
  if (res.status === 402 || res.status === 403)
    return makeError('账户余额不足或无权限（' + res.status + '）', res.status, detail)
  if (res.status === 429)
    return makeError('请求过于频繁，已被限流（429）', 429, detail)
  if (res.status >= 500)
    return makeError('服务端错误（' + res.status + '）', res.status, detail)
  return makeError('请求失败：' + res.status + ' ' + res.statusText, res.status, detail)
}

/** non-streaming chat completion */
export async function chatOnce(req: ApiChatRequest): Promise<string> {
  const url = ENDPOINTS[req.endpoint] + '/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + req.apiKey,
    },
    body: JSON.stringify(buildRequestBody(req, false)),
    signal: req.signal,
  })
  if (!res.ok) throw await parseError(res)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

/** streaming chat completion, returns the full content when done */
export async function chatStream(
  req: ApiChatRequest,
  onDelta: (delta: string) => void,
): Promise<string> {
  const url = ENDPOINTS[req.endpoint] + '/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + req.apiKey,
    },
    body: JSON.stringify(buildRequestBody(req, true)),
    signal: req.signal,
  })
  if (!res.ok) throw await parseError(res)
  if (!res.body) throw makeError('响应为空（无 body）')

  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let full = ''

  const DONE = '[DONE]'

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const lines = part.split('\n')
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === DONE) continue
        try {
          const json = JSON.parse(payload)
          const delta = json?.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta.length > 0) {
            full += delta
            onDelta(delta)
          }
        } catch (err) {
          console.warn('SSE parse error', err, payload)
        }
      }
    }
  }

  return full
}

/** minimal connectivity check: send a 1-token request */
export interface TestResult {
  ok: boolean
  message: string
  latencyMs?: number
  reply?: string
}

export async function testConnection(
  endpoint: Endpoint,
  apiKey: string,
  model: string,
): Promise<TestResult> {
  if (!apiKey) return { ok: false, message: 'API Key 为空' }
  const url = ENDPOINTS[endpoint] + '/chat/completions'
  const start = performance.now()
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'ping' }],
        max_completion_tokens: 8,
        temperature: 0,
        stream: false,
      }),
    })
    const latencyMs = Math.round(performance.now() - start)
    if (!res.ok) {
      const err = await parseError(res)
      return { ok: false, message: err.message, latencyMs }
    }
    const data = await res.json()
    const reply: string = data?.choices?.[0]?.message?.content ?? ''
    return {
      ok: true,
      message: '连接成功',
      latencyMs,
      reply: reply.slice(0, 40),
    }
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start)
    const msg =
      err instanceof TypeError && /fetch/i.test(err.message)
        ? '网络请求失败，可能被浏览器 CORS 策略拦截。请检查 API Key 是否正确，或尝试切换 endpoint。'
        : (err as Error)?.message || '未知错误'
    return { ok: false, message: msg, latencyMs }
  }
}
