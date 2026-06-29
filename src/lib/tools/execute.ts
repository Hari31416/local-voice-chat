import { generateId } from 'ai'
import { getToolDefinition } from './registry'
import type { LLMToolCall, LLMToolResult, ToolExecutionContext } from './types'
import { TOOL_TIMEOUT_MS } from './types'
import { validateToolInput } from './validate'

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  abortSignal?: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (abortSignal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      reject(new Error(`Tool execution timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    abortSignal?.addEventListener('abort', onAbort, { once: true })

    promise.then(
      (value) => {
        clearTimeout(timer)
        abortSignal?.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        abortSignal?.removeEventListener('abort', onAbort)
        reject(error)
      },
    )
  })
}

export async function executeToolCall(
  call: LLMToolCall,
  context: ToolExecutionContext = {},
): Promise<LLMToolResult> {
  const tool = getToolDefinition(call.name)
  if (!tool) {
    return {
      callId: call.id,
      name: call.name,
      content: '',
      error: `Unknown tool: ${call.name}`,
    }
  }

  const validation = validateToolInput(call.arguments, tool.parameters)
  if (!validation.valid) {
    return {
      callId: call.id,
      name: call.name,
      content: '',
      error: validation.error,
    }
  }

  try {
    const result = await withTimeout(
      tool.execute(validation.value, context),
      TOOL_TIMEOUT_MS,
      context.abortSignal,
    )
    return {
      ...result,
      callId: call.id,
      name: call.name,
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    return {
      callId: call.id,
      name: call.name,
      content: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function executeToolCalls(
  calls: LLMToolCall[],
  context: ToolExecutionContext = {},
): Promise<LLMToolResult[]> {
  const results: LLMToolResult[] = []
  for (const call of calls) {
    if (context.abortSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError')
    }
    results.push(await executeToolCall(call, context))
  }
  return results
}

export function createToolCallId(): string {
  return generateId()
}
