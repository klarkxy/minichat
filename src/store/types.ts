export type Endpoint = 'global' | 'cn'

export interface Settings {
  endpoint: Endpoint
  apiKey: string
  model: string
  temperature: number
  maxTokens: number
  configured: boolean
}

export interface Character {
  id: string
  name: string
  avatar: string // emoji or URL
  systemPrompt: string
  greeting: string
  tags: string[]
  createdAt: number
  updatedAt: number
}

export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  /** local-only flag: this message is currently streaming */
  streaming?: boolean
  /** local-only flag: this message failed and can be retried */
  error?: boolean
}

export interface Chat {
  id: string
  characterId: string
  title: string
  scenario: string
  temperature: number
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export const DEFAULT_SETTINGS: Settings = {
  endpoint: 'global',
  apiKey: '',
  model: 'MiniMax-M3',
  temperature: 0.8,
  maxTokens: 2048,
  configured: false,
}
