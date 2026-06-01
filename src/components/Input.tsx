import type { InputHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import s from './Input.module.css'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, className, id, ...rest },
  ref,
) {
  const inputId = id || rest.name
  return (
    <div className={s.wrap}>
      {label ? (
        <label htmlFor={inputId} className={s.label}>
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={[s.input, error ? s.errored : '', className || '']
          .filter(Boolean)
          .join(' ')}
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

export default Input
