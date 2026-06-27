import { useState, useRef, useCallback } from "react"

export const GEMMA4_MODEL_ID = "onnx-community/gemma-4-E2B-it-ONNX"

export type Gemma4Status = "idle" | "loading" | "ready" | "generating" | "error"

interface UseGemma4Options {
  onStatusChange?: (status: Gemma4Status) => void
  onError?: (error: Error) => void
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | ({ type: 'text'; text: string } | { type: 'image' })[]
}

type TensorLike = { dims: number[]; slice: (...args: unknown[]) => unknown }

type Gemma4Processor = {
  apply_chat_template: (
    messages: ChatMessage[],
    options: Record<string, unknown>,
  ) => string
  batch_decode: (
    tokens: unknown,
    options: { skip_special_tokens: boolean },
  ) => string[]
  tokenizer: {
    decode: (tokens: bigint[], options: Record<string, unknown>) => string
    all_special_ids: number[]
  }
  (text: string, images?: any, audio?: null, options?: { add_special_tokens?: boolean }): Promise<Record<string, unknown>>
}

type Gemma4Model = {
  generate: (options: Record<string, unknown>) => Promise<TensorLike>
  dispose?: () => void
}


let transformersConfigured = false

/** Strip Gemma 4 thinking/channel markup from model output (matches chat_template.jinja). */
export function extractGemma4Response(text: string): string {
  let result = ""
  for (const part of text.split("<channel|>")) {
    if (part.includes("<|channel>")) {
      result += part.split("<|channel>")[0]
    } else {
      result += part
    }
  }

  return result
    .replace(/<\|turn>model\s*/g, "")
    .replace(/<\|turn>user\s*/g, "")
    .replace(/<turn\|>\s*/g, "")
    .replace(/<\|channel>thought\s*/g, "")
    .replace(/<\|think\|>\s*/g, "")
    .trim()
}

async function loadTransformers() {
  const transformers = await import("@huggingface/transformers")
  const { AutoProcessor, Gemma4ForConditionalGeneration, env, LogLevel } = transformers

  if (!transformersConfigured) {
    env.allowLocalModels = false
    env.useBrowserCache = true
    env.logLevel = LogLevel.ERROR
    transformersConfigured = true
  }

  return { AutoProcessor, Gemma4ForConditionalGeneration }
}

function formatGemma4Messages(
  messages: ChatMessage[],
  systemPrompt?: string,
  imageDataUrl?: string,
) {
  let lastUserIndex = -1
  for (let i = messages.length - 1; i >= 0; --i) {
    if (messages[i].role === 'user') {
      lastUserIndex = i
      break
    }
  }

  const formattedMessages = messages.map((m, index) => {
    const isLastUser = index === lastUserIndex
    if (isLastUser && imageDataUrl) {
      return {
        role: m.role,
        content: [
          { type: 'image' as const },
          { type: 'text' as const, text: m.content as string },
        ],
      }
    }
    return {
      role: m.role,
      content: m.content,
    }
  })

  const chatMessages = systemPrompt
    ? [{ role: 'system' as const, content: systemPrompt }, ...formattedMessages]
    : formattedMessages

  return chatMessages
}

