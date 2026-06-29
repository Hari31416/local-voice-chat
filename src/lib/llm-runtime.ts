import {
  getLLMEngineModelId,
  type LLMBackend,
  type LLMOption,
} from "@/lib/llm-models"

type RuntimeMessage = {
  role: "user" | "assistant"
  content: string
}

type RuntimeStreamOptions = {
  maxTokens?: number
}

type LLMBackendHandle = {
  isReady: boolean
  loadProgress: number
  loadModel: (modelId?: never) => Promise<boolean>
  unload: () => Promise<void>
  abort: () => void
  chatStream: (
    messages: RuntimeMessage[],
    systemPrompt?: string,
    imageOrOptions?: string | RuntimeStreamOptions,
    options?: RuntimeStreamOptions,
  ) => AsyncGenerator<string, void, unknown>
}

export type LLMRuntimeHandles = Record<LLMBackend, LLMBackendHandle>

export function getLLMLoadProgress(
  option: LLMOption,
  handles: LLMRuntimeHandles,
): number {
  return handles[option.backend].loadProgress
}

export async function loadLLMOption(
  option: LLMOption,
  handles: LLMRuntimeHandles,
): Promise<boolean> {
  return handles[option.backend].loadModel(getLLMEngineModelId(option) as never)
}

export async function unloadLLMOption(
  option: LLMOption,
  handles: LLMRuntimeHandles,
): Promise<void> {
  await handles[option.backend].unload()
}

export async function unloadStaleLLMOption(
  previous: LLMOption | undefined,
  next: LLMOption | undefined,
  handles: LLMRuntimeHandles,
): Promise<void> {
  if (!previous || !next) return

  const previousEngineModel = getLLMEngineModelId(previous)
  const nextEngineModel = getLLMEngineModelId(next)
  if (previous.backend !== next.backend || previousEngineModel !== nextEngineModel) {
    await unloadLLMOption(previous, handles)
  }
}

export function abortLLMOption(option: LLMOption, handles: LLMRuntimeHandles): void {
  handles[option.backend].abort()
}

export function assertLLMReady(option: LLMOption, handles: LLMRuntimeHandles): void {
  if (!handles[option.backend].isReady) {
    throw new Error(`${option.name} is not loaded`)
  }
}

export function streamLLMOption(
  option: LLMOption,
  handles: LLMRuntimeHandles,
  messages: RuntimeMessage[],
  systemPrompt: string,
  imageDataUrl: string | undefined,
  options: RuntimeStreamOptions,
): AsyncGenerator<string, void, unknown> {
  assertLLMReady(option, handles)

  if (option.capabilities.vision) {
    return handles[option.backend].chatStream(messages, systemPrompt, imageDataUrl, options)
  }

  return handles[option.backend].chatStream(messages, systemPrompt, options)
}
