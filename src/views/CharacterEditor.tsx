import { useEffect, useState } from 'react'
import { Sparkles, Save, X, Plus, Trash2, MessageCircle, User } from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import Avatar from '../components/Avatar'
import { useStore } from '../store/StoreContext'
import { chatOnce } from '../api/minimax'
import { uid } from '../store/storage'
import type { Character, CharacterRole, Sample } from '../store/types'
import s from './CharacterEditor.module.css'

interface Props {
  character?: Character
  onClose: () => void
  onSave: (c: Character) => void
}

const SAMPLE_DRAFT: Sample = { user: '', ai: '' }

function pickLang(endpoint: 'cn' | 'global'): 'zh' | 'en' {
  return endpoint === 'cn' ? 'zh' : 'en'
}

/** 去掉 thinking 残块（<think>...</think> 或 自由文本思考），保留主体 */
function stripThinking(text: string): string {
  // 1) 去掉 <think>...</think>
  let t = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
  // 2) 去掉 1-3 行"先思考一下……"这种 leading 段落（没有"##"或中文句号的连续英文/代码块）
  //    简单启发：如果 ## 之前的内容看起来像思考（没有标点、都是英文、连续短行），截断
  const sectionIdx = t.search(/##\s*(system|samples|greeting)/i)
  if (sectionIdx > 0) {
    const before = t.slice(0, sectionIdx)
    // 判断 before 是否像思考：含 think / Let me / I should 等英文思考词
    if (/(\bthink\b|\bLet me\b|\bI should\b|\bFirst,?\s|\bNow,?\s|\bI need to\b)/i.test(before)) {
      t = t.slice(sectionIdx)
    }
  }
  return t.trim()
}

function buildPersonaPrompt(
  direction: string,
  prev: string | null,
  lang: 'zh' | 'en',
): { systemMsg: string; userMsg: string } {
  if (lang === 'zh') {
    return {
      systemMsg:
        '你是中文角色设定专家。直接输出最终结果，不要输出思考过程或英文解释。',
      userMsg: prev
        ? `用户的旧人设如下，需要基于它生成一个变体（保留核心特质，调整表达或背景）。

【旧人设】
${prev}

【新方向关键词】
${direction || '（未提供）'}

请严格按下面的格式输出，**只输出这三段，不要其他任何内容、思考、解释**：

## system
（简洁的 system prompt，100-300 字。包含：身份、性格（3-5 个核心词）、说话方式、知识范围、与用户关系、行为边界。）

## samples
三条示例对话，每条一对 user/ai 消息。覆盖角色的不同侧面：
- 示例 1：日常寒暄
- 示例 2：表达情绪或态度
- 示例 3：展示专业知识或独特反应
紧凑 JSON 数组：
[{"user":"...","ai":"..."},{"user":"...","ai":"..."},{"user":"...","ai":"..."}]

## greeting
（角色主动打招呼的第一句话，1-2 句）`
        : `你是一名中文角色设定专家。

【方向关键词】
${direction || '（未提供）'}

请严格按下面的格式输出，**只输出这三段，不要其他任何内容、思考、解释**：

## system
（简洁的 system prompt，100-300 字。包含：身份、性格（3-5 个核心词）、说话方式、知识范围、与用户关系、行为边界。）

## samples
三条示例对话，每条一对 user/ai 消息。覆盖角色的不同侧面：
- 示例 1：日常寒暄
- 示例 2：表达情绪或态度
- 示例 3：展示专业知识或独特反应
紧凑 JSON 数组：
[{"user":"...","ai":"..."},{"user":"...","ai":"..."},{"user":"...","ai":"..."}]

## greeting
（角色主动打招呼的第一句话，1-2 句）`,
    }
  }
  return {
    systemMsg:
      'You are a character-design expert. Output only the final result, no thinking trace or commentary.',
    userMsg: prev
      ? `The user has an existing persona and wants a variant (keep core traits, adjust expression or background).

【Existing persona】
${prev}

【New direction keywords】
${direction || '(none provided)'}

Output exactly three sections, nothing else, no thinking trace:

## system
(A concise system prompt, 100-300 words. Cover: identity, personality (3-5 core traits), speech style, knowledge scope, relationship to user, behavioral boundaries.)

## samples
Three example dialogues, each a user/ai pair. Cover different aspects:
- Sample 1: casual small talk
- Sample 2: expressing emotion or attitude
- Sample 3: showing domain knowledge or unique reaction
Compact JSON array:
[{"user":"...","ai":"..."},{"user":"...","ai":"..."},{"user":"...","ai":"..."}]

## greeting
(The character's first opening line, 1-2 sentences.)`
      : `You are a character-design expert.

【Direction keywords】
${direction || '(none provided)'}

Output exactly three sections, nothing else, no thinking trace:

## system
(A concise system prompt, 100-300 words. Cover: identity, personality (3-5 core traits), speech style, knowledge scope, relationship to user, behavioral boundaries.)

## samples
Three example dialogues, each a user/ai pair. Cover different aspects:
- Sample 1: casual small talk
- Sample 2: expressing emotion or attitude
- Sample 3: showing domain knowledge or unique reaction
Compact JSON array:
[{"user":"...","ai":"..."},{"user":"...","ai":"..."},{"user":"...","ai":"..."}]

## greeting
(The character's first opening line, 1-2 sentences.)`,
  }
}

function parsePersona(text: string): {
  system: string
  samples: Sample[]
  greeting: string
} {
  const cleaned = stripThinking(text)
  const sysMatch = cleaned.match(
    /##\s*system\s*\n([\s\S]*?)(?=\n##\s*(?:samples|greeting)|\s*$)/i,
  )
  const samplesMatch = cleaned.match(
    /##\s*samples\s*\n([\s\S]*?)(?=\n##\s*greeting|\s*$)/i,
  )
  const greetMatch = cleaned.match(/##\s*greeting\s*\n([\s\S]*?)\s*$/i)

  const system = sysMatch ? sysMatch[1].trim() : ''
  let samples: Sample[] = []
  if (samplesMatch) {
    const raw = samplesMatch[1].trim()
    const arrayMatch = raw.match(/\[[\s\S]*\]/)
    const jsonText = arrayMatch ? arrayMatch[0] : raw
    try {
      const parsed = JSON.parse(jsonText)
      if (Array.isArray(parsed)) {
        samples = parsed
          .filter(
            (x: unknown): x is { user: string; ai: string } =>
              typeof x === 'object' &&
              x !== null &&
              typeof (x as { user?: unknown }).user === 'string' &&
              typeof (x as { ai?: unknown }).ai === 'string',
          )
          .map((x) => ({ user: x.user.trim(), ai: x.ai.trim() }))
      }
    } catch {
      const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)
      const re =
        /["']?user["']?\s*[:：]\s*["']([^"']+)["']\s*[,，]?\s*["']?ai["']?\s*[:：]\s*["']([^"']+)["']/i
      for (const line of lines) {
        const m = line.match(re)
        if (m) samples.push({ user: m[1], ai: m[2] })
      }
    }
  }
  const greeting = greetMatch ? greetMatch[1].trim() : ''
  return { system, samples, greeting }
}

export default function CharacterEditor({ character, onClose, onSave }: Props) {
  const { state } = useStore()
  const settings = state.settings

  const [name, setName] = useState(character?.name ?? '')
  const [avatar, setAvatar] = useState(character?.avatar ?? '')
  const [systemPrompt, setSystemPrompt] = useState(character?.systemPrompt ?? '')
  const [samples, setSamples] = useState<Sample[]>(
    character?.samples?.length ? character.samples : [SAMPLE_DRAFT],
  )
  const [greeting, setGreeting] = useState(character?.greeting ?? '')
  const [tagsText, setTagsText] = useState((character?.tags ?? []).join('、'))
  const [role, setRole] = useState<CharacterRole>(character?.role ?? 'character')

  const [genDirection, setGenDirection] = useState('')
  const [generating, setGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSave = name.trim() && systemPrompt.trim()
  const lang = pickLang(settings.endpoint)

  const requireApi = (): string | null => {
    if (!settings.apiKey) return '请先在右上角设置中配置 API Key 并完成测试。'
    return null
  }

  const aiGenerateAll = async () => {
    const err = requireApi()
    if (err) {
      setAiError(err)
      return
    }
    setAiError(null)
    setGenerating(true)
    try {
      const { systemMsg, userMsg } = buildPersonaPrompt(
        genDirection,
        systemPrompt || null,
        lang,
      )
      const text = await chatOnce({
        endpoint: settings.endpoint,
        apiKey: settings.apiKey,
        model: settings.generationModel,
        systemPrompt: systemMsg,
        history: [],
        userMessage: userMsg,
        temperature: 0.85,
        maxTokens: 1200,
      })
      const parsed = parsePersona(text)
      if (parsed.system) setSystemPrompt(parsed.system)
      if (parsed.samples.length) {
        const filled: Sample[] = [...parsed.samples]
        while (filled.length < 3) filled.push({ user: '', ai: '' })
        setSamples(filled.slice(0, 5))
      }
      if (parsed.greeting) setGreeting(parsed.greeting)
    } catch (e) {
      setAiError((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  const updateSample = (idx: number, patch: Partial<Sample>) => {
    setSamples((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }
  const removeSample = (idx: number) => {
    setSamples((arr) => (arr.length <= 1 ? arr : arr.filter((_, i) => i !== idx)))
  }
  const addSample = () => {
    if (samples.length >= 5) return
    setSamples((arr) => [...arr, SAMPLE_DRAFT])
  }

  const save = () => {
    if (!canSave) return
    const tags = tagsText
      .split(/[、,,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    const cleanSamples = samples
      .filter((x) => x.user.trim() || x.ai.trim())
      .map((x) => ({ user: x.user.trim(), ai: x.ai.trim() }))
    const payload: Character = {
      id: character?.id ?? uid(),
      name: name.trim(),
      avatar: avatar.trim(),
      systemPrompt: systemPrompt.trim(),
      // user 类型不需要 samples 和 greeting
      samples: role === 'user' ? [] : cleanSamples,
      greeting: role === 'user' ? '' : greeting.trim(),
      tags,
      role,
      createdAt: character?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    }
    onSave(payload)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={character ? '编辑人物' : '新建人物'}
      width={760}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} icon={<X size={14} />}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={save}
            disabled={!canSave}
            icon={<Save size={14} />}
          >
            保存
          </Button>
        </>
      }
    >
      <div className={s.grid}>
        <div className={s.avatarCol}>
          <div className={s.avatarPreview}>
            <Avatar name={name || '?'} avatar={avatar} size={96} />
          </div>
          <Input
            label="头像"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="emoji 或图片 URL"
            hint="1-2 个 emoji，或 https:// 开头图片 URL；留空则用首字母占位。"
          />
        </div>

        <div className={s.fieldsCol}>
          <Input
            label="名字"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：苏晚"
            maxLength={32}
          />
          <Input
            label="标签（可选）"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="古风、温柔、话少"
            hint="用逗号或顿号分隔。"
          />
        </div>
      </div>

      <div className={s.roleBox}>
        <label className={s.roleLabel}>类型</label>
        <div className={s.roleSegment}>
          <button
            type="button"
            className={[s.roleSeg, role === 'character' ? s.roleSegActive : ''].join(' ')}
            onClick={() => setRole('character')}
          >
            <span className={s.roleSegTitle}>AI 角色</span>
            <span className={s.roleSegDesc}>
              由模型扮演。对话时作为 system + few-shot 范例
            </span>
          </button>
          <button
            type="button"
            className={[s.roleSeg, role === 'user' ? s.roleSegActive : ''].join(' ')}
            onClick={() => setRole('user')}
          >
            <span className={s.roleSegTitle}>我的人设</span>
            <span className={s.roleSegDesc}>
              代表你自己。对话时作为 user_system 注入
            </span>
          </button>
        </div>
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>
          <h3 className={s.sectionTitle}>System Prompt</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSystemPrompt('')}
            icon={<Trash2 size={14} />}
            disabled={!systemPrompt}
          >
            清空
          </Button>
        </div>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          monospace
          showCount
          rows={5}
          placeholder="身份、性格（3-5 词）、说话方式、知识范围、关系定位、行为边界"
        />
        <p className={s.fieldHint}>
          简洁为佳（建议 100-300 字），细节交给示例对话来教模型。
        </p>
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>
          <h3 className={s.sectionTitle}>
            示例对话
            <span className={s.sectionMeta}>教模型怎么说话 · 推荐 3 条 · 不同侧面</span>
          </h3>
        </div>
        <ul className={s.sampleList}>
          {samples.map((sp, idx) => (
            <li key={idx} className={s.sampleItem}>
              <div className={s.sampleHead}>
                <span className={s.sampleIndex}>示例 {idx + 1}</span>
                {samples.length > 1 ? (
                  <button
                    type="button"
                    className={s.sampleRemove}
                    onClick={() => removeSample(idx)}
                    aria-label="删除示例"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
              <div className={s.samplePair}>
                <div className={s.sampleField}>
                  <label className={s.sampleLabel}>
                    <User size={12} /> 用户
                  </label>
                  <textarea
                    className={s.sampleTextarea}
                    value={sp.user}
                    onChange={(e) => updateSample(idx, { user: e.target.value })}
                    rows={2}
                    placeholder="用户可能说的话"
                  />
                </div>
                <div className={s.sampleField}>
                  <label className={s.sampleLabel}>
                    <MessageCircle size={12} /> 角色
                  </label>
                  <textarea
                    className={s.sampleTextarea}
                    value={sp.ai}
                    onChange={(e) => updateSample(idx, { ai: e.target.value })}
                    rows={3}
                    placeholder="角色怎么回应——语气、习惯、个性"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
        {samples.length < 5 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={addSample}
            icon={<Plus size={14} />}
          >
            新增示例
          </Button>
        ) : null}
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>
          <h3 className={s.sectionTitle}>首次打招呼（角色开场白）</h3>
        </div>
        <Textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={2}
          placeholder="新对话开始时，角色主动说的第一句话"
          showCount
        />
      </div>

      <div className={s.aiGenBox}>
        <div className={s.aiGenHead}>
          <Sparkles size={16} />
          <span>
            AI 一键生成（同时生成 system prompt + 3 条示例 + 开场白）
          </span>
        </div>
        <Input
          value={genDirection}
          onChange={(e) => setGenDirection(e.target.value)}
          placeholder="例：清冷古风剑客，背负家仇"
          hint={`留空将让模型自由发挥。已有 system prompt 时会作为参考生成变体。当前生成语言：${lang === 'zh' ? '中文' : '英文'}。`}
        />
        <Button
          variant="primary"
          onClick={aiGenerateAll}
          loading={generating}
          icon={<Sparkles size={14} />}
        >
          一键生成
        </Button>
      </div>

      {aiError ? <div className={s.error}>{aiError}</div> : null}
    </Modal>
  )
}
