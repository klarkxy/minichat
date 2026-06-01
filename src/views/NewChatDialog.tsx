import { useState, useMemo } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Textarea from '../components/Textarea'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import { UserRound, ArrowRight, X } from 'lucide-react'
import { useStore } from '../store/StoreContext'
import { useNavigate } from 'react-router-dom'
import { uid } from '../store/storage'
import type { Character } from '../store/types'
import s from './NewChatDialog.module.css'

interface Props {
  open: boolean
  onClose: () => void
  defaultCharacterId?: string
}

export default function NewChatDialog({ open, onClose, defaultCharacterId }: Props) {
  const { state, dispatch } = useStore()
  const nav = useNavigate()

  const characters = state.characters
  const aiCharacters = useMemo(
    () => characters.filter((c) => c.role !== 'user'),
    [characters],
  )
  const userCharacters = useMemo(
    () => characters.filter((c) => c.role === 'user'),
    [characters],
  )

  const [selectedAiId, setSelectedAiId] = useState<string | null>(
    defaultCharacterId ?? aiCharacters[0]?.id ?? null,
  )
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [scenario, setScenario] = useState('')
  const [temperature, setTemperature] = useState(state.settings.temperature)

  if (characters.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="新建对话" width={460}>
        <EmptyState
          icon={<UserRound size={24} />}
          title="还没有人物"
          description="先创建一个人物才能开始对话。"
        />
      </Modal>
    )
  }

  if (aiCharacters.length === 0) {
    return (
      <Modal open={open} onClose={onClose} title="新建对话" width={460}>
        <EmptyState
          icon={<UserRound size={24} />}
          title="还没有 AI 角色"
          description="需要至少一个 AI 角色才能开聊。建一个吧。"
        />
      </Modal>
    )
  }

  const start = () => {
    if (!selectedAiId) return
    const aiCh = state.characters.find((c) => c.id === selectedAiId)
    if (!aiCh) return
    const newChat = {
      id: uid(),
      characterId: aiCh.id,
      userCharacterId: selectedUserId ?? undefined,
      title: scenario.trim() || `与 ${aiCh.name} 的对话`,
      scenario: scenario.trim(),
      temperature,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    dispatch({ type: 'add-chat', payload: newChat })
    onClose()
    nav('/chat/' + newChat.id)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="新建对话"
      width={680}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={start}
            disabled={!selectedAiId}
            iconRight={<ArrowRight size={14} />}
          >
            开始对话
          </Button>
        </>
      }
    >
      <div className={s.dualPane}>
        <div className={s.pane}>
          <h3 className={s.h3}>
            AI 角色
            <span className={s.h3Hint}>必选 · 由模型扮演</span>
          </h3>
          <div className={s.charList}>
            {aiCharacters.map((c) => (
              <CharacterOption
                key={c.id}
                c={c}
                active={c.id === selectedAiId}
                onClick={() => setSelectedAiId(c.id)}
              />
            ))}
          </div>
        </div>

        <div className={s.pane}>
          <h3 className={s.h3}>
            我的人设
            <span className={s.h3Hint}>可选 · 注入 user_system</span>
          </h3>
          {userCharacters.length === 0 ? (
            <div className={s.emptyUser}>
              <p>还没有"我的人设"。</p>
              <p className={s.emptyHint}>
                在人物页新建角色时，类型选「我的人设」，就可以在对话里扮演一个具体身份。
              </p>
            </div>
          ) : (
            <div className={s.charList}>
              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className={[s.char, s.charSkip, selectedUserId === null ? s.charActive : ''].join(' ')}
              >
                <X size={16} />
                <div className={s.charText}>
                  <div className={s.charName}>不指定</div>
                  <div className={s.charPreview}>直接以"我"的身份说话</div>
                </div>
              </button>
              {userCharacters.map((c) => (
                <CharacterOption
                  key={c.id}
                  c={c}
                  active={c.id === selectedUserId}
                  onClick={() => setSelectedUserId(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.h3}>
          场景设定（可选）
          <span className={s.h3Hint}>注入到 group · 影响情境理解</span>
        </h3>
        <Textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={2}
          placeholder="例：咖啡馆里，你和 ta 偶遇"
        />
      </div>

      <div className={s.section}>
        <h3 className={s.h3}>Temperature</h3>
        <div className={s.sliderRow}>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className={s.slider}
          />
          <span className={s.sliderVal}>{temperature.toFixed(2)}</span>
        </div>
      </div>
    </Modal>
  )
}

function CharacterOption({
  c,
  active,
  onClick,
}: {
  c: Character
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[s.char, active ? s.charActive : ''].join(' ')}
    >
      <Avatar name={c.name} avatar={c.avatar} size={40} />
      <div className={s.charText}>
        <div className={s.charName}>
          {c.name}
          <span className={s.charRoleTag}>
            {c.role === 'user' ? '我' : 'AI'}
          </span>
        </div>
        <div className={s.charPreview}>
          {c.systemPrompt.slice(0, 40) || c.greeting || '（未填写）'}
        </div>
      </div>
    </button>
  )
}
