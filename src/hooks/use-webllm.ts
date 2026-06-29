import { useState, useRef, useCallback } from 'react'
import type { WebLLMLanguageModel } from '@browser-ai/web-llm'
import {
  createWebLLMModel,
  streamAiSdkToEvents,
  type AiSdkStreamRequest,
} from '@/lib/llm/ai-sdk-stream'
import type { LLMStreamEvent } from '@/lib/llm/parsers'

export type WebLLMStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error'

export const WEBLLM_MODELS = [
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', name: 'Qwen 1.5B', size: '~1GB' },
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen 0.5B', size: '~400MB' },
  { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', name: 'Llama 1B', size: '~700MB' },
  { id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', name: 'Llama 3B', size: '~2GB' },
  { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC', name: 'SmolLM 1.7B', size: '~1GB' },
  { id: 'gemma-2-2b-it-q4f16_1-MLC', name: 'Gemma 2B', size: '~1.5GB' },
] as const

export type WebLLMModel = (typeof WEBLLM_MODELS)[number]['id']

interface UseWebLLMOptions {
  onStatusChange?: (status: WebLLMStatus) => void
  onError?: (error: Error) => void
}

export function useWebLLM(options: UseWebLLMOptions = {}) {
  const { onStatusChange, onError } = options

  const [status, setStatus] = useState<WebLLMStatus>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [currentModel, setCurrentModel] = useState<WebLLMModel | null>(null)

  const modelRef = useRef<WebLLMLanguageModel | null>(null)
  const currentModelRef = useRef<string | null>(null)
  const loadingRef = useRef(false)
  const abortRef = useRef<AbortController | null>(null)

  const updateStatus = useCallback(
    (newStatus: WebLLMStatus) => {
      console.debug('[WebLLM] Status:', newStatus)
      setStatus(newStatus)
      onStatusChange?.(newStatus)
    },
    [onStatusChange],
  )

  const loadModel = useCallback(
    async (modelId: WebLLMModel = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC'): Promise<boolean> => {
      if (loadingRef.current) return false
      if (modelRef.current && currentModelRef.current === modelId) {
        return true
      }

      loadingRef.current = true
      updateStatus('loading')
      setLoadProgress(0)
      modelRef.current = null
      currentModelRef.current = null

      try {
        const model = createWebLLMModel(modelId, (pct) => {
          setLoadProgress(Math.min(100, pct))
        })

        await model.createSessionWithProgress((progress) => {
          const pct = Math.round(progress * 100)
          setLoadProgress(Math.min(100, pct))
        })

        modelRef.current = model
        currentModelRef.current = modelId
        setCurrentModel(modelId)
        setLoadProgress(100)
        updateStatus('ready')
        console.log(`[WebLLM] Model ${modelId} loaded successfully`)
        return true
      } catch (error) {
        console.error('[WebLLM] Load error:', error)
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
    [onError, updateStatus],
  )

  const chatStreamEvents = useCallback(
    async function* (request: AiSdkStreamRequest): AsyncGenerator<LLMStreamEvent, void, unknown> {
      const model = modelRef.current
      if (!model) {
        throw new Error('WebLLM not loaded')
      }

      updateStatus('generating')
      abortRef.current = new AbortController()

      try {
        yield* streamAiSdkToEvents(
          model,
          'web-llm',
          request,
          abortRef.current.signal,
        )
      } catch (error) {
        if (abortRef.current.signal.aborted) {
          updateStatus('ready')
          return
        }
        console.error('[WebLLM] Stream error:', error)
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

  const unload = useCallback(async () => {
    abortRef.current?.abort()
    abortRef.current = null
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
    unload,
    models: WEBLLM_MODELS,
  }
}
