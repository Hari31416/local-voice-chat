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
import type { LLMStreamEvent } from './parsers'

export type AiSdkStreamRequest = {
  messages: { role: 'user' | 'assistant'; content: string }[]
  systemPrompt?: string
  imageDataUrl?: string
  maxTokens?: number
  thinkingEnabled?: boolean
  modelFamily?: string
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
  // Qwen 3.5 and Gemma 4 (Transformers.js) stream reasoning first, then close with
  // `` — often without an explicit opening tag.
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
    .replace(/<think>thought\s*/gi, '')
    .replace(/<\|think\|>\s*/g, '')
    .replace(/<\|channel>thought\s*/gi, '')
}

export async function* streamAiSdkToEvents(
  model: TransformersJSLanguageModel | WebLLMLanguageModel,
  provider: AiSdkProvider,
  req: AiSdkStreamRequest,
  abortSignal?: AbortSignal,
): AsyncGenerator<LLMStreamEvent, void, unknown> {
  const thinkingEnabled = req.thinkingEnabled ?? false
  const baseModel = model as unknown as LanguageModel
  const languageModel = thinkingEnabled
    ? wrapLanguageModel({
        model: baseModel as never,
        middleware: extractReasoningMiddleware(
          getReasoningMiddlewareOptions(req.modelFamily),
        ),
      })
    : baseModel

  const providerOptions = thinkingEnabled
    ? provider === 'transformers-js'
      ? { 'transformers-js': { enableThinking: true } }
      : { 'web-llm': { extra_body: { enable_thinking: true } } }
    : undefined

  const result = streamText({
    model: languageModel as never,
    messages: buildMessages(req),
    ...(req.systemPrompt ? { instructions: req.systemPrompt } : {}),
    maxOutputTokens: req.maxTokens,
    abortSignal,
    providerOptions: providerOptions as never,
  })

  for await (const part of result.fullStream) {
    if (part.type === 'text-delta' && part.text) {
      yield { type: 'text_delta', text: part.text }
    } else if (part.type === 'reasoning-delta' && part.text) {
      const cleaned = sanitizeThinkingDelta(part.text)
      if (cleaned) {
        yield { type: 'thinking_delta', text: cleaned }
      }
    } else if (part.type === 'finish') {
      yield { type: 'done' }
    }
  }
}
