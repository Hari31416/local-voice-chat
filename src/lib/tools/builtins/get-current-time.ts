import type { LLMToolDefinition, LLMToolResult, ToolExecutionContext } from '../types'

async function executeGetCurrentTime(
  input: unknown,
  _context: ToolExecutionContext,
): Promise<LLMToolResult> {
  const args = input as { timezone?: string }
  const timezone = args.timezone?.trim()

  try {
    const now = new Date()
    let content: string

    if (timezone) {
      content = now.toLocaleString('en-US', {
        timeZone: timezone,
        dateStyle: 'full',
        timeStyle: 'long',
      })
    } else {
      content = now.toISOString()
    }

    return {
      callId: '',
      name: 'get_current_time',
      content,
    }
  } catch (error) {
    return {
      callId: '',
      name: 'get_current_time',
      content: '',
      error: error instanceof Error ? error.message : 'Failed to format time',
    }
  }
}

export const getCurrentTimeTool: LLMToolDefinition = {
  name: 'get_current_time',
  description: 'Get the current date and time, optionally in a specific IANA timezone.',
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Optional IANA timezone such as America/New_York or Asia/Kolkata',
      },
    },
    additionalProperties: false,
  },
  execute: executeGetCurrentTime,
}
