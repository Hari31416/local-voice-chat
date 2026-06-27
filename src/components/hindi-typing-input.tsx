import { useEffect, useRef } from "react"
import {
  clearTypingContextOnKeyDown,
  createTypingContext,
  handleTypingBeforeInputEvent,
} from "lipilekhika/typing"

interface HindiTypingInputProps {
  value: string
  onChange: (value: string) => void
  enabled: boolean
  disabled?: boolean
  placeholder?: string
  className?: string
}

export function HindiTypingInput({
  value,
  onChange,
  enabled,
  disabled,
  placeholder,
  className,
}: HindiTypingInputProps) {
  const typingContextRef = useRef<ReturnType<typeof createTypingContext> | null>(null)

  useEffect(() => {
    if (!enabled) {
      typingContextRef.current?.clearContext()
      typingContextRef.current = null
      return
    }

    const ctx = createTypingContext("Hindi", { includeInherentVowel: true })
    typingContextRef.current = ctx
    return () => {
      ctx.clearContext()
      typingContextRef.current = null
    }
  }, [enabled])

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBeforeInput={(event) => {
        const ctx = typingContextRef.current
        if (!ctx || !enabled) return
        void handleTypingBeforeInputEvent(ctx, event, onChange)
      }}
      onInput={(event) => {
        if (!enabled) return
        const native = event.nativeEvent as InputEvent
        if (native.inputType !== "insertText") {
          onChange(event.currentTarget.value)
          typingContextRef.current?.clearContext()
        }
      }}
      onKeyDown={(event) => {
        const ctx = typingContextRef.current
        if (!ctx || !enabled) return
        clearTypingContextOnKeyDown(event, ctx)
      }}
      onBlur={() => typingContextRef.current?.clearContext()}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
    />
  )
}
