import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import s from './Modal.module.css'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  width?: number
  children: ReactNode
  footer?: ReactNode
  closeOnBackdrop?: boolean
}

export default function Modal({
  open,
  onClose,
  title,
  width = 520,
  children,
  footer,
  closeOnBackdrop = true,
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
    <div
      className={s.backdrop}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose()
      }}
    >
      <div className={s.dialog} style={{ maxWidth: width }} role="dialog" aria-modal>
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
      </div>
    </div>,
    document.body,
  )
}
