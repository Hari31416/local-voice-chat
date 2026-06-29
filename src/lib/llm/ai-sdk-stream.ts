import {
  streamText,
  wrapLanguageModel,
  extractReasoningMiddleware,
  type LanguageModel,
  type ModelMessage,
} from 'ai'
import { transformersJS, type TransformersJSLanguageModel } from '@browser-ai/transformers-js'
import type { PretrainedModelOptions } from '@huggingface/transformers'
import { webLLM, type WebLLMLanguageModel } from '@browser-ai/web-llm'
import { buildAiSdkToolSet } from '@/lib/tools/ai-sdk-tools'
import type { LLMToolCall } from '@/lib/tools/types'
import type { LLMStreamEvent } from './parsers'
import {
  ToolCallStreamParser,
  normalizeToolCallInput,
} from './parsers/tools'

export type AiSdkStreamRequest = {
  messages: RuntimeMessage[]
  systemPrompt?: string
  imageDataUrl?: string
  maxTokens?: number
  thinkingEnabled?: boolean
  toolsEnabled?: boolean
  modelFamily?: string
}

export type RuntimeMessage = {
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: LLMToolCall[]
  toolCallId?: string
  toolName?: string
}

type AiSdkProvider = 'transformers-js' | 'web-llm'

function isVisionModelId(modelId: string): boolean {
  const id = modelId.toLowerCase()
  return (
    id.includes('qwen3.5') ||
    id.includes('qwen3_5') ||
    id.includes('gemma-4') ||
    id.includes('gemma_4')
  )
}

/** Per-model dtype — avoids `auto` loading fp16 weights and blowing past RAM. */
function resolveTransformersDtype(modelId: string): PretrainedModelOptions['dtype'] {
  const id = modelId.toLowerCase()
  if (id.includes('gemma-4') || id.includes('gemma_4')) {
    return 'q4f16'
  }
  if (id.includes('qwen3.5') || id.includes('qwen3_5')) {
    return {
      embed_tokens: 'q4',
      vision_encoder: 'fp16',
      decoder_model_merged: 'q4',
    }
  }
  return 'q4'
}

export function createTransformersModel(
  modelId: string,
  onProgress?: (pct: number) => void,
): TransformersJSLanguageModel {
  return transformersJS(modelId, {
    device: 'webgpu',
    dtype: resolveTransformersDtype(modelId),
    isVisionModel: isVisionModelId(modelId),
    initProgressCallback: onProgress
      ? (progress) => onProgress(Math.round(progress * 100))
      : undefined,
  })
}

export function createWebLLMModel(
  modelId: string,
  onProgress?: (pct: number) => void,
): WebLLMLanguageModel {
  return webLLM(modelId, {
    initProgressCallback: onProgress
      ? (report) => onProgress(Math.round((report.progress ?? 0) * 100))
      : undefined,
  })
}

function buildMessages(req: AiSdkStreamRequest): ModelMessage[] {
  const messages: ModelMessage[] = []

  for (let i = 0; i < req.messages.length; i++) {
    const msg = req.messages[i]
    const isLastUserWithImage =
      msg.role === 'user' &&
      i === req.messages.length - 1 &&
      Boolean(req.imageDataUrl)

    if (msg.role === 'tool') {
      messages.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: msg.toolCallId ?? 'unknown',
            toolName: msg.toolName ?? 'unknown',
            output: { type: 'text', value: msg.content },
          },
        ],
      })
      continue
    }

    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: msg.toolCalls.map((call) => ({
          type: 'tool-call' as const,
          toolCallId: call.id,
          toolName: call.name,
          input: call.arguments,
        })),
      })
      continue
    }

    if (isLastUserWithImage && req.imageDataUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'image', image: req.imageDataUrl },
          { type: 'text', text: msg.content || ' ' },
        ],
      })
    } else if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content })
    } else {
      messages.push({ role: 'assistant', content: msg.content })
    }
  }

  return messages
}

function getReasoningMiddlewareOptions(family?: string) {
  if (family === 'qwen' || family === 'gemma') {
    return { tagName: 'think', startWithReasoning: true as const }
  }
  return { tagName: 'think', startWithReasoning: true as const }
}

const THINK_OPEN = '<' + 'think>'
const THINK_CLOSE = '</' + 'think>'

