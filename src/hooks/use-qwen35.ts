import { useState, useRef, useCallback } from "react"

export const QWEN35_MODELS = {
  "qwen35-0.8b": "onnx-community/Qwen3.5-0.8B-ONNX-OPT",
  "qwen35-2b": "onnx-community/Qwen3.5-2B-ONNX-OPT",
  "qwen35-4b": "onnx-community/Qwen3.5-4B-ONNX-OPT",
} as const

export type Qwen35ModelId = (typeof QWEN35_MODELS)[keyof typeof QWEN35_MODELS]

export type Qwen35Status = "idle" | "loading" | "ready" | "generating" | "error"

interface UseQwen35Options {
  onStatusChange?: (status: Qwen35Status) => void
  onError?: (error: Error) => void
}

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

type LoadedQwen35 = {
  processor: Awaited<ReturnType<typeof import("@huggingface/transformers")["AutoProcessor"]["from_pretrained"]>>
  model: Awaited<
    ReturnType<
      typeof import("@huggingface/transformers")["Qwen3_5ForConditionalGeneration"]["from_pretrained"]
    >
  >
  stoppingCriteria: InstanceType<
    typeof import("@huggingface/transformers")["InterruptableStoppingCriteria"]
  >
}

type GenerateResult = {
  sequences?: { slice: (start: null, end: [number, null]) => unknown }
}

type ConversationMessage = {
  role: string
  content: string | Array<{ type: string; text?: string }>
}

const THINK_CLOSE = "<" + "/thinking>"

/** Strip Qwen 3.5 thinking markup and special tokens from streamed output. */
export function extractQwen35Response(text: string): string {
  const withoutThinking = text.includes(THINK_CLOSE)
    ? text.slice(text.indexOf(THINK_CLOSE) + THINK_CLOSE.length)
    : text

  return withoutThinking
    .replace(/<\|im_end\|>/g, "")
    .replace(/^[\s\n]+/, "")
    .trim()
}

function buildConversation(
  messages: ChatMessage[],
  systemPrompt: string,
  imageDataUrl?: string,
): ConversationMessage[] {
  const conversation: ConversationMessage[] = [{ role: "system", content: systemPrompt }]

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const isLastUserWithImage =
      msg.role === "user" && i === messages.length - 1 && Boolean(imageDataUrl)

    if (isLastUserWithImage) {
      conversation.push({
        role: "user",
        content: [
          { type: "image" },
          { type: "text", text: msg.content || " " },
        ],
      })
    } else if (msg.role === "user" || msg.role === "assistant") {
      conversation.push({ role: msg.role, content: msg.content })
    }
  }

  return conversation
}

async function prepareInputs(
  processor: LoadedQwen35["processor"],
  messages: ChatMessage[],
  systemPrompt: string,
  imageDataUrl?: string,
) {
  const conversation = buildConversation(messages, systemPrompt, imageDataUrl)
  const prompt = processor.apply_chat_template(conversation, {
    add_generation_prompt: true,
  })

  if (imageDataUrl) {
    const rawImage = await loadRawImage(imageDataUrl)
    const inputs = await processor(prompt, rawImage)
    const promptLength = inputs.input_ids?.dims?.at(-1) ?? 0
    return { inputs, promptLength }
  }

  const inputs = await processor(prompt)
  const promptLength = inputs.input_ids?.dims?.at(-1) ?? 0
  return { inputs, promptLength }
}

function decodeGeneratedText(
  processor: LoadedQwen35["processor"],
  sequences: { slice: (start: null, end: [number, null]) => unknown },
  promptLength: number,
): string {
  const decoded = processor.batch_decode(
    sequences.slice(null, [promptLength, null]) as Parameters<
      LoadedQwen35["processor"]["batch_decode"]
    >[0],
    {
      skip_special_tokens: true,
    },
  )
  return extractQwen35Response(decoded[0] ?? "")
}

async function loadRawImage(dataUrl: string) {
  const { RawImage } = await import("@huggingface/transformers")
  const raw = await RawImage.read(dataUrl)
  return raw.resize(448, 448)
}

type ProgressInfo = {
  status?: string
  progress?: number
  loaded?: number
  total?: number
}

function mapPhaseProgress(progress: number, start: number, span: number): number {
  const fraction = Math.min(1, Math.max(0, progress / 100))
  return Math.min(100, start + Math.round(fraction * span))
}

function createPhaseProgressHandler(
  onProgress: (pct: number) => void,
  start: number,
  span: number,
) {
  return (info: ProgressInfo) => {
    if (
      (info.status === "progress" || info.status === "progress_total") &&
      info.progress !== undefined
    ) {
      onProgress(mapPhaseProgress(info.progress, start, span))
      return
    }

    if (info.status === "done") {
      onProgress(Math.min(100, start + span))
    }
  }
}

