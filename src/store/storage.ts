import type { Character, Chat, Settings, Sample } from './types'
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
  const loaded = read<Partial<Settings> & { model?: string; chatModel?: string }>(
    KEYS.settings,
    {},
  )
  // 兼容老数据：把老的 model 字段映射到 generationModel
  // chatModel 字段已废弃（现在用 CHAT_MODEL 常量），迁移时直接忽略
  const legacyModel = loaded.model
  return {
    ...DEFAULT_SETTINGS,
    ...loaded,
    generationModel:
      loaded.generationModel ?? legacyModel ?? DEFAULT_SETTINGS.generationModel,
  }
}
export function saveSettings(s: Settings): void {
  write(KEYS.settings, s)
}

// characters: 迁移老数据
function migrateCharacter(raw: Character): Character {
  // 兼容老字段：role 字段已废弃，直接丢弃
  const legacy = raw as Character & { samples?: Sample[]; role?: unknown }
  const samples = Array.isArray(legacy.samples) ? legacy.samples : []
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { role: _dropped, ...rest } = legacy
  return { ...rest, samples }
}

// characters
export function loadCharacters(): Character[] {
  return read<Character[]>(KEYS.characters, []).map(migrateCharacter)
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
