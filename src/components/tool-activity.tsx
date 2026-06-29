import { useState } from 'react'
import { Calculator, ChevronDown, ChevronUp, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LLMToolCall, LLMToolResult } from '@/lib/tools/types'

const TOOL_LABELS: Record<string, string> = {
  calculator: 'Calculator',
  get_current_time: 'Current time',
}

function getToolLabel(name: string): string {
  return TOOL_LABELS[name] ?? name.replace(/_/g, ' ')
}

function ToolIcon({ name }: { name: string }) {
  if (name === 'calculator') return <Calculator className="h-3 w-3" />
  if (name === 'get_current_time') return <Clock className="h-3 w-3" />
  return null
}

function formatToolPayload(value: unknown): string {
  if (value === undefined || value === null) return '—'
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  return JSON.stringify(value, null, 2)
}

interface ToolCallRowProps {
  call: LLMToolCall
  result?: LLMToolResult
  pending?: boolean
}

function ToolCallRow({ call, result, pending }: ToolCallRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const failed = Boolean(result?.error)

  return (
    <div
      className={cn(
        'w-full rounded-lg border overflow-hidden text-[11px]',
        failed
          ? 'border-amber-900/60 bg-amber-950/20'
          : 'border-zinc-800 bg-zinc-900/50',
        pending && 'animate-pulse',
      )}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((open) => !open)}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <span className="inline-flex items-center gap-1.5 font-medium min-w-0">
          {failed ? (
            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-400" />
          ) : (
            <ToolIcon name={call.name} />
          )}
          <span className="truncate">
            {failed ? 'Failed' : pending ? 'Calling' : 'Used'} {getToolLabel(call.name)}
          </span>
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3 w-3 shrink-0 text-zinc-500" />
        ) : (
          <ChevronDown className="h-3 w-3 shrink-0 text-zinc-500" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-zinc-800/80 px-2.5 py-2 space-y-2 bg-zinc-950/30 font-mono text-[10px] leading-relaxed">
          <div>
            <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
              Input
            </p>
            <pre className="whitespace-pre-wrap break-all text-zinc-300">
              {formatToolPayload(call.arguments)}
            </pre>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider font-semibold text-zinc-500 mb-1">
              Output
            </p>
            {pending ? (
              <p className="text-zinc-500 italic">Waiting for result…</p>
            ) : failed ? (
              <pre className="whitespace-pre-wrap break-all text-amber-300">
                {result?.error}
              </pre>
            ) : (
              <pre className="whitespace-pre-wrap break-all text-zinc-300">
                {result?.content ?? '—'}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface ToolActivityProps {
  toolCalls?: LLMToolCall[]
  toolResults?: LLMToolResult[]
  isActive?: boolean
}

export function ToolActivity({ toolCalls = [], toolResults = [], isActive }: ToolActivityProps) {
  if (toolCalls.length === 0 && toolResults.length === 0) return null

  const resultByCallId = new Map(toolResults.map((result) => [result.callId, result]))

  return (
    <div className="flex flex-col gap-1.5 mb-2 w-full">
      {toolCalls.map((call) => {
        const result = resultByCallId.get(call.id)
        const pending = !result && isActive

        return (
          <ToolCallRow
            key={call.id}
            call={call}
            result={result}
            pending={pending}
          />
        )
      })}
    </div>
  )
}
