import s from './Avatar.module.css'

interface Props {
  name: string
  avatar?: string
  size?: number
}

/** Decide if a string is an emoji-only / image URL. */
function pickDisplay(avatar: string | undefined, name: string): {
  kind: 'emoji' | 'image' | 'initial'
  value: string
} {
  if (avatar) {
    // crude URL check
    if (/^(https?:\/\/|data:)/.test(avatar)) {
      return { kind: 'image', value: avatar }
    }
    // single emoji or short symbol
    if (avatar.length <= 4) {
      return { kind: 'emoji', value: avatar }
    }
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  return { kind: 'initial', value: initial || '?' }
}

/** Stable hue from a string. */
function hueFromName(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360
  }
  return h
}

export default function Avatar({ name, avatar, size = 40 }: Props) {
  const display = pickDisplay(avatar, name)
  const dim = `${size}px`
  const fontSize = Math.round(size * 0.45)

  if (display.kind === 'image') {
    return (
      <img
        className={s.img}
        src={display.value}
        alt={name}
        style={{ width: dim, height: dim, fontSize }}
      />
    )
  }

  if (display.kind === 'emoji') {
    return (
      <span
        className={[s.base, s.emoji].join(' ')}
        style={{ width: dim, height: dim, fontSize: Math.round(size * 0.55) }}
        aria-label={name}
      >
        {display.value}
      </span>
    )
  }

  const h = hueFromName(name || '?')
  return (
    <span
      className={[s.base, s.initial].join(' ')}
      style={{
        width: dim,
        height: dim,
        fontSize,
        background: `hsl(${h} 60% 88%)`,
        color: `hsl(${h} 50% 32%)`,
      }}
      aria-label={name}
    >
      {display.value}
    </span>
  )
}
