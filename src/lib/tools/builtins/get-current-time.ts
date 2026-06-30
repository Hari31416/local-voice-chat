import type { LLMToolDefinition, LLMToolResult, ToolExecutionContext } from '../types'

async function executeGetCurrentTime(
  input: unknown,
  _context: ToolExecutionContext,
): Promise<LLMToolResult> {
  const args = input as { timezone?: string }
  const timezone = args.timezone?.trim() || 'Asia/Kolkata'

  try {
    const now = new Date()
    const content = now.toLocaleString('en-US', {
      timeZone: timezone,
      dateStyle: 'full',
      timeStyle: 'long',
    })

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
  promptGuidance: {
    useWhen: [
      'The user asks what time it is, the current time, or the date/today.',
      'The user asks for the time in a city, country, or timezone.',
      'The user asks what day it is or what the date is.',
    ],
    examples: [
      { user: 'what time is it?', toolCall: { name: 'get_current_time', arguments: {} } },
      {
        user: 'what time is it in Tokyo?',
        toolCall: { name: 'get_current_time', arguments: { timezone: 'Asia/Tokyo' } },
      },
    ],
  },
  parameters: {
    type: 'object',
    properties: {
      timezone: {
        type: 'string',
        description: 'Optional IANA timezone such as America/New_York or Asia/Kolkata. Defaults to Asia/Kolkata (IST).',
      },
    },
    additionalProperties: false,
  },
  execute: executeGetCurrentTime,
}