/** Remove leaked markup from thinking deltas shown in the UI. */
function sanitizeThinkingDelta(text: string): string {
  return text
    .replace(new RegExp(THINK_OPEN, 'g'), '')
    .replace(new RegExp(THINK_CLOSE, 'g'), '')
    .replace(/<\/?redacted_thinking>/gi, '')
    .replace(/<\/?thinking>/gi, '')
    .replace(/<\|think\|>\s*/g, '')
    .replace(/<\|channel>thought\s*/gi, '')
}

/** Strip thinking blocks that leak into the answer channel. */
function sanitizeAnswerDelta(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, '')
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(new RegExp(`${THINK_OPEN}[\\s\\S]*?${THINK_CLOSE}`, 'g'), '')
    .replace(/<\/?redacted_thinking>/gi, '')
    .replace(/<\/?thinking>/gi, '')
    .replace(new RegExp(THINK_OPEN, 'g'), '')
    .replace(new RegExp(THINK_CLOSE, 'g'), '')
    .trimStart()
}

export async function* streamAiSdkToEvents(
  model: TransformersJSLanguageModel | WebLLMLanguageModel,
  provider: AiSdkProvider,
  req: AiSdkStreamRequest,
  abortSignal?: AbortSignal,
): AsyncGenerator<LLMStreamEvent, void, unknown> {
  const thinkingEnabled = req.thinkingEnabled ?? false
  const toolsEnabled = req.toolsEnabled ?? false
  const baseModel = model as unknown as LanguageModel
  const languageModel = thinkingEnabled
    ? wrapLanguageModel({
        model: baseModel as never,
        middleware: extractReasoningMiddleware(
          getReasoningMiddlewareOptions(req.modelFamily),
        ),
      })
    : baseModel

  const useProviderThinking =
    thinkingEnabled && !(toolsEnabled && provider === 'transformers-js')

  const providerOptions = useProviderThinking
    ? provider === 'transformers-js'
      ? { 'transformers-js': { enableThinking: true } }
      : { 'web-llm': { extra_body: { enable_thinking: true } } }
    : undefined

  const tools = toolsEnabled ? buildAiSdkToolSet() : undefined
  const useTextToolParser = toolsEnabled && provider === 'transformers-js'
  const textToolParser = useTextToolParser ? new ToolCallStreamParser() : null

  const result = streamText({
    model: languageModel as never,
    messages: buildMessages(req),
    ...(req.systemPrompt ? { instructions: req.systemPrompt } : {}),
    maxOutputTokens: req.maxTokens,
    abortSignal,
    providerOptions: providerOptions as never,
    ...(tools ? { tools } : {}),
  })

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta' && part.text) {
      if (textToolParser) {
        const { text, toolCalls } = textToolParser.process(part.text)
        for (const call of toolCalls) {
          yield { type: 'tool_call', call }
        }
        const cleaned = sanitizeAnswerDelta(text)
        if (cleaned) {
          yield { type: 'text_delta', text: cleaned }
        }
      } else {
        const cleaned = sanitizeAnswerDelta(part.text)
        if (cleaned) {
          yield { type: 'text_delta', text: cleaned }
        }
      }
    } else if (part.type === 'reasoning-delta' && part.text) {
      const cleaned = sanitizeThinkingDelta(part.text)
      if (cleaned) {
        yield { type: 'thinking_delta', text: cleaned }
      }
    } else if (part.type === 'tool-call' && !('invalid' in part && part.invalid)) {
      yield {
        type: 'tool_call',
        call: {
          id: part.toolCallId,
          name: part.toolName,
          arguments: normalizeToolCallInput(part.input),
        },
      }
    } else if (part.type === 'finish-step' && part.usage) {
      yield {
        type: 'usage',
        usage: {
          promptTokens: part.usage.inputTokens,
          completionTokens: part.usage.outputTokens,
          totalTokens: part.usage.totalTokens,
        },
      }
    } else if (part.type === 'finish') {
      if (textToolParser) {
        const { text, toolCalls } = textToolParser.flush()
        for (const call of toolCalls) {
          yield { type: 'tool_call', call }
        }
        if (text) {
          const cleaned = sanitizeAnswerDelta(text)
          if (cleaned) {
            yield { type: 'text_delta', text: cleaned }
          }
        }
      }
      yield { type: 'done' }
    }
  }
}
