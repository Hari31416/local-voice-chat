import {
  type LLMVariant,
  type LLMEngineType,
} from "@/lib/llm-models"

type RuntimeMessage = {
  role: "user" | "assistant"
  content: string
}

type RuntimeStreamOptions = {
  maxTokens?: number
}

export type LLMBackendHandle = {
  isReady: boolean
  loadProgress: number
  loadModel: (modelId: string) => Promise<boolean>
  unload: () => Promise<void>
  abort: () => void
  chatStream: (
    messages: RuntimeMessage[],
    systemPrompt?: string,
    imageOrOptions?: string | RuntimeStreamOptions,
    options?: RuntimeStreamOptions,
  ) => AsyncGenerator<string, void, unknown>
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
  stream(request: LLMRequest, handles: LLMRuntimeHandles): AsyncGenerator<string, void, unknown>
  getLoadProgress(handles: LLMRuntimeHandles): number
}

const gemmaKernelEngine: LLMEngineAdapter = {
  engine: 'gemma4-kernel',
  load: async (variant, handles) => handles.gemma4.loadModel(variant.engineModelId),
  unload: async (handles) => handles.gemma4.unload(),
  isReady: (_variant, handles) => handles.gemma4.isReady,
  abort: (handles) => handles.gemma4.abort(),
  stream: (req, handles) => handles.gemma4.chatStream(req.messages, req.systemPrompt, undefined, req.options),
  getLoadProgress: (handles) => handles.gemma4.loadProgress
}

const lfmKernelEngine: LLMEngineAdapter = {
  engine: 'lfm2-kernel',
  load: async (variant, handles) => handles.lfm2.loadModel(variant.engineModelId),
  unload: async (handles) => handles.lfm2.unload(),
  isReady: (_variant, handles) => handles.lfm2.isReady,
  abort: (handles) => handles.lfm2.abort(),
  stream: (req, handles) => handles.lfm2.chatStream(req.messages, req.systemPrompt, req.options),
  getLoadProgress: (handles) => handles.lfm2.loadProgress
}

const webllmEngine: LLMEngineAdapter = {
  engine: 'webllm',
  load: async (variant, handles) => handles.webllm.loadModel(variant.engineModelId),
  unload: async (handles) => handles.webllm.unload(),
  isReady: (_variant, handles) => handles.webllm.isReady,
  abort: (handles) => handles.webllm.abort(),
  stream: (req, handles) => handles.webllm.chatStream(req.messages, req.systemPrompt, req.options),
  getLoadProgress: (handles) => handles.webllm.loadProgress
}

const transformersEngine: LLMEngineAdapter = {
  engine: 'transformers-js',
  load: async (variant, handles) => handles.qwen35.loadModel(variant.engineModelId),
  unload: async (handles) => handles.qwen35.unload(),
  isReady: (_variant, handles) => handles.qwen35.isReady,
  abort: (handles) => handles.qwen35.abort(),
  stream: (req, handles) => handles.qwen35.chatStream(req.messages, req.systemPrompt, req.imageDataUrl, req.options),
  getLoadProgress: (handles) => handles.qwen35.loadProgress
}

const LLM_ENGINES: Record<LLMEngineType, LLMEngineAdapter> = {
  "gemma4-kernel": gemmaKernelEngine,
  "lfm2-kernel": lfmKernelEngine,
  "transformers-js": transformersEngine,
  webllm: webllmEngine,
}

export function getEngineAdapter(engine: LLMEngineType): LLMEngineAdapter {
  const adapter = LLM_ENGINES[engine]
  if (!adapter) throw new Error(`Unsupported engine type: ${engine}`)
  return adapter
}

export function getLLMVariantLoadProgress(
  variant: LLMVariant,
  handles: LLMRuntimeHandles,
): number {
  return getEngineAdapter(variant.engine).getLoadProgress(handles)
}

export async function loadLLMVariant(
  variant: LLMVariant,
  handles: LLMRuntimeHandles,
): Promise<boolean> {
  return getEngineAdapter(variant.engine).load(variant, handles)
}

export async function unloadLLMVariant(
  variant: LLMVariant,
  handles: LLMRuntimeHandles,
): Promise<void> {
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
): AsyncGenerator<string, void, unknown> {
  assertLLMVariantReady(variant, handles)
  return getEngineAdapter(variant.engine).stream({
    messages,
    systemPrompt,
    imageDataUrl,
    options,
  }, handles)
}
