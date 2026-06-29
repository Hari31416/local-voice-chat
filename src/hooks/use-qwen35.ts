import { useState, useRef, useCallback } from 'react'
import type { TransformersJSLanguageModel } from '@browser-ai/transformers-js'
import {
  createTransformersModel,
  streamAiSdkToEvents,
  type AiSdkStreamRequest,
} from '@/lib/llm/ai-sdk-stream'
import { isLfmOnnxModel, patchLfmTransformersChatTemplate } from '@/lib/llm/lfm-transformers'
import { disposeTransformersJSModel } from '@/lib/llm/dispose-model'
import type { LLMStreamEvent } from '@/lib/llm/parsers'

export const QWEN35_MODELS = {
  'qwen35-0.8b': 'onnx-community/Qwen3.5-0.8B-ONNX-OPT',
  'qwen35-2b': 'onnx-community/Qwen3.5-2B-ONNX-OPT',
  'qwen35-4b': 'onnx-community/Qwen3.5-4B-ONNX-OPT',
} as const

export type Qwen35ModelId = string

export type Qwen35Status = 'idle' | 'loading' | 'ready' | 'generating' | 'error'

interface UseQwen35Options {
  onStatusChange?: (status: Qwen35Status) => void
  onError?: (error: Error) => void
  onLoadMessage?: (message: string) => void
}

export function useQwen35(options: UseQwen35Options = {}) {
  const { onStatusChange, onError, onLoadMessage } = options

  const [status, setStatus] = useState<Qwen35Status>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [currentModel, setCurrentModel] = useState<string | null>(null)

  const modelRef = useRef<TransformersJSLanguageModel | null>(null)
  const currentModelRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const updateStatus = useCallback(
    (newStatus: Qwen35Status) => {
      console.debug('[TransformersEngine] Status:', newStatus)
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange],
  )

  const loadModel = useCallback(
    async (modelId: string): Promise<boolean> => {
      if (loadingRef.current) return false
      if (modelRef.current && currentModelRef.current === modelId) {
        return true
      }

      loadingRef.current = true
      updateStatus('loading')
      setLoadProgress(0)

      const previous = modelRef.current
      if (previous) {
        await disposeTransformersJSModel(previous)
      }
      modelRef.current = null
      currentModelRef.current = null

      try {
        const isHeavyVision =
          modelId.toLowerCase().includes('gemma-4') ||
          modelId.toLowerCase().includes('gemma_4')

        onLoadMessage?.('Downloading model weights...')
        const model = createTransformersModel(modelId, (pct) => {
          const capped = Math.min(99, pct)
          setLoadProgress(capped)
          if (capped >= 95) {
            onLoadMessage?.(
              isHeavyVision
                ? 'Initializing WebGPU session (Gemma 4 can take 1–3 min, ~6–8 GB RAM)...'
                : 'Initializing WebGPU session...',
            )
          }
        })

        await model.createSessionWithProgress((progress) => {
          const pct = Math.round(progress * 100)
          setLoadProgress(Math.min(99, pct))
          if (pct >= 95) {
            onLoadMessage?.(
              isHeavyVision
                ? 'Initializing WebGPU session (Gemma 4 can take 1–3 min, ~6–8 GB RAM)...'
                : 'Initializing WebGPU session...',
            )
          }
        })

        modelRef.current = model
        currentModelRef.current = modelId
        if (isLfmOnnxModel(modelId)) {
          patchLfmTransformersChatTemplate(model)
        }
        setCurrentModel(modelId)
        setLoadProgress(100)
        updateStatus('ready')
        console.log(`[TransformersEngine] Model ${modelId} loaded successfully`)
        return true
      } catch (error) {
        console.error('[TransformersEngine] Load error:', error)
        modelRef.current = null
        currentModelRef.current = null
        setCurrentModel(null)
        updateStatus('error')
        onError?.(error instanceof Error ? error : new Error(String(error)))
        return false
      } finally {
        loadingRef.current = false
      }
    },
    [onError, onLoadMessage, updateStatus],
  )

  const chatStreamEvents = useCallback(
    async function* (request: AiSdkStreamRequest): AsyncGenerator<LLMStreamEvent, void, unknown> {
      const model = modelRef.current
      if (!model) {
        throw new Error('Model not loaded')
      }

      updateStatus('generating')
      abortRef.current = new AbortController()

      try {
        yield* streamAiSdkToEvents(
          model,
          'transformers-js',
          request,
          abortRef.current.signal,
        )
      } catch (error) {
        if (abortRef.current.signal.aborted) {
          updateStatus('ready')
          return
        }
        console.error('[TransformersEngine] Stream error:', error)
        updateStatus('error')
        throw error
      } finally {
        abortRef.current = null
        updateStatus('ready')
      }
    },
    [updateStatus],
  )

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const resetSession = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const unload = useCallback(async () => {
    abortRef.current?.abort()
    abortRef.current = null
    const previous = modelRef.current
    if (previous) {
      await disposeTransformersJSModel(previous)
    }
    modelRef.current = null
    currentModelRef.current = null
    setCurrentModel(null)
    updateStatus('idle')
    setLoadProgress(0)
  }, [updateStatus])

  return {
    status,
    loadProgress,
    currentModel,
    isReady: status === 'ready',
    isLoading: status === 'loading',
    isGenerating: status === 'generating',
    loadModel,
    chatStreamEvents,
    abort,
    resetSession,
    unload,
  }
}
