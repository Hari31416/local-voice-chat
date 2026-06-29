import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LLMMetrics } from "@/lib/voice-agent-types"

function formatMessageTime(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp))
}

interface MessageMetaProps {
  content: string
  createdAt?: number
  align: "left" | "right"
  metrics?: LLMMetrics
}

function MessageMetrics({ metrics }: { metrics: LLMMetrics }) {
  const hasTokens = metrics.totalTokens !== undefined
  const hasTtft = metrics.timeToFirstTokenMs !== undefined
  const hasTps = metrics.tokensPerSecond !== undefined

  if (!hasTokens && !hasTtft && !hasTps) return null

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500/80 font-mono select-none">
      {hasTokens && <span>{metrics.totalTokens} tok</span>}
      {hasTokens && hasTtft && <span className="text-zinc-700/60 font-sans">·</span>}
      {hasTtft && <span>TTFT {Math.round(metrics.timeToFirstTokenMs!)} ms</span>}
      {hasTtft && hasTps && <span className="text-zinc-700/60 font-sans">·</span>}
      {hasTps && <span>{metrics.tokensPerSecond!.toFixed(1)} tok/s</span>}
    </span>
  )
}

export function MessageMeta({ content, createdAt, align, metrics }: MessageMetaProps) {
  const [copied, setCopied] = useState(false)
  const canCopy = content.trim().length > 0

  const handleCopy = async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore clipboard errors
    }
  }

  if (!createdAt && !canCopy && !metrics) return null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5 mt-1 px-0.5",
        align === "right" ? "justify-end" : "justify-start",
      )}
    >
      {createdAt != null && (
        <span className="text-[10px] text-zinc-500 tabular-nums select-none">
          {formatMessageTime(createdAt)}
        </span>
      )}
      {canCopy && (
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          title="Copy message"
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      )}
      {metrics && <MessageMetrics metrics={metrics} />}
    </div>
  )
}
