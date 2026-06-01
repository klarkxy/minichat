import type { TextareaHTMLAttributes } from 'react'
import { forwardRef, useState, useEffect } from 'react'
import s from './Textarea.module.css'

interface Props extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  monospace?: boolean
  showCount?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, hint, error, monospace, showCount, className, value, id, maxLength, ...rest },
  ref,
) {
  const inputId = id || rest.name
  const [count, setCount] = useState(0)
  useEffect(() => {
    setCount(typeof value === 'string' ? value.length : 0)
  }, [value])

  return (
    <div className={s.wrap}>
      {label ? (
        <div className={s.labelRow}>
          <label htmlFor={inputId} className={s.label}>
            {label}
          </label>
          {showCount ? (
            <span className={s.count}>
              {count}
              {maxLength ? ` / ${maxLength}` : ''}
            </span>
          ) : null}
        </div>
      ) : null}
      <textarea
        ref={ref}
        id={inputId}
        className={[
          s.textarea,
          monospace ? s.mono : '',
          error ? s.errored : '',
          className || '',
        ]
          .filter(Boolean)
          .join(' ')}
        value={value}
        maxLength={maxLength}
        {...rest}
      />
      {error ? (
        <p className={s.error}>{error}</p>
      ) : hint ? (
        <p className={s.hint}>{hint}</p>
      ) : null}
    </div>
  )
})

export default Textarea
