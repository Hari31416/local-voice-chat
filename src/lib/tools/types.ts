export type JSONSchema = {
  type: string
  properties?: Record<string, JSONSchemaProperty>
  required?: string[]
  additionalProperties?: boolean
}

export type JSONSchemaProperty = {
  type: string
  description?: string
  enum?: string[]
}

export interface ToolExecutionContext {
  abortSignal?: AbortSignal
}

export interface LLMToolDefinition {
  name: string
  description: string
  parameters: JSONSchema
  promptGuidance?: {
    useWhen: string[]
    examples?: Array<{ user: string; toolCall: Record<string, unknown> }>
  }
  execute(input: unknown, context: ToolExecutionContext): Promise<LLMToolResult>
}

export interface LLMToolCall {
  id: string
  name: string
  arguments: unknown
}

export interface LLMToolResult {
  callId: string
  name: string
  content: string
  error?: string
}

export const MAX_TOOL_ROUNDS = 3
export const MAX_TOOL_CALLS_PER_ROUND = 4
export const TOOL_TIMEOUT_MS = 5000
