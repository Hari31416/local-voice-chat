import { jsonSchema, tool } from 'ai'
import { buildToolDescriptionForSdk, getRegisteredTools } from './registry'

export function buildAiSdkToolSet() {
  const tools: Record<string, ReturnType<typeof tool>> = {}

  for (const definition of getRegisteredTools()) {
    tools[definition.name] = tool({
      description: buildToolDescriptionForSdk(definition),
      inputSchema: jsonSchema(definition.parameters),
    })
  }

  return tools
}