export function useQwen35(options: UseQwen35Options = {}) {
  const { onStatusChange, onError } = options

  const [status, setStatus] = useState<Qwen35Status>("idle")
  const [loadProgress, setLoadProgress] = useState(0)
  const [currentModel, setCurrentModel] = useState<Qwen35ModelId | null>(null)

  const loadedRef = useRef<LoadedQwen35 | null>(null)
  const currentModelRef = useRef<Qwen35ModelId | null>(null)
  const loadingRef = useRef(false)
  const abortRef = useRef(false)

  const updateStatus = useCallback(
    (newStatus: Qwen35Status) => {
      console.debug("[Qwen35] Status:", newStatus)
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange],
  )

  const loadModel = useCallback(
    async (modelId: Qwen35ModelId): Promise<boolean> => {
      if (loadingRef.current) return false
      if (loadedRef.current && currentModelRef.current === modelId) {
        return true
      }

      if (loadedRef.current) {
        loadedRef.current.model.dispose?.()
        loadedRef.current = null
      }

      loadingRef.current = true
      updateStatus("loading")
      setLoadProgress(0)

      try {
        const transformers = await import("@huggingface/transformers")
        const {
          AutoProcessor,
          Qwen3_5ForConditionalGeneration,
          InterruptableStoppingCriteria,
        } = transformers

        const onProgress = (pct: number) => {
          setLoadProgress(Math.min(100, pct))
        }

        const processor = await AutoProcessor.from_pretrained(modelId, {
          progress_callback: createPhaseProgressHandler(onProgress, 0, 20),
        })

        const model = await Qwen3_5ForConditionalGeneration.from_pretrained(modelId, {
          dtype: {
            embed_tokens: "q4",
            vision_encoder: "fp16",
            decoder_model_merged: "q4",
          },
          device: "webgpu",
          progress_callback: createPhaseProgressHandler(onProgress, 20, 80),
        })

        loadedRef.current = {
          processor,
          model,
          stoppingCriteria: new InterruptableStoppingCriteria(),
        }
        currentModelRef.current = modelId
        setCurrentModel(modelId)
        setLoadProgress(100)
        updateStatus("ready")
        console.log(`[Qwen35] Model ${modelId} loaded successfully`)
        return true
      } catch (error) {
        console.error("[Qwen35] Load error:", error)
        loadedRef.current = null
        currentModelRef.current = null
        setCurrentModel(null)
        updateStatus("error")
        onError?.(error instanceof Error ? error : new Error(String(error)))
        return false
      } finally {
        loadingRef.current = false
      }
    },
    [onError, updateStatus],
  )

  const chatStream = useCallback(
    async function* (
      messages: ChatMessage[],
      systemPrompt?: string,
      imageDataUrl?: string,
      options?: { maxTokens?: number },
    ): AsyncGenerator<string, void, unknown> {
      const loaded = loadedRef.current
      if (!loaded) {
        throw new Error("Qwen 3.5 not loaded")
      }

      updateStatus("generating")
      abortRef.current = false
      loaded.stoppingCriteria.reset()

      const maxNewTokens = options?.maxTokens ?? 512
      const system = systemPrompt ?? "You are a helpful assistant."

      try {
        const { inputs, promptLength } = await prepareInputs(
          loaded.processor,
          messages,
          system,
          imageDataUrl,
        )

        let rawStream = ""
        let previousCleaned = ""
        let streamDone = false
        let streamError: Error | null = null
        let generateResult: GenerateResult | null = null
        const pending: string[] = []
        let notify: (() => void) | null = null

        const wake = () => {
          notify?.()
          notify = null
        }

        const pushDelta = (cleaned: string) => {
          const delta = cleaned.slice(previousCleaned.length)
          previousCleaned = cleaned
          if (delta) {
            pending.push(delta)
            wake()
          }
        }

        const tokenizer = loaded.processor.tokenizer
        if (!tokenizer) {
          throw new Error("Qwen 3.5 processor tokenizer unavailable")
        }

        const streamer = new (
          await import("@huggingface/transformers")
        ).TextStreamer(tokenizer, {
          skip_prompt: true,
          skip_special_tokens: false,
          callback_function: (token: string) => {
            if (abortRef.current) return
            rawStream += token
            pushDelta(extractQwen35Response(rawStream))
          },
        })

        const generatePromise = loaded.model
          .generate({
            ...inputs,
            max_new_tokens: maxNewTokens,
            do_sample: true,
            temperature: 1.0,
            top_p: 1.0,
            top_k: 20,
            streamer,
            stopping_criteria: loaded.stoppingCriteria,
            return_dict_in_generate: true,
          })
          .then((result) => {
            generateResult = result as GenerateResult
            streamDone = true
            wake()
          })
          .catch((error: unknown) => {
            streamError = error instanceof Error ? error : new Error(String(error))
            streamDone = true
            wake()
          })

        while (!streamDone || pending.length > 0) {
          if (pending.length === 0) {
            await new Promise<void>((resolve) => {
              notify = resolve
            })
            if (streamError) throw streamError
            continue
          }
          yield pending.shift()!
        }

        await generatePromise

        if (abortRef.current) {
          updateStatus("ready")
          return
        }

        pushDelta(extractQwen35Response(rawStream))

        while (pending.length > 0) {
          yield pending.shift()!
        }

        const sequences = (generateResult as GenerateResult | null)?.sequences
        if (!previousCleaned && sequences) {
          const decoded = decodeGeneratedText(
            loaded.processor,
            sequences,
            promptLength || inputs.input_ids?.dims?.at(-1) || 0,
          )
          if (decoded) {
            yield decoded
          }
        }

        updateStatus("ready")
      } catch (error) {
        if (abortRef.current) {
          updateStatus("ready")
          return
        }
        console.error("[Qwen35] Stream error:", error)
        updateStatus("error")
        throw error
      }
    },
    [updateStatus],
  )

  const abort = useCallback(() => {
    abortRef.current = true
    loadedRef.current?.stoppingCriteria.interrupt()
  }, [])

  const resetSession = useCallback(() => {
    abortRef.current = false
    loadedRef.current?.stoppingCriteria.reset()
  }, [])

  const unload = useCallback(async () => {
    loadedRef.current?.model.dispose?.()
    loadedRef.current = null
    currentModelRef.current = null
    setCurrentModel(null)
    updateStatus("idle")
    setLoadProgress(0)
  }, [updateStatus])

  return {
    status,
    loadProgress,
    currentModel,
    isReady: status === "ready",
    isLoading: status === "loading",
    isGenerating: status === "generating",
    loadModel,
    chatStream,
    abort,
    resetSession,
    unload,
  }
}
