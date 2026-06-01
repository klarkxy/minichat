export type Endpoint = 'global' | 'cn'

export interface Settings {
  endpoint: Endpoint
  apiKey: string
  /** 模型用于 AI 生成人设、AI 生成示例（用户可改） */
  generationModel: string
  temperature: number
  maxTokens: number
  configured: boolean
}

/** 对话模型：固定 M2-her，运行时不可改 */
export const CHAT_MODEL = 'M2-her'

export interface Sample {
  user: string
  ai: string
}

/** 角色类型
 * - 'character': AI 扮演的角色（注入到 system + samples）
 * - 'user': 用户的"我是谁"人设（注入到 user_system） */
export type CharacterRole = 'character' | 'user'

export interface Character {
  id: string
  name: string
  avatar: string // emoji or URL
  systemPrompt: string
  /** few-shot 范例，每条是一对 user/ai。character 类型才有意义 */
  samples: Sample[]
  /** 首次对话开场白（角色主动说的话） */
  greeting: string
  tags: string[]
  /** 角色类型：默认 'character'（AI 角色）；'user' 表示"我自己" */
  role: CharacterRole
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
  /** AI 角色 id（注入 system + samples） */
  characterId: string
  /** 用户人设角色 id（注入 user_system），可选 */
  userCharacterId?: string
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
  generationModel: 'MiniMax-M3',
  temperature: 0.8,
  maxTokens: 2048,
  configured: false,
}