export function useGemma4(options: UseGemma4Options = {}) {
  const { onStatusChange, onError } = options

  const [status, setStatus] = useState<Gemma4Status>("idle")
  const [loadProgress, setLoadProgress] = useState(0)

  const processorRef = useRef<Gemma4Processor | null>(null)
  const modelRef = useRef<Gemma4Model | null>(null)
  const abortRef = useRef(false)
  const loadingRef = useRef(false)

  const updateStatus = useCallback(
    (newStatus: Gemma4Status) => {
      console.debug("[Gemma4] Status:", newStatus)
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange],
  )

  const loadModel = useCallback(
    async (modelId: string = GEMMA4_MODEL_ID): Promise<boolean> => {
      if (loadingRef.current) return false

      loadingRef.current = true
      updateStatus("loading")
      setLoadProgress(0)

      try {
        const { AutoProcessor, Gemma4ForConditionalGeneration } = await loadTransformers()

        const progressCallback = (info: { status?: string; progress?: number }) => {
          if (info.status === "progress_total" && typeof info.progress === "number") {
            setLoadProgress(Math.round(info.progress))
          }
        }

        const [processor, model] = await Promise.all([
          AutoProcessor.from_pretrained(modelId, { progress_callback: progressCallback }),
          Gemma4ForConditionalGeneration.from_pretrained(modelId, {
            dtype: "q4f16",
            device: "webgpu",
            progress_callback: progressCallback,
          }),
        ])

        processorRef.current = processor as unknown as Gemma4Processor
        modelRef.current = model as unknown as Gemma4Model
        updateStatus("ready")
        console.log(`[Gemma4] Model ${modelId} loaded successfully`)
        return true
      } catch (error) {
        console.error("[Gemma4] Load error:", error)
        processorRef.current = null
        modelRef.current = null
        updateStatus("error")
        onError?.(error instanceof Error ? error : new Error(String(error)))
        return false
      } finally {
        loadingRef.current = false
      }
    },
    [updateStatus, onError],
  )

  const chat = useCallback(
    async (
      messages: ChatMessage[],
      systemPrompt?: string,
      imageDataUrl?: string,
      options?: { maxTokens?: number },
    ): Promise<string> => {
      const processor = processorRef.current
      const model = modelRef.current

      if (!processor || !model) {
        throw new Error('Gemma 4 not loaded')
      }

      updateStatus('generating')
      abortRef.current = false

      try {
        const chatMessages = formatGemma4Messages(messages, systemPrompt, imageDataUrl)

        const prompt = processor.apply_chat_template(chatMessages as any, {
          enable_thinking: false,
          add_generation_prompt: true,
          tokenize: false,
        })

        const { RawImage } = await import('@huggingface/transformers')
        const image = imageDataUrl
          ? await RawImage.fromURL(imageDataUrl)
          : null

        const inputs = await processor(prompt, image, null, { add_special_tokens: false })
        const inputIds = inputs.input_ids as TensorLike
        const promptLength = inputIds.dims.at(-1) ?? 0

        if (abortRef.current) {
          updateStatus("ready")
          return ""
        }

        console.debug("[Gemma4] Generating...", { promptLength })

        const outputs = await model.generate({
          ...inputs,
          max_new_tokens: options?.maxTokens ?? 128,
          do_sample: false,
        })

        if (abortRef.current) {
          updateStatus("ready")
          return ""
        }

        const generatedTokens = outputs.slice(null, [promptLength, null])
        const raw = processor.batch_decode(generatedTokens, { skip_special_tokens: false })[0] ?? ""
        const content = extractGemma4Response(raw)

        console.debug("[Gemma4] Raw output:", raw.slice(0, 200))
        console.debug("[Gemma4] Extracted:", content.slice(0, 200))

        if (!content.trim()) {
          throw new Error("Gemma 4 returned an empty response")
        }

        updateStatus("ready")
        return content
      } catch (error) {
        if (abortRef.current) {
          updateStatus("ready")
          return ""
        }
        console.error("[Gemma4] Chat error:", error)
        updateStatus("error")
        throw error
      }
    },
    [updateStatus],
  )

  const chatStream = useCallback(async function* (
    messages: ChatMessage[],
    systemPrompt?: string,
    imageDataUrl?: string,
    options?: { maxTokens?: number },
  ): AsyncGenerator<string, void, unknown> {
    const processor = processorRef.current
    const model = modelRef.current

    if (!processor || !model) {
      throw new Error('Gemma 4 not loaded')
    }

    updateStatus('generating')
    abortRef.current = false

    try {
      const chatMessages = formatGemma4Messages(messages, systemPrompt, imageDataUrl)

      const prompt = processor.apply_chat_template(chatMessages as any, {
        enable_thinking: false,
        add_generation_prompt: true,
        tokenize: false,
      })

      const { RawImage, TextStreamer } = await import('@huggingface/transformers')
      const image = imageDataUrl
        ? await RawImage.fromURL(imageDataUrl)
        : null

      const inputs = await processor(prompt, image, null, { add_special_tokens: false })

      if (abortRef.current) {
        updateStatus('ready')
        return
      }

      let rawStream = ''
      let previousCleaned = ''
      const queue: string[] = []
      let streamDone = false
      let streamError: unknown = null
      let notify: (() => void) | null = null

      const streamer = new TextStreamer(processor.tokenizer as never, {
        skip_prompt: true,
        skip_special_tokens: false,
        callback_function: (text: string) => {
          if (abortRef.current) return
          rawStream += text
          const cleaned = extractGemma4Response(rawStream)
          const delta = cleaned.slice(previousCleaned.length)
          previousCleaned = cleaned
          if (delta) {
            queue.push(delta)
            notify?.()
            notify = null
          }
        },
      })

      const generatePromise = model
        .generate({
          ...inputs,
          max_new_tokens: options?.maxTokens ?? 128,
          do_sample: false,
          streamer,
        })
        .then(() => {
          streamDone = true
          updateStatus('ready')
          notify?.()
          notify = null
        })
        .catch((error) => {
          streamError = error
          streamDone = true
          notify?.()
          notify = null
        })

      while (!streamDone || queue.length > 0) {
        if (abortRef.current) break

        if (queue.length > 0) {
          yield queue.shift()!
          continue
        }

        if (streamError) {
          throw streamError
        }

        await new Promise<void>((resolve) => {
          notify = resolve
        })
      }

      await generatePromise

      if (abortRef.current) {
        return
      }

      if (!previousCleaned.trim()) {
        throw new Error('Gemma 4 returned an empty response')
      }
    } catch (error) {
      if (abortRef.current) {
        updateStatus('ready')
        return
      }
      console.error('[Gemma4] Stream error:', error)
      updateStatus('error')
      throw error
    }
  }, [updateStatus])

  const abort = useCallback(() => {
    abortRef.current = true
  }, [])

  const unload = useCallback(async () => {
    modelRef.current?.dispose?.()
    processorRef.current = null
    modelRef.current = null
    updateStatus("idle")
    setLoadProgress(0)
  }, [updateStatus])

  return {
    status,
    loadProgress,
    currentModel: status === "ready" ? GEMMA4_MODEL_ID : null,
    isReady: status === "ready",
    isLoading: status === "loading",
    isGenerating: status === "generating",
    loadModel,
    chat,
    chatStream,
    abort,
    unload,
  }
}
