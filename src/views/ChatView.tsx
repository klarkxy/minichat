import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Plus,
  Search,
  Send,
  Square,
  Trash2,
  Settings2,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import EmptyState from '../components/EmptyState'
import NewChatDialog from './NewChatDialog'
import { useStore } from '../store/StoreContext'
import { chatStream } from '../api/minimax'
import { uid } from '../store/storage'
import type { Chat, ChatMessage } from '../store/types'
import s from './ChatView.module.css'

function fmtTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0')
  }
  const sameYear = d.getFullYear() === now.getFullYear()
  if (sameYear) {
    return (d.getMonth() + 1) + '/' + d.getDate()
  }
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate()
}

function lastPreview(messages: ChatMessage[]): string {
  const last = messages[messages.length - 1]
  if (!last) return '（无消息）'
  return last.content.slice(0, 32) || '（空）'
}

export default function ChatView() {
  const { id } = useParams<{ id?: string }>()
  const { state } = useStore()
  const nav = useNavigate()

  const chats = state.chats
  const currentChat = useMemo(
    () => (id ? chats.find((c) => c.id === id) : null) ?? null,
    [chats, id],
  )

  const [search, setSearch] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [showParams, setShowParams] = useState(false)

  const filteredChats = chats.filter((c) => {
    if (!search) return true
    const ch = state.characters.find((cc) => cc.id === c.characterId)
    const q = search.toLowerCase()
    return (
      c.title.toLowerCase().includes(q) ||
      (ch?.name.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <div className={[s.shell, currentChat ? s.hasActive : ''].join(' ')}>
      <aside className={s.sidebar}>
        <div className={s.sideHead}>
          <h2 className={s.sideTitle}>对话</h2>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setNewOpen(true)}
            icon={<Plus size={14} />}
          >
            新建
          </Button>
        </div>
        <div className={s.searchBox}>
          <Search size={14} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="搜索对话"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filteredChats.length === 0 ? (
          <div className={s.sideEmpty}>
            {chats.length === 0
              ? '还没有对话，点上方"新建"开始。'
              : '没有匹配的对话。'}
          </div>
        ) : (
          <ul className={s.chatList}>
            {filteredChats.map((c) => {
              const ch = state.characters.find((cc) => cc.id === c.characterId)
              return (
                <li key={c.id}>
                  <button
                    className={[
                      s.chatItem,
                      c.id === id ? s.chatItemActive : '',
                    ].join(' ')}
                    onClick={() => nav('/chat/' + c.id)}
                  >
                    <Avatar
                      name={ch?.name || '?'}
                      avatar={ch?.avatar}
                      size={40}
                    />
                    <div className={s.chatItemText}>
                      <div className={s.chatItemTop}>
                        <span className={s.chatItemName}>
                          {ch?.name || '已删除角色'}
                        </span>
                        <span className={s.chatItemTime}>
                          {fmtTime(c.updatedAt)}
                        </span>
                      </div>
                      <div className={s.chatItemPreview}>
                        {lastPreview(c.messages)}
                      </div>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </aside>

      <section className={s.detail}>
        {currentChat ? (
          <ChatDetail
            chat={currentChat}
            showParams={showParams}
            setShowParams={setShowParams}
            onBack={() => nav('/chat')}
          />
        ) : (
          <div className={s.detailEmpty}>
            <EmptyState
              icon={<Plus size={26} />}
              title="选一个对话，或新建一个"
              description="从左侧列表选择，或点击下方按钮开始。"
              action={
                <Button
                  variant="primary"
                  onClick={() => setNewOpen(true)}
                  icon={<Plus size={14} />}
                >
                  新建对话
                </Button>
              }
            />
          </div>
        )}
      </section>

      <NewChatDialog open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  )
}

interface DetailProps {
  chat: Chat
  showParams: boolean
  setShowParams: (v: boolean) => void
  onBack: () => void
}

function ChatDetail({ chat, showParams, setShowParams, onBack }: DetailProps) {
  const { state, dispatch } = useStore()
  const settings = state.settings
  const character = state.characters.find((c) => c.id === chat.characterId)
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const stickBottomRef = useRef(true)
  // accumulator for streaming content; updated synchronously, never read from stale state
  const accumRef = useRef<Record<string, string>>({})

  // 滚动到底
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
      stickBottomRef.current = atBottom
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [chat.id])

  useEffect(() => {
    if (!stickBottomRef.current) return
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [chat.messages, chat.id])

  // 清理
  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  // 进入新对话时如果角色有 greeting，自动作为首条消息
  useEffect(() => {
    if (chat.messages.length === 0 && character?.greeting && !streaming) {
      const greetMsg: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: character.greeting,
        timestamp: Date.now(),
      }
      dispatch({ type: 'append-message', chatId: chat.id, message: greetMsg })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.id])

  const buildSystemPrompt = (): string => {
    const parts: string[] = []
    if (character?.systemPrompt) parts.push(character.systemPrompt)
    if (chat.scenario) {
      parts.push('【当前场景】\n' + chat.scenario)
    }
    if (!parts.length) return '你是一个友好的对话伙伴。'
    return parts.join('\n\n')
  }

  const canSend = !!character && !streaming && draft.trim().length > 0

  const runStream = async (text: string, aiMsgId: string) => {
    accumRef.current[aiMsgId] = ''
    stickBottomRef.current = true

    const ctrl = new AbortController()
    abortRef.current = ctrl
    setStreaming(true)

    try {
      await chatStream(
        {
          endpoint: settings.endpoint,
          apiKey: settings.apiKey,
          model: settings.chatModel,
          systemPrompt: buildSystemPrompt(),
          history: chat.messages,
          userMessage: text,
          temperature: chat.temperature,
          maxTokens: settings.maxTokens,
          signal: ctrl.signal,
        },
        (delta) => {
          accumRef.current[aiMsgId] = (accumRef.current[aiMsgId] ?? '') + delta
          dispatch({
            type: 'update-message',
            chatId: chat.id,
            messageId: aiMsgId,
            content: accumRef.current[aiMsgId],
            patch: { streaming: true },
          })
        },
      )
      dispatch({
        type: 'update-message',
        chatId: chat.id,
        messageId: aiMsgId,
        content: accumRef.current[aiMsgId] ?? '',
        patch: { streaming: false },
      })
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        dispatch({
          type: 'update-message',
          chatId: chat.id,
          messageId: aiMsgId,
          content: (accumRef.current[aiMsgId] ?? '') + '\n\n[已停止生成]',
          patch: { streaming: false },
        })
      } else {
        setSendError((e as Error).message)
        dispatch({
          type: 'update-message',
          chatId: chat.id,
          messageId: aiMsgId,
          content: accumRef.current[aiMsgId] ?? '',
          patch: { streaming: false, error: true },
        })
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const send = async () => {
    if (!canSend) return
    const text = draft.trim()
    setDraft('')
    setSendError(null)

    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    const aiMsgId = uid()
    dispatch({ type: 'append-message', chatId: chat.id, message: userMsg })
    dispatch({
      type: 'append-message',
      chatId: chat.id,
      message: {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        streaming: true,
      },
    })

    await runStream(text, aiMsgId)
  }

  const stop = () => {
    abortRef.current?.abort()
  }

  const retry = (msg: ChatMessage) => {
    if (!character) return
    // find the user message right before the failed assistant one
    const idx = chat.messages.findIndex((m) => m.id === msg.id)
    const userMsg = chat.messages[idx - 1]
    if (!userMsg || userMsg.role !== 'user') return
    // remove the failed assistant message, keep the user message
    dispatch({
      type: 'update-chat',
      payload: {
        ...chat,
        messages: chat.messages.filter((m) => m.id !== msg.id),
      },
    })
    // schedule stream for the same user content
    setTimeout(() => {
      sendWithMessage(userMsg.content)
    }, 0)
  }

  const sendWithMessage = (text: string) => {
    if (!text.trim() || !character) return
    setSendError(null)
    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }
    const aiMsgId = uid()
    dispatch({ type: 'append-message', chatId: chat.id, message: userMsg })
    dispatch({
      type: 'append-message',
      chatId: chat.id,
      message: {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        streaming: true,
      },
    })
    return runStream(text, aiMsgId)
  }

  const deleteChat = () => {
    if (!confirm('确定要删除这个对话吗？')) return
    dispatch({ type: 'delete-chat', payload: chat.id })
    onBack()
  }

  if (!character) {
    return (
      <div className={s.detailEmpty}>
        <EmptyState
          title="角色已被删除"
          description="回到对话列表选择其他对话。"
          action={
            <Button variant="primary" onClick={onBack}>
              返回
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className={s.detailInner}>
      <header className={s.detailHead}>
        <button className={s.backBtn} onClick={onBack} aria-label="返回">
          <ArrowLeft size={18} />
        </button>
        <Avatar name={character.name} avatar={character.avatar} size={36} />
        <div className={s.headInfo}>
          <h2 className={s.headName}>{character.name}</h2>
          {chat.scenario ? (
            <p className={s.headScenario} title={chat.scenario}>
              {chat.scenario}
            </p>
          ) : (
            <p className={s.headScenario}>无场景设定</p>
          )}
        </div>
        <div className={s.headActions}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParams(!showParams)}
            icon={<Settings2 size={14} />}
          >
            {showParams ? '收起' : '参数'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteChat}
            icon={<Trash2 size={14} />}
          >
            删除
          </Button>
        </div>
      </header>

      {showParams ? (
        <div className={s.paramsBar}>
          <div className={s.paramItem}>
            <span className={s.paramLabel}>Temperature</span>
            <input
              type="range"
              min={0}
              max={1.5}
              step={0.05}
              value={chat.temperature}
              onChange={(e) => {
                const t = parseFloat(e.target.value)
                dispatch({
                  type: 'update-chat',
                  payload: { ...chat, temperature: t },
                })
              }}
              className={s.paramSlider}
            />
            <span className={s.paramVal}>{chat.temperature.toFixed(2)}</span>
          </div>
          <div className={s.paramItem}>
            <span className={s.paramLabel}>对话模型</span>
            <span className={s.paramVal}>{settings.chatModel}</span>
          </div>
          <div className={s.paramItem}>
            <span className={s.paramLabel}>消息数</span>
            <span className={s.paramVal}>{chat.messages.length}</span>
          </div>
        </div>
      ) : null}

      <div className={s.scroller} ref={scrollerRef}>
        {chat.messages.length === 0 ? (
          <div className={s.chatEmpty}>
            <Avatar name={character.name} avatar={character.avatar} size={64} />
            <p>开始和 {character.name} 聊点什么吧。</p>
          </div>
        ) : (
          <ul className={s.messageList}>
            {chat.messages.map((m) => (
              <MessageItem
                key={m.id}
                message={m}
                characterName={character.name}
                characterAvatar={character.avatar}
                onRetry={retry}
              />
            ))}
          </ul>
        )}
      </div>

      {sendError ? (
        <div className={s.errorBar}>
          <AlertCircle size={14} />
          <span>{sendError}</span>
        </div>
      ) : null}

      <div className={s.composer}>
        <textarea
          className={s.composerInput}
          placeholder={
            streaming
              ? '正在生成回复…'
              : '输入消息，回车发送，Shift+回车换行'
          }
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              if (canSend) send()
            }
          }}
          rows={1}
          disabled={streaming}
        />
        {streaming ? (
          <Button
            variant="danger"
            onClick={stop}
            icon={<Square size={14} />}
            title="停止生成"
          >
            停止
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={send}
            disabled={!canSend}
            icon={<Send size={14} />}
            title="发送 (Enter)"
          >
            发送
          </Button>
        )}
      </div>
    </div>
  )
}

function MessageItem({
  message,
  characterName,
  characterAvatar,
  onRetry,
}: {
  message: ChatMessage
  characterName: string
  characterAvatar?: string
  onRetry: (m: ChatMessage) => void
}) {
  const isUser = message.role === 'user'
  return (
    <li
      className={[
        s.msgRow,
        isUser ? s.msgRowUser : s.msgRowAssistant,
        message.error ? s.msgError : '',
      ].join(' ')}
    >
      {!isUser ? (
        <Avatar
          name={characterName}
          avatar={characterAvatar}
          size={36}
        />
      ) : null}
      <div className={s.bubbleWrap}>
        <div className={[s.bubble, isUser ? s.bubbleUser : s.bubbleAssistant].join(' ')}>
          {message.content}
          {message.streaming ? <span className={s.cursor}>▍</span> : null}
        </div>
        <div className={s.metaRow}>
          <span className={s.metaTime}>{fmtTime(message.timestamp)}</span>
          {message.error ? (
            <button className={s.metaAction} onClick={() => onRetry(message)}>
              <RefreshCw size={11} />
              重试
            </button>
          ) : null}
        </div>
      </div>
      {isUser ? <div className={s.userAvatarPlaceholder} /> : null}
    </li>
  )
}