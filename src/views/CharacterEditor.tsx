import { useEffect, useState } from 'react'
import { Sparkles, Save, X, RotateCcw } from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import Textarea from '../components/Textarea'
import Avatar from '../components/Avatar'
import { useStore } from '../store/StoreContext'
import { chatOnce } from '../api/minimax'
import { uid } from '../store/storage'
import type { Character } from '../store/types'
import s from './CharacterEditor.module.css'

interface Props {
  character?: Character
  onClose: () => void
  onSave: (c: Character) => void
}

const PERSONA_PROMPT = (direction: string, prev: string | null) =>
  prev
    ? `你是一名角色设定专家。用户给出一个旧的人设方向，需要你基于它生成一个新的变体（保留核心性格，调整表达/背景/场景）。

【旧人设】
${prev}

【新方向关键词】
${direction || '（未提供）'}

请输出完整的 system prompt，包含：
1. 身份设定（姓名、年龄、身份、外在形象）
2. 性格与语气（3-5 个核心性格特征 + 说话方式）
3. 知识范围与背景
4. 与用户的关系定位
5. 行为边界（不会做的事 / 不会说的话）

直接输出 prompt 文本，不要加任何前言后语。`
    : `你是一名角色设定专家。根据用户给的方向生成一份完整的 system prompt。

【方向关键词】
${direction || '（未提供）'}

请输出包含以下要素的 system prompt：
1. 身份设定（姓名、年龄、身份、外在形象）
2. 性格与语气（3-5 个核心性格特征 + 说话方式）
3. 知识范围与背景
4. 与用户的关系定位
5. 行为边界（不会做的事 / 不会说的话）

直接输出 prompt 文本，不要加任何前言后语。`

const SAMPLE_PROMPT = (systemPrompt: string) =>
  `请严格根据以下 system prompt 扮演该角色，输出一句符合人设的招呼语（不要解释、不要 markdown、不要引号）：

"""
${systemPrompt}
"""`

export default function CharacterEditor({ character, onClose, onSave }: Props) {
  const { state } = useStore()
  const settings = state.settings

  const [name, setName] = useState(character?.name ?? '')
  const [avatar, setAvatar] = useState(character?.avatar ?? '')
  const [systemPrompt, setSystemPrompt] = useState(character?.systemPrompt ?? '')
  const [greeting, setGreeting] = useState(character?.greeting ?? '')
  const [tagsText, setTagsText] = useState((character?.tags ?? []).join('、'))

  const [genDirection, setGenDirection] = useState('')
  const [generatingPersona, setGeneratingPersona] = useState(false)
  const [generatingSample, setGeneratingSample] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSave = name.trim() && systemPrompt.trim()

  const requireApi = (): string | null => {
    if (!settings.apiKey) return '请先在右上角设置中配置 API Key 并完成测试。'
    return null
  }

  const aiPersona = async () => {
    const err = requireApi()
    if (err) {
      setAiError(err)
      return
    }
    setAiError(null)
    setGeneratingPersona(true)
    try {
      const text = await chatOnce({
        endpoint: settings.endpoint,
        apiKey: settings.apiKey,
        model: settings.generationModel,
        systemPrompt:
          '你是中文角色设定专家，输出简洁、结构清晰、可直接用作 system prompt 的中文文本。',
        history: [],
        userMessage: PERSONA_PROMPT(genDirection, systemPrompt || null),
        temperature: 0.8,
        maxTokens: settings.maxTokens,
      })
      setSystemPrompt(text.trim())
    } catch (e) {
      setAiError((e as Error).message)
    } finally {
      setGeneratingPersona(false)
    }
  }

  const aiSample = async () => {
    const err = requireApi()
    if (err) {
      setAiError(err)
      return
    }
    if (!systemPrompt.trim()) {
      setAiError('请先填写 system prompt。')
      return
    }
    setAiError(null)
    setGeneratingSample(true)
    try {
      const text = await chatOnce({
        endpoint: settings.endpoint,
        apiKey: settings.apiKey,
        model: settings.generationModel,
        systemPrompt: systemPrompt,
        history: [],
        userMessage: SAMPLE_PROMPT(systemPrompt),
        temperature: 0.9,
        maxTokens: 200,
      })
      setGreeting(text.trim())
    } catch (e) {
      setAiError((e as Error).message)
    } finally {
      setGeneratingSample(false)
    }
  }

  const save = () => {
    if (!canSave) return
    const tags = tagsText
      .split(/[、,,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
    const payload: Character = {
      id: character?.id ?? uid(),
      name: name.trim(),
      avatar: avatar.trim(),
      systemPrompt: systemPrompt.trim(),
      greeting: greeting.trim(),
      tags,
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
      width={720}
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
            hint="输入 1-2 个 emoji，或 https:// 开头图片 URL；留空则用首字母占位。"
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

      <div className={s.section}>
        <div className={s.sectionHead}>
          <h3 className={s.sectionTitle}>System Prompt</h3>
          <div className={s.sectionActions}>
            <Button
              variant="ghost"
              size="sm"
              onClick={aiPersona}
              loading={generatingPersona}
              icon={<Sparkles size={14} />}
            >
              AI 写人设
            </Button>
            {systemPrompt ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSystemPrompt('')}
                icon={<RotateCcw size={14} />}
              >
                清空
              </Button>
            ) : null}
          </div>
        </div>
        <Textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          monospace
          showCount
          rows={8}
          placeholder="你是……&#10;性格：……&#10;说话方式：……"
        />
        <details className={s.advise}>
          <summary>AI 写人设的提示词（高级）</summary>
          <Input
            value={genDirection}
            onChange={(e) => setGenDirection(e.target.value)}
            placeholder="例：清冷古风剑客，背负家仇"
            hint="留空则让模型自由发挥。已有 system prompt 时，会作为参考生成变体。"
          />
        </details>
      </div>

      <div className={s.section}>
        <div className={s.sectionHead}>
          <h3 className={s.sectionTitle}>示例输出（首次打招呼）</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={aiSample}
            loading={generatingSample}
            disabled={!systemPrompt.trim()}
            icon={<Sparkles size={14} />}
          >
            AI 写示例
          </Button>
        </div>
        <Textarea
          value={greeting}
          onChange={(e) => setGreeting(e.target.value)}
          rows={3}
          placeholder="角色在新对话中说的第一句话"
          showCount
        />
      </div>

      {aiError ? <div className={s.error}>{aiError}</div> : null}
    </Modal>
  )
}
