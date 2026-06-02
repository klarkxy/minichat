import { useState } from 'react'
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

  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(
    defaultCharacterId ?? characters[0]?.id ?? null,
  )
  const [selectedUserSystemId, setSelectedUserSystemId] = useState<string | null>(null)
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

  const start = () => {
    if (!selectedSystemId) return
    const sysCh = state.characters.find((c) => c.id === selectedSystemId)
    if (!sysCh) return
    const newChat = {
      id: uid(),
      characterId: sysCh.id,
      userCharacterId: selectedUserSystemId ?? undefined,
      title: scenario.trim() || `与 ${sysCh.name} 的对话`,
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
      width={720}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={start}
            disabled={!selectedSystemId}
            iconRight={<ArrowRight size={14} />}
          >
            开始对话
          </Button>
        </>
      }
    >
      <div className={s.dualPane}>
        <div className={s.pane}>
          <h3 className={s.h3}>和 ta 聊</h3>
          <div className={s.charList}>
            {characters.map((c) => (
              <CharacterOption
                key={c.id}
                c={c}
                active={c.id === selectedSystemId}
                onClick={() => setSelectedSystemId(c.id)}
                disabled={c.id === selectedUserSystemId}
              />
            ))}
          </div>
        </div>

        <div className={s.pane}>
          <h3 className={s.h3}>我是谁</h3>
          <div className={s.charList}>
            <button
              type="button"
              onClick={() => setSelectedUserSystemId(null)}
              className={[s.char, s.charSkip, selectedUserSystemId === null ? s.charActive : ''].join(' ')}
            >
              <X size={16} />
              <div className={s.charText}>
                <div className={s.charName}>不指定</div>
              </div>
            </button>
            {characters.map((c) => (
              <CharacterOption
                key={c.id}
                c={c}
                active={c.id === selectedUserSystemId}
                onClick={() => setSelectedUserSystemId(c.id)}
                disabled={c.id === selectedSystemId}
              />
            ))}
          </div>
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.h3}>场景（可选）</h3>
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
  disabled,
}: {
  c: Character
  active: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        s.char,
        active ? s.charActive : '',
        disabled ? s.charDisabled : '',
      ].join(' ')}
    >
      <Avatar name={c.name} avatar={c.avatar} size={36} />
      <div className={s.charName}>{c.name}</div>
    </button>
  )
}
