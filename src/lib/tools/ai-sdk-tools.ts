import { jsonSchema, tool } from 'ai'
import { buildToolDescriptionForSdk, getRegisteredTools } from './registry'

/** AI SDK tool set for @browser-ai/* providers (matches reference `createTools` pattern). */
export function createTools() {
  const tools: Record<string, ReturnType<typeof tool>> = {}

  for (const definition of getRegisteredTools()) {
    tools[definition.name] = tool({
      description: buildToolDescriptionForSdk(definition),
      inputSchema: jsonSchema(definition.parameters),
    })
  }

  return tools
}

/** @deprecated Use `createTools` instead. */
export const buildAiSdkToolSet = createTools
