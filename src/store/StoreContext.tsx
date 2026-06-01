import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react'
import type { Character, Chat, ChatMessage, Settings } from './types'
import {
  loadCharacters,
  loadChats,
  loadSettings,
  saveCharacters,
  saveChats,
  saveSettings,
} from './storage'

interface State {
  settings: Settings
  characters: Character[]
  chats: Chat[]
}

type Action =
  | { type: 'set-settings'; payload: Settings }
  | { type: 'add-character'; payload: Character }
  | { type: 'update-character'; payload: Character }
  | { type: 'delete-character'; payload: string }
  | { type: 'add-chat'; payload: Chat }
  | { type: 'update-chat'; payload: Chat }
  | { type: 'delete-chat'; payload: string }
  | { type: 'append-message'; chatId: string; message: ChatMessage }
  | {
      type: 'update-message'
      chatId: string
      messageId: string
      content: string
      patch?: Partial<ChatMessage>
    }
  | { type: 'clear-all' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'set-settings':
      return { ...state, settings: action.payload }
    case 'add-character':
      return { ...state, characters: [action.payload, ...state.characters] }
    case 'update-character':
      return {
        ...state,
        characters: state.characters.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      }
    case 'delete-character':
      return {
        ...state,
        characters: state.characters.filter((c) => c.id !== action.payload),
        chats: state.chats.filter((ch) => ch.characterId !== action.payload),
      }
    case 'add-chat':
      return { ...state, chats: [action.payload, ...state.chats] }
    case 'update-chat':
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.id === action.payload.id ? action.payload : c,
        ),
      }
    case 'delete-chat':
      return { ...state, chats: state.chats.filter((c) => c.id !== action.payload) }
    case 'append-message': {
      const chat = state.chats.find((c) => c.id === action.chatId)
      if (!chat) return state
      const updated: Chat = {
        ...chat,
        messages: [...chat.messages, action.message],
        updatedAt: Date.now(),
      }
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === chat.id ? updated : c)),
      }
    }
    case 'update-message': {
      const chat = state.chats.find((c) => c.id === action.chatId)
      if (!chat) return state
      const updated: Chat = {
        ...chat,
        messages: chat.messages.map((m) =>
          m.id === action.messageId
            ? { ...m, ...action.patch, content: action.content }
            : m,
        ),
        updatedAt: Date.now(),
      }
      return {
        ...state,
        chats: state.chats.map((c) => (c.id === chat.id ? updated : c)),
      }
    }
    case 'clear-all':
      return {
        settings: state.settings,
        characters: [],
        chats: [],
      }
    default:
      return state
  }
}

function init(): State {
  return {
    settings: loadSettings(),
    characters: loadCharacters(),
    chats: loadChats(),
  }
}

interface StoreContextValue {
  state: State
  dispatch: Dispatch<Action>
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  // persist on change
  useEffect(() => {
    saveSettings(state.settings)
  }, [state.settings])
  useEffect(() => {
    saveCharacters(state.characters)
  }, [state.characters])
  useEffect(() => {
    saveChats(state.chats)
  }, [state.chats])

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
