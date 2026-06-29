import { ToolCallStreamParser } from './tools'
import { executeToolCall } from '@/lib/tools/execute'

function assertEquals(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`Assertion failed: ${message}`)
    console.error('  Expected:', expected)
    console.error('  Actual:  ', actual)
    process.exit(1)
  } else {
    console.log(`✓ Pass: ${message}`)
  }
}

console.log('--- Testing Tool Call Stream Parser ---')
const parser = new ToolCallStreamParser()

const chunk1 = parser.process('Let me check: ')
assertEquals(chunk1.text, 'Let me check: ', 'emits leading text')
assertEquals(chunk1.toolCalls.length, 0, 'no tool calls yet')

const chunk2 = parser.process('```tool_call\n{"name":"calculator","arguments":{"expression":"2+2"}}\n```')
assertEquals(chunk2.text, '', 'tool fence is not emitted as text')
assertEquals(chunk2.toolCalls.length, 1, 'parses one tool call')
assertEquals(chunk2.toolCalls[0]?.name, 'calculator', 'tool name parsed')

const chunk3 = parser.process(' The answer follows.')
assertEquals(chunk3.text, ' The answer follows.', 'emits trailing text')

console.log('\n--- Testing Malformed Tool Calls ---')
const malformed = new ToolCallStreamParser()
const bad = malformed.process('```tool_call\nnot json\n```')
assertEquals(bad.toolCalls.length, 0, 'ignores malformed JSON')

const unknown = malformed.process('```tool_call\n{"name":"launch_missiles","arguments":{}}\n```')
assertEquals(unknown.toolCalls.length, 0, 'ignores unregistered tools')

console.log('\n--- Testing Calculator Tool ---')
const calcResult = await executeToolCall({
  id: 'test-calc',
  name: 'calculator',
  arguments: { expression: '(12 + 3) * 2' },
})
assertEquals(calcResult.content, '30', 'calculator evaluates expression')
assertEquals(calcResult.error, undefined, 'calculator has no error')

const invalidCalc = await executeToolCall({
  id: 'test-calc-bad',
  name: 'calculator',
  arguments: { expression: 'alert(1)' },
})
assertEquals(invalidCalc.error?.includes('invalid'), true, 'calculator rejects unsafe input')

console.log('\n--- Testing Abort During Tool Execution ---')
const controller = new AbortController()
controller.abort()
try {
  await executeToolCall(
    { id: 'abort-test', name: 'get_current_time', arguments: {} },
    { abortSignal: controller.signal },
  )
  console.error('Assertion failed: abort should throw')
  process.exit(1)
} catch (error) {
  const isAbort = error instanceof DOMException && error.name === 'AbortError'
  assertEquals(isAbort, true, 'aborted tool execution throws AbortError')
}

console.log('\nAll tool tests completed successfully!')
