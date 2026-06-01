import type { Character, Chat, Settings } from './types'
import { DEFAULT_SETTINGS } from './types'

const KEYS = {
  settings: 'minichat:settings',
  characters: 'minichat:characters',
  chats: 'minichat:chats',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    // quota exceeded or serialization error
    console.error('storage write failed', err)
  }
}

// settings
export function loadSettings(): Settings {
  const loaded = read<Partial<Settings> & { model?: string }>(KEYS.settings, {})
  // 迁移老的单 model 字段
  const legacyModel = loaded.model
  return {
    ...DEFAULT_SETTINGS,
    ...loaded,
    chatModel: loaded.chatModel ?? legacyModel ?? DEFAULT_SETTINGS.chatModel,
    generationModel:
      loaded.generationModel ?? legacyModel ?? DEFAULT_SETTINGS.generationModel,
  }
}
export function saveSettings(s: Settings): void {
  write(KEYS.settings, s)
}

// characters
export function loadCharacters(): Character[] {
  return read<Character[]>(KEYS.characters, [])
}
export function saveCharacters(list: Character[]): void {
  write(KEYS.characters, list)
}

// chats
export function loadChats(): Chat[] {
  return read<Chat[]>(KEYS.chats, [])
}
export function saveChats(list: Chat[]): void {
  write(KEYS.chats, list)
}

// utilities
export function uid(): string {
  return (
    Date.now().toString(36) +
    '-' +
    Math.random().toString(36).slice(2, 10)
  )
}
