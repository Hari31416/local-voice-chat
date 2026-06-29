import {
  type LLMVariant,
  type LLMEngineType,
  getLLMModel,
} from '@/lib/llm-models'
import type { AiSdkStreamRequest } from './llm/ai-sdk-stream'
import { createParser } from './llm/parsers/factory'
import type { LLMStreamEvent } from './llm/parsers'

export type { LLMStreamEvent }

type RuntimeMessage = {
  role: 'user' | 'assistant'
  content: string
}

type RuntimeStreamOptions = {
  maxTokens?: number
  thinkingEnabled?: boolean
}

export type LLMBackendHandle = {
  isReady: boolean
  loadProgress: number
  loadModel: (modelId: string) => Promise<boolean>
  unload: () => Promise<void>
  abort: () => void
  chatStream?: (
    messages: RuntimeMessage[],
    systemPrompt?: string,
    imageOrOptions?: string | RuntimeStreamOptions,
    options?: RuntimeStreamOptions,
  ) => AsyncGenerator<string, void, unknown>
  chatStreamEvents?: (
    request: AiSdkStreamRequest,
  ) => AsyncGenerator<LLMStreamEvent, void, unknown>
}

export type LLMRuntimeHandles = {
  gemma4: LLMBackendHandle
  webllm: LLMBackendHandle
  lfm2: LLMBackendHandle
  qwen35: LLMBackendHandle
}

export interface LLMRequest {
  messages: RuntimeMessage[]
  systemPrompt?: string
  imageDataUrl?: string
  options?: RuntimeStreamOptions
}

export interface LLMEngineAdapter {
  engine: LLMEngineType
  load(variant: LLMVariant, handles: LLMRuntimeHandles): Promise<boolean>
  unload(handles: LLMRuntimeHandles, variant?: LLMVariant): Promise<void>
  isReady(variant: LLMVariant, handles: LLMRuntimeHandles): boolean
  abort(handles: LLMRuntimeHandles): void
  stream(
    request: LLMRequest,
    variant: LLMVariant,
    handles: LLMRuntimeHandles,
  ): AsyncGenerator<LLMStreamEvent, void, unknown>
  getLoadProgress(handles: LLMRuntimeHandles): number
}

export async function* parseRawStream(
  rawStream: AsyncGenerator<string, void, unknown>,
  family: string,
  thinkingEnabled: boolean,
): AsyncGenerator<LLMStreamEvent, void, unknown> {
  const parser = createParser(family, thinkingEnabled)
  for await (const chunk of rawStream) {
    const { textDelta, thinkingDelta } = parser.process(chunk)
    if (textDelta) {
      yield { type: 'text_delta', text: textDelta }
    }
    if (thinkingDelta) {
      yield { type: 'thinking_delta', text: thinkingDelta }
    }
  }
  yield { type: 'done' }
}

function buildAiSdkRequest(
  req: LLMRequest,
  variant: LLMVariant,
): AiSdkStreamRequest {
  const thinkingEnabled =
    variant.capabilities.thinking && (req.options?.thinkingEnabled ?? false)

  return {
    messages: req.messages,
    systemPrompt: req.systemPrompt,
    imageDataUrl: req.imageDataUrl,
    maxTokens: req.options?.maxTokens,
    thinkingEnabled,
    modelFamily: getLLMModel(variant.modelId).family,
  }
}

async function* streamAiSdkEngine(
  req: LLMRequest,
  variant: LLMVariant,
  handle: LLMBackendHandle,
): AsyncGenerator<LLMStreamEvent, void, unknown> {
  if (!handle.chatStreamEvents) {
    throw new Error('AI SDK streaming is not available for this engine')
  }
  yield* handle.chatStreamEvents(buildAiSdkRequest(req, variant))
}

const gemmaKernelEngine: LLMEngineAdapter = {
  engine: 'gemma4-kernel',
  load: async (variant, handles) => handles.gemma4.loadModel(variant.engineModelId),
  unload: async (handles) => handles.gemma4.unload(),
  isReady: (_variant, handles) => handles.gemma4.isReady,
  abort: (handles) => handles.gemma4.abort(),
  stream: (req, variant, handles) => {
    if (!handles.gemma4.chatStream) {
      throw new Error('Gemma kernel streaming is not available')
    }
    const thinkingEnabled =
      variant.capabilities.thinking && (req.options?.thinkingEnabled ?? false)
    return parseRawStream(
      handles.gemma4.chatStream(req.messages, req.systemPrompt, undefined, req.options),
      getLLMModel(variant.modelId).family,
      thinkingEnabled,
    )
  },
  getLoadProgress: (handles) => handles.gemma4.loadProgress,
}

