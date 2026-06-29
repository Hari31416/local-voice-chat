import { calculatorTool } from './builtins/calculator'
import { getCurrentTimeTool } from './builtins/get-current-time'
import type { LLMToolDefinition } from './types'

export const TOOL_REGISTRY: Record<string, LLMToolDefinition> = {
  [getCurrentTimeTool.name]: getCurrentTimeTool,
  [calculatorTool.name]: calculatorTool,
}

export function getRegisteredTools(): LLMToolDefinition[] {
  return Object.values(TOOL_REGISTRY)
}

export function getToolDefinition(name: string): LLMToolDefinition | undefined {
  return TOOL_REGISTRY[name]
}

export function isRegisteredTool(name: string): boolean {
  return name in TOOL_REGISTRY
}

/**
 * Prompt-based tool instructions for engines without native tool APIs
 * (transformers-js, gemma4-kernel, lfm2-kernel).
 * Format matches @browser-ai/* providers (```tool_call fences).
 * WebLLM injects equivalent text automatically when tools are passed to the SDK.
 */
export function buildToolPromptSection(): string {
  const toolSchemas = getRegisteredTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }))

  return `You have access to local tools. Only request one tool call at a time.

# Available Tools
${JSON.stringify(toolSchemas, null, 2)}

When a tool can answer the question, you MUST call it in your answer (after any thinking). Do not guess or invent values (for example, never make up the current time).

To call a tool, output JSON inside a \`\`\`tool_call code fence:

\`\`\`tool_call
{"name": "tool_name", "arguments": {"param": "value"}}
\`\`\`

Tool responses arrive in \`\`\`tool_result fences. Use the result to answer the user — do not call the tool again.`
}
