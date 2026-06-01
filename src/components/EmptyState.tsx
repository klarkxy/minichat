import type { ReactNode } from 'react'
import s from './EmptyState.module.css'

interface Props {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className={s.wrap}>
      {icon ? <div className={s.icon}>{icon}</div> : null}
      <h3 className={s.title}>{title}</h3>
      {description ? <p className={s.desc}>{description}</p> : null}
      {action ? <div className={s.action}>{action}</div> : null}
    </div>
  )
}
