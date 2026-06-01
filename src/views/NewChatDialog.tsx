import { useState } from 'react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Textarea from '../components/Textarea'
import Avatar from '../components/Avatar'
import EmptyState from '../components/EmptyState'
import { UserRound, ArrowRight } from 'lucide-react'
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
  const [selectedId, setSelectedId] = useState<string | null>(
    defaultCharacterId ?? state.characters[0]?.id ?? null,
  )
  const [scenario, setScenario] = useState('')
  const [temperature, setTemperature] = useState(state.settings.temperature)

  if (state.characters.length === 0) {
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

  const start = () => {
    if (!selectedId) return
    const ch = state.characters.find((c) => c.id === selectedId)
    if (!ch) return
    const newChat = {
      id: uid(),
      characterId: ch.id,
      title: scenario.trim() || `与 ${ch.name} 的对话`,
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
      width={620}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={start}
            disabled={!selectedId}
            iconRight={<ArrowRight size={14} />}
          >
            开始对话
          </Button>
        </>
      }
    >
      <div className={s.section}>
        <h3 className={s.h3}>选择人物</h3>
        <div className={s.charList}>
          {state.characters.map((c) => (
            <CharacterOption
              key={c.id}
              c={c}
              active={c.id === selectedId}
              onClick={() => setSelectedId(c.id)}
            />
          ))}
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.h3}>场景设定（可选）</h3>
        <Textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={3}
          placeholder="例：咖啡馆里，你和 ta 偶遇&#10;深夜的便利店里，你听见 ta 在打电话"
          hint="作为对话背景注入到 prompt 中，影响模型对当下情境的理解。"
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
        <div className={s.charName}>{c.name}</div>
        <div className={s.charPreview}>
          {c.greeting || c.systemPrompt.slice(0, 40) || '（未填写）'}
        </div>
      </div>
    </button>
  )
}
