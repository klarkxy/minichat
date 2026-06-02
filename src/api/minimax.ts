import type { ChatMessage, Endpoint } from '../store/types'

const ENDPOINTS: Record<Endpoint, string> = {
  global: 'https://api.minimax.io/v1',
  cn: 'https://api.minimaxi.com/v1',
}

/**
 * 过滤模型输出的 <think>...</think> 块（H2-her 会把思考过程放进 content）。
 * 流式和一次性都可用。
 */
export function stripThink(s: string): string {
  return s.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

/**
 * 流式 think 块过滤器：处理跨 chunk 边界的不完整标签。
 * 用法：new ThinkFilter(); filter(delta) -> string
 */
class ThinkFilter {
  private buf = ''
  private inThink = false

  /** 输入一段新 delta，输出可以安全推给 UI 的文本（可能为空） */
  push(delta: string): string {
    this.buf += delta
    let out = ''
    // 循环处理缓冲区，处理可能存在的多个 think 块
    while (true) {
      if (this.inThink) {
        const endIdx = this.buf.indexOf('</think>')
        if (endIdx === -1) {
          // 还在 think 块里，没遇到结束标签
          // 但如果缓冲区里有半个 </think> 标签（<、</、</t、</th...），需要保留
          const partialMatch = this.buf.match(/<\/?t?h?i?n?k?>?$/i)
          if (partialMatch) {
            // 把可能是不完整标签的部分保留，丢掉之前的
            this.buf = partialMatch[0]
          } else {
            this.buf = ''
          }
          return out
        }
        // 找到结束标签，跳过它和它之前的全部
        this.buf = this.buf.slice(endIdx + '</think>'.length)
        this.inThink = false
      } else {
        const startIdx = this.buf.indexOf('<think>')
        if (startIdx === -1) {
          // 没有起始标签，但可能有半个 <think> 跨边界
          const partialMatch = this.buf.match(/<t?h?i?n?k?>?$/i)
          if (partialMatch && this.buf.length - partialMatch[0].length === 0) {
            // 整个缓冲区都是可能的不完整标签，保留
          } else if (partialMatch) {
            out += this.buf.slice(0, this.buf.length - partialMatch[0].length)
            this.buf = partialMatch[0]
          } else {
            out += this.buf
            this.buf = ''
          }
          return out
        }
        // 找到起始标签
        out += this.buf.slice(0, startIdx)
        this.buf = this.buf.slice(startIdx + '<think>'.length)
        this.inThink = true
      }
    }
  }

  /** 流结束时调用，处理残留缓冲区（不完整的 think 块） */
  flush(): string {
    // 如果还在 think 块里，丢弃全部
    if (this.inThink) {
      this.buf = ''
      return ''
    }
    // 否则输出剩余（不完整标签直接丢弃）
    const partialMatch = this.buf.match(/<t?h?i?n?k?>?$/i)
    if (partialMatch && this.buf.length > partialMatch[0].length) {
      const out = this.buf.slice(0, this.buf.length - partialMatch[0].length)
      this.buf = ''
      return out
    }
    return ''
  }
}

export interface ApiChatRequest {
  endpoint: Endpoint
  apiKey: string
  model: string
  /** AI 角色 system prompt（必须） */
  systemPrompt: string
  /** 用户人设 user_system（可选） */
  userSystemPrompt?: string
  /** 场景 group（可选） */
  scenario?: string
  /** few-shot 样本对话（推荐 1-3 对） */
  samples?: { user: string; ai: string }[]
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
  const validSamples = (req.samples ?? []).filter(
    (s) => s.user.trim() && s.ai.trim(),
  )

  // 高级角色：cn 端点（M2-her）支持 user_system / group / sample_message_*
  // ⚠️ 实测：M2-her 服务端在收到这些角色时 100% 返回 999 (1000) 错误
  // （虽然官方文档说支持）。详见 README 的"已知问题"小节。
  if (req.endpoint === 'cn') {
    const messages: RawMessage[] = [{ role: 'system', content: req.systemPrompt }]
    if (req.userSystemPrompt?.trim()) {
      messages.push({ role: 'user_system', content: req.userSystemPrompt.trim() })
    }
    if (req.scenario?.trim()) {
      messages.push({ role: 'group', content: req.scenario.trim() })
    }
    // 3 对样本：交错 sample_message_user / sample_message_ai
    for (const s of validSamples) {
      messages.push({ role: 'sample_message_user', content: s.user.trim() })
      messages.push({ role: 'sample_message_ai', content: s.ai.trim() })
    }
    messages.push(
      ...req.history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: req.userMessage },
    )
    return {
      model: req.model,
      messages,
      temperature: req.temperature,
      max_completion_tokens: req.maxTokens,
      stream,
      thinking: { type: 'disabled' },
    } as Record<string, unknown>
  }

  // 国际端（OpenAI 兼容）：不支持高级角色，拼到 system prompt
  const systemBlocks: string[] = [req.systemPrompt]
  if (req.userSystemPrompt?.trim()) {
    systemBlocks.push('【用户身份】\n' + req.userSystemPrompt.trim())
  }
  if (req.scenario?.trim()) {
    systemBlocks.push('【当前场景】\n' + req.scenario.trim())
  }
  if (validSamples.length) {
    const blocks = validSamples
      .map((s) => `用户：${s.user.trim()}\nAI：${s.ai.trim()}`)
      .join('\n\n')
    systemBlocks.push('【参考示例 — 模仿这些对话的语气和风格】\n' + blocks)
  }
  const fullSystem = systemBlocks.join('\n\n')

  const messages: RawMessage[] = [
    { role: 'system', content: fullSystem },
    ...req.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: req.userMessage },
  ]

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
  const content: string = data?.choices?.[0]?.message?.content ?? ''
  return stripThink(content)
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
  const thinkFilter = new ThinkFilter()

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
            // 累计 full 用原始 delta（保留内部状态）
            full += delta
            // 推给 UI 的是过滤掉 think 块后的内容
            const clean = thinkFilter.push(delta)
            if (clean) onDelta(clean)
          }
        } catch (err) {
          console.warn('SSE parse error', err, payload)
        }
      }
    }
  }

  // 流结束，flush 残留
  const tail = thinkFilter.flush()
  if (tail) onDelta(tail)

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
