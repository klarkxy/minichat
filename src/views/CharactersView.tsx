import { useState } from 'react'
import { Plus, Pencil, Trash2, MessageCircle, UserRound, Sparkles } from 'lucide-react'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import CharacterEditor from './CharacterEditor'
import NewChatDialog from './NewChatDialog'
import { useStore } from '../store/StoreContext'
import type { Character } from '../store/types'
import s from './CharactersView.module.css'

export default function CharactersView() {
  const { state, dispatch } = useStore()
  const [editing, setEditing] = useState<Character | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Character | null>(null)
  // 卡片「开始对话」时记录预选的 system 角色 id；null 表示不带预选
  const [quickChatId, setQuickChatId] = useState<string | null>(null)
  const [newOpen, setNewOpen] = useState(false)

  const characters = state.characters

  const startChat = (char: Character) => {
    setQuickChatId(char.id)
    setNewOpen(true)
  }

  const remove = (char: Character) => {
    dispatch({ type: 'delete-character', payload: char.id })
    setConfirmDelete(null)
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>人物</h1>
          <p className={s.subtitle}>
            管理角色设定，每个角色可以基于自己的 system prompt 与你对话。
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setCreating(true)}
          icon={<Plus size={16} />}
        >
          新建人物
        </Button>
      </div>

      {characters.length === 0 ? (
        <EmptyState
          icon={<UserRound size={26} />}
          title="还没有人物"
          description="可以手动创建一份人设，或者让 AI 帮你生成。生成后再慢慢调整。"
          action={
            <Button variant="primary" onClick={() => setCreating(true)} icon={<Plus size={16} />}>
              创建第一个人物
            </Button>
          }
        />
      ) : (
        <div className={s.grid}>
          {characters.map((c) => (
            <article key={c.id} className={s.card}>
              <header className={s.cardHead}>
                <Avatar name={c.name} avatar={c.avatar} size={48} />
                <div className={s.cardHeadText}>
                  <h3 className={s.cardName}>{c.name}</h3>
                  {c.tags?.length ? (
                    <div className={s.tags}>
                      {c.tags.slice(0, 3).map((t) => (
                        <span key={t} className={s.tag}>
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </header>
              <p className={s.preview}>
                {c.greeting || c.systemPrompt.slice(0, 80) || '（未填写人设）'}
              </p>
              <footer className={s.cardFoot}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(c)}
                  icon={<Pencil size={14} />}
                >
                  编辑
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(c)}
                  icon={<Trash2 size={14} />}
                >
                  删除
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => startChat(c)}
                  icon={<MessageCircle size={14} />}
                >
                  开始对话
                </Button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {creating ? (
        <CharacterEditor
          onClose={() => setCreating(false)}
          onSave={(c) => {
            dispatch({ type: 'add-character', payload: c })
            setCreating(false)
          }}
        />
      ) : null}

      {editing ? (
        <CharacterEditor
          character={editing}
          onClose={() => setEditing(null)}
          onSave={(c) => {
            dispatch({ type: 'update-character', payload: c })
            setEditing(null)
          }}
        />
      ) : null}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="删除人物"
        width={420}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              取消
            </Button>
            <Button variant="danger" onClick={() => confirmDelete && remove(confirmDelete)}>
              确认删除
            </Button>
          </>
        }
      >
        {confirmDelete ? (
          <p className={s.confirmText}>
            将删除 <strong>{confirmDelete.name}</strong> 及其所有对话记录。此操作不可撤销。
          </p>
        ) : null}
      </Modal>

      <div className={s.tip}>
        <Sparkles size={14} />
        <span>提示：在编辑弹窗里可以用 AI 一键生成人设和示例对话。</span>
      </div>

      <NewChatDialog
        key={quickChatId ?? 'new'}
        open={newOpen}
        onClose={() => {
          setNewOpen(false)
          setQuickChatId(null)
        }}
        defaultCharacterId={quickChatId ?? undefined}
      />
    </div>
  )
}
