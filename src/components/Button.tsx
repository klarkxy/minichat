import type { ButtonHTMLAttributes, ReactNode } from 'react'
import s from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  block?: boolean
  loading?: boolean
  icon?: ReactNode
  iconRight?: ReactNode
}

export default function Button({
  variant = 'secondary',
  size = 'md',
  block,
  loading,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...rest
}: Props) {
  const cls = [
    s.btn,
    s[variant],
    s[size],
    block ? s.block : '',
    loading ? s.loading : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {icon ? <span className={s.icon}>{icon}</span> : null}
      <span>{children}</span>
      {iconRight ? <span className={s.icon}>{iconRight}</span> : null}
    </button>
  )
}
