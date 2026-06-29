import { Calculator, Clock, AlertTriangle } from 'lucide-react'
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

interface ToolActivityProps {
  toolCalls?: LLMToolCall[]
  toolResults?: LLMToolResult[]
  isActive?: boolean
}

export function ToolActivity({ toolCalls = [], toolResults = [], isActive }: ToolActivityProps) {
  if (toolCalls.length === 0 && toolResults.length === 0) return null

  const resultByCallId = new Map(toolResults.map((result) => [result.callId, result]))

  return (
    <div className="flex flex-col gap-1 mb-2 w-full">
      {toolCalls.map((call) => {
        const result = resultByCallId.get(call.id)
        const failed = Boolean(result?.error)
        const pending = !result && isActive

        return (
          <div
            key={call.id}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium',
              failed
                ? 'border-amber-900/60 bg-amber-950/30 text-amber-300'
                : 'border-zinc-800 bg-zinc-900/50 text-zinc-400',
              pending && 'animate-pulse',
            )}
          >
            {failed ? (
              <AlertTriangle className="h-3 w-3 shrink-0" />
            ) : (
              <ToolIcon name={call.name} />
            )}
            <span>
              {failed ? 'Failed' : 'Used'} {getToolLabel(call.name)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
