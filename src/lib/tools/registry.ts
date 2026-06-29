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

function formatToolCallExample(toolCall: Record<string, unknown>): string {
  return `\`\`\`tool_call
${JSON.stringify(toolCall)}
\`\`\``
}

function formatToolGuidance(tool: LLMToolDefinition): string {
  const lines = [`### ${tool.name}`, tool.description]

  if (tool.promptGuidance?.useWhen.length) {
    lines.push('', 'Use this tool when:')
    for (const trigger of tool.promptGuidance.useWhen) {
      lines.push(`- ${trigger}`)
    }
  }

  if (tool.promptGuidance?.examples?.length) {
    lines.push('', 'Examples:')
    for (const example of tool.promptGuidance.examples) {
      lines.push(`- User: "${example.user}"`)
      lines.push('  You output:')
      lines.push(formatToolCallExample(example.toolCall))
    }
  }

  lines.push(
    '',
    'Parameters:',
    '```json',
    JSON.stringify(tool.parameters, null, 2),
    '```',
  )

  return lines.join('\n')
}

/** Short rules placed at the top of the system prompt when tools are enabled. */
export function buildToolPromptPrefix(): string {
  const toolNames = getRegisteredTools().map((tool) => tool.name).join(', ')

  return `TOOLS (critical): You have working local tools (${toolNames}) in this session.
- If a tool can answer the question, you MUST call it. Do not guess or invent values.
- Never say you lack real-time access, a clock, or the ability to calculate — use the tools instead.
- Call exactly one tool at a time, then wait for the tool result before answering the user.`
}

/**
 * Prompt-based tool instructions for engines without native tool APIs
 * (transformers-js, gemma4-kernel, lfm2-kernel).
 * Format matches @browser-ai/* providers (```tool_call fences).
 * WebLLM injects equivalent text automatically when tools are passed to the SDK.
 */
export function buildToolPromptSection(): string {
  const toolGuidance = getRegisteredTools().map(formatToolGuidance).join('\n\n')

  return `# Tool workflow
1. Read the user message and decide whether a tool applies.
2. If yes, output a \`\`\`tool_call fence with valid JSON (see format below).
3. Do not answer from memory for time or math questions — always call the tool first.
4. After the tool result arrives in a \`\`\`tool_result fence, use it to answer briefly.

# Available tools
${toolGuidance}

# Tool call format
Output JSON inside a \`\`\`tool_call code fence:

\`\`\`tool_call
{"name": "tool_name", "arguments": {"param": "value"}}
\`\`\`

If you use thinking/reasoning tags, finish thinking first, then output the tool_call fence before any user-facing answer.

# Forbidden responses when a tool applies
- Do NOT say you are "just an AI" without real-time data.
- Do NOT ask the user for their timezone when they only asked "what time is it?" — call get_current_time with no arguments.
- Do NOT compute arithmetic in text when calculator should be used.

Tool responses arrive in \`\`\`tool_result fences. Use the result to answer the user — do not call the tool again.`
}

export function buildToolDescriptionForSdk(tool: LLMToolDefinition): string {
  const triggers = tool.promptGuidance?.useWhen
  if (!triggers?.length) return tool.description
  return `${tool.description} Use when: ${triggers.join('; ')}`
}
