import type { StreamParser } from './index'
import { DefaultStreamParser } from './default'
import { QwenStreamParser } from './qwen'
import { GemmaStreamParser } from './gemma'

export function createParser(family: string, thinkingEnabled: boolean): StreamParser {
  if (thinkingEnabled) {
    if (family === 'qwen') {
      return new QwenStreamParser()
    }
    if (family === 'gemma') {
      return new GemmaStreamParser()
    }
  }
  return new DefaultStreamParser()
}
