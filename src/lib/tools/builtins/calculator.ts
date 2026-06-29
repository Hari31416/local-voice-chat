import type { LLMToolDefinition, LLMToolResult, ToolExecutionContext } from '../types'

function evaluateExpression(expression: string): number {
  const tokens = tokenize(expression)
  let pos = 0

  function parseExpression(): number {
    let value = parseTerm()
    while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
      const op = tokens[pos++]
      const right = parseTerm()
      value = op === '+' ? value + right : value - right
    }
    return value
  }

  function parseTerm(): number {
    let value = parseFactor()
    while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/' || tokens[pos] === '%')) {
      const op = tokens[pos++]
      const right = parseFactor()
      if (op === '*') value *= right
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero')
        value /= right
      } else {
        if (right === 0) throw new Error('Modulo by zero')
        value %= right
      }
    }
    return value
  }

  function parseFactor(): number {
    if (tokens[pos] === '(') {
      pos++
      const value = parseExpression()
      if (tokens[pos] !== ')') throw new Error('Unmatched parenthesis')
      pos++
      return value
    }
    if (tokens[pos] === '-') {
      pos++
      return -parseFactor()
    }
    const token = tokens[pos++]
    if (!token || !/^-?\d+(\.\d+)?$/.test(token)) {
      throw new Error(`Invalid number: ${token ?? 'end of input'}`)
    }
    return Number(token)
  }

  const result = parseExpression()
  if (pos < tokens.length) {
    throw new Error(`Unexpected token: ${tokens[pos]}`)
  }
  return result
}

function tokenize(expression: string): string[] {
  const cleaned = expression.replace(/\s+/g, '')
  if (!cleaned) throw new Error('Expression is empty')
  if (!/^[\d+\-*/().%]+$/.test(cleaned)) {
    throw new Error('Expression contains invalid characters')
  }

  const tokens: string[] = []
  let i = 0
  while (i < cleaned.length) {
    const ch = cleaned[i]
    if ('+-*/()%'.includes(ch)) {
      tokens.push(ch)
      i++
      continue
    }
    if (/\d/.test(ch) || ch === '.') {
      let num = ch
      i++
      while (i < cleaned.length && /[\d.]/.test(cleaned[i])) {
        num += cleaned[i++]
      }
      tokens.push(num)
      continue
    }
    throw new Error(`Invalid character: ${ch}`)
  }
  return tokens
}

async function executeCalculator(
  input: unknown,
  _context: ToolExecutionContext,
): Promise<LLMToolResult> {
  const args = input as { expression?: string }
  const expression = args.expression?.trim()
  if (!expression) {
    return {
      callId: '',
      name: 'calculator',
      content: '',
      error: 'expression is required',
    }
  }

  try {
    const result = evaluateExpression(expression)
    return {
      callId: '',
      name: 'calculator',
      content: String(result),
    }
  } catch (error) {
    return {
      callId: '',
      name: 'calculator',
      content: '',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export const calculatorTool: LLMToolDefinition = {
  name: 'calculator',
  description: 'Evaluate a basic arithmetic expression with +, -, *, /, %, and parentheses.',
  promptGuidance: {
    useWhen: [
      'The user asks you to calculate, compute, or evaluate a numeric expression.',
      'The user asks for a math result involving +, -, *, /, %, or parentheses.',
      'The answer requires precise arithmetic — do not do mental math.',
    ],
    examples: [
      {
        user: 'what is 15% of 240?',
        toolCall: { name: 'calculator', arguments: { expression: '240 * 0.15' } },
      },
      {
        user: 'calculate (12 + 3) * 4',
        toolCall: { name: 'calculator', arguments: { expression: '(12 + 3) * 4' } },
      },
    ],
  },
  parameters: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Arithmetic expression to evaluate, e.g. "(12 + 3) * 4"',
      },
    },
    required: ['expression'],
    additionalProperties: false,
  },
  execute: executeCalculator,
}
