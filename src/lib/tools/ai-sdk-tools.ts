import { jsonSchema, tool } from 'ai'
import { getRegisteredTools } from './registry'

export function buildAiSdkToolSet() {
  const tools: Record<string, ReturnType<typeof tool>> = {}

  for (const definition of getRegisteredTools()) {
    tools[definition.name] = tool({
      description: definition.description,
      inputSchema: jsonSchema(definition.parameters),
    })
  }

  return tools
}
