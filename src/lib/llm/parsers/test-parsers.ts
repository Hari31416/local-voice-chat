import { QwenStreamParser } from './qwen'
import { GemmaStreamParser } from './gemma'
import { splitPendingPrefix } from './index'

function assertEquals(actual: any, expected: any, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`Assertion failed: ${message}`)
    console.error(`  Expected:`, expected)
    console.error(`  Actual:  `, actual)
    process.exit(1)
  } else {
    console.log(`✓ Pass: ${message}`)
  }
}

// Test 1: Suffix Match / Buffer split
console.log('--- Testing Tag Suffix Buffering ---')
assertEquals(splitPendingPrefix('Hello <'), { clean: 'Hello ', pending: '<' }, 'Buffers trailing <')
assertEquals(splitPendingPrefix('Hello <thi'), { clean: 'Hello ', pending: '<thi' }, 'Buffers trailing partial tag <thi')
assertEquals(splitPendingPrefix('Hello <thinking>'), { clean: 'Hello <thinking>', pending: '' }, 'Does not buffer complete tag')
assertEquals(splitPendingPrefix('Hello <thinking> there'), { clean: 'Hello <thinking> there', pending: '' }, 'Does not buffer complete tag in middle')
assertEquals(splitPendingPrefix('Hello <thinking> there </thin'), { clean: 'Hello <thinking> there ', pending: '</thin' }, 'Buffers partial close tag')

// Test 2: QwenStreamParser
console.log('\n--- Testing Qwen Stream Parser ---')
const qwen = new QwenStreamParser()

// Simulate a stream
const qwenChunks = [
  'Here is the response: ',
  '<thi',
  'nking>\n',
  'I am reasoning about ',
  'the answer.\n',
  '</thi',
  'nking>\n',
  'This is the actual response text.',
]

const qwenExpectedDeltas = [
  { textDelta: 'Here is the response: ', thinkingDelta: '' },
  { textDelta: '', thinkingDelta: '' }, // Buffering <thi
  { textDelta: '', thinkingDelta: '' }, // After <thinking>\n starts thinking, but nothing new yet
  { textDelta: '', thinkingDelta: 'I am reasoning about ' },
  { textDelta: '', thinkingDelta: 'the answer.\n' },
  { textDelta: '', thinkingDelta: '' }, // Buffering </thi
  { textDelta: '', thinkingDelta: '' }, // end thinking
  { textDelta: 'This is the actual response text.', thinkingDelta: '' },
]

qwenChunks.forEach((chunk, i) => {
  const result = qwen.process(chunk)
  assertEquals(result, qwenExpectedDeltas[i], `Qwen chunk ${i}: "${chunk}"`)
})

// Test 2.5: QwenStreamParser with <think>
console.log('\n--- Testing Qwen Stream Parser with <think> ---')
const qwenThink = new QwenStreamParser()
const thinkChunks = [
  'Response: ',
  '<thi',
  'nk>\n',
  'Reasoning... ',
  '</thi',
  'nk>\n',
  'Final text.',
]
const thinkExpectedDeltas = [
  { textDelta: 'Response: ', thinkingDelta: '' },
  { textDelta: '', thinkingDelta: '' },
  { textDelta: '', thinkingDelta: '' },
  { textDelta: '', thinkingDelta: 'Reasoning... ' },
  { textDelta: '', thinkingDelta: '' },
  { textDelta: '', thinkingDelta: '' },
  { textDelta: 'Final text.', thinkingDelta: '' },
]
thinkChunks.forEach((chunk, i) => {
  const result = qwenThink.process(chunk)
  assertEquals(result, thinkExpectedDeltas[i], `Qwen think chunk ${i}: "${chunk}"`)
})

// Test 3: GemmaStreamParser
console.log('\n--- Testing Gemma Stream Parser ---')
const gemma = new GemmaStreamParser()

const gemmaChunks = [
  '<chan',
  'nel|>thought\n',
  'I should calculate the sum.',
  '<|chan',
  'nel><channel|>main\n',
  'The sum is 42.',
]

const gemmaExpectedDeltas = [
  { textDelta: '', thinkingDelta: '' }, // Buffering <chan
  { textDelta: '', thinkingDelta: '' }, // Start thinking
  { textDelta: '', thinkingDelta: 'I should calculate the sum.' },
  { textDelta: '', thinkingDelta: '' }, // Buffering <|chan
  { textDelta: '', thinkingDelta: '' }, // Switch channel
  { textDelta: 'The sum is 42.', thinkingDelta: '' },
]

gemmaChunks.forEach((chunk, i) => {
  const result = gemma.process(chunk)
  assertEquals(result, gemmaExpectedDeltas[i], `Gemma chunk ${i}: "${chunk}"`)
})

// Test 4: GemmaStreamParser with new <|channel> format
console.log('\n--- Testing Gemma Stream Parser with <|channel> format ---')
const gemmaNew = new GemmaStreamParser()
const gemmaNewChunks = [
  '<|chan',
  'nel>thought\n',
  'Thinking Process...',
  '<|channel>main\n',
  'Hello!',
]
const gemmaNewExpected = [
  { textDelta: '', thinkingDelta: '' },
  { textDelta: '', thinkingDelta: '' },
  { textDelta: '', thinkingDelta: 'Thinking Process...' },
  { textDelta: '', thinkingDelta: '' },
  { textDelta: 'Hello!', thinkingDelta: '' },
]
gemmaNewChunks.forEach((chunk, i) => {
  const result = gemmaNew.process(chunk)
  assertEquals(result, gemmaNewExpected[i], `Gemma new chunk ${i}: "${chunk}"`)
})

console.log('\nAll parser tests completed successfully!')
