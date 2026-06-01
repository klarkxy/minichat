import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import s from './Drawer.module.css'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  width?: number
  children: ReactNode
  footer?: ReactNode
}

export default function Drawer({
  open,
  onClose,
  title,
  width = 420,
  children,
  footer,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={s.backdrop} onMouseDown={(e) => {
      if (e.target === e.currentTarget) onClose()
    }}>
      <aside
        className={s.panel}
        style={{ width }}
        role="dialog"
        aria-modal
      >
        {title ? (
          <div className={s.header}>
            <h2 className={s.title}>{title}</h2>
            <button className={s.close} onClick={onClose} aria-label="关闭">
              <X size={18} />
            </button>
          </div>
        ) : null}
        <div className={s.body}>{children}</div>
        {footer ? <div className={s.footer}>{footer}</div> : null}
      </aside>
    </div>,
    document.body,
  )
}