const lfmKernelEngine: LLMEngineAdapter = {
  engine: 'lfm2-kernel',
  load: async (variant, handles) => handles.lfm2.loadModel(variant.engineModelId),
  unload: async (handles) => handles.lfm2.unload(),
  isReady: (_variant, handles) => handles.lfm2.isReady,
  abort: (handles) => handles.lfm2.abort(),
  stream: (req, _variant, handles) => {
    if (!handles.lfm2.chatStream) {
      throw new Error('LFM kernel streaming is not available')
    }
    return parseRawStream(
      handles.lfm2.chatStream(req.messages, req.systemPrompt, req.options),
      getLLMModel(_variant.modelId).family,
      false,
    )
  },
  getLoadProgress: (handles) => handles.lfm2.loadProgress,
}

const webllmEngine: LLMEngineAdapter = {
  engine: 'webllm',
  load: async (variant, handles) => handles.webllm.loadModel(variant.engineModelId),
  unload: async (handles) => handles.webllm.unload(),
  isReady: (_variant, handles) => handles.webllm.isReady,
  abort: (handles) => handles.webllm.abort(),
  stream: (req, variant, handles) => streamAiSdkEngine(req, variant, handles.webllm),
  getLoadProgress: (handles) => handles.webllm.loadProgress,
}

const transformersEngine: LLMEngineAdapter = {
  engine: 'transformers-js',
  load: async (variant, handles) => handles.qwen35.loadModel(variant.engineModelId),
  unload: async (handles) => handles.qwen35.unload(),
  isReady: (_variant, handles) => handles.qwen35.isReady,
  abort: (handles) => handles.qwen35.abort(),
  stream: (req, variant, handles) => streamAiSdkEngine(req, variant, handles.qwen35),
  getLoadProgress: (handles) => handles.qwen35.loadProgress,
}

const LLM_ENGINES: Record<LLMEngineType, LLMEngineAdapter> = {
  'gemma4-kernel': gemmaKernelEngine,
  'lfm2-kernel': lfmKernelEngine,
  'transformers-js': transformersEngine,
  webllm: webllmEngine,
}

export function getEngineAdapter(engine: LLMEngineType): LLMEngineAdapter {
  const adapter = LLM_ENGINES[engine]
  if (!adapter) throw new Error(`Unsupported engine type: ${engine}`)
  return adapter
}

export function getLLMVariantLoadProgress(variant: LLMVariant, handles: LLMRuntimeHandles): number {
  return getEngineAdapter(variant.engine).getLoadProgress(handles)
}

export async function loadLLMVariant(variant: LLMVariant, handles: LLMRuntimeHandles): Promise<boolean> {
  return getEngineAdapter(variant.engine).load(variant, handles)
}

export async function unloadLLMVariant(variant: LLMVariant, handles: LLMRuntimeHandles): Promise<void> {
  await getEngineAdapter(variant.engine).unload(handles, variant)
}

export async function unloadStaleLLMVariant(
  previous: LLMVariant | undefined,
  next: LLMVariant | undefined,
  handles: LLMRuntimeHandles,
): Promise<void> {
  if (!previous || !next) return

  if (previous.engine !== next.engine || previous.engineModelId !== next.engineModelId) {
    await unloadLLMVariant(previous, handles)
  }
}

export function abortLLMVariant(variant: LLMVariant, handles: LLMRuntimeHandles): void {
  getEngineAdapter(variant.engine).abort(handles)
}

export function assertLLMVariantReady(variant: LLMVariant, handles: LLMRuntimeHandles): void {
  if (!getEngineAdapter(variant.engine).isReady(variant, handles)) {
    throw new Error(`${variant.id} is not loaded`)
  }
}

export function streamLLMVariant(
  variant: LLMVariant,
  handles: LLMRuntimeHandles,
  messages: RuntimeMessage[],
  systemPrompt: string,
  imageDataUrl: string | undefined,
  options: RuntimeStreamOptions,
): AsyncGenerator<LLMStreamEvent, void, unknown> {
  assertLLMVariantReady(variant, handles)
  return getEngineAdapter(variant.engine).stream(
    {
      messages,
      systemPrompt,
      imageDataUrl,
      options,
    },
    variant,
    handles,
  )
}
