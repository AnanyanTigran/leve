'use client'

import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

// 5 lines × 21px (14px × 1.5 line-height) + 20px vertical padding
const MAX_HEIGHT_PX = 125

interface PromptTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  maxLength?: number
  hasError?: boolean
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>
  className?: string
}

export function PromptTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  maxLength = 200,
  hasError,
  onKeyDown,
  className,
}: PromptTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const count = value.length

  const adjust = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
  }, [])

  useEffect(() => {
    adjust()
  }, [value, adjust])

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    if (next.length > maxLength) return
    onChange(next)
  }

  const counterColor =
    count >= maxLength
      ? 'text-error'
      : count >= 160
        ? 'text-[#F59E0B]'
        : 'text-text-muted'

  return (
    <div className={cn('flex flex-col', className)}>
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        style={{ minHeight: '62px', maxHeight: `${MAX_HEIGHT_PX}px` }}
        className={cn(
          'w-full bg-bg-elevated border rounded-[10px] px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted leading-[1.5] resize-none overflow-y-auto transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-0',
          hasError
            ? 'border-error'
            : 'border-border-default hover:border-border-strong',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      />
      <p className={cn('text-right text-[11px] mt-1 select-none', counterColor)}>
        {count} / {maxLength}
      </p>
    </div>
  )
}
