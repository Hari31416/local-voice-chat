const isIOS =
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)

export const DEFAULT_LLM_ID = isIOS ? "qwen-0.5b" : "gemma4"

export type LLMBackend = 'gemma4' | 'webllm' | 'lfm2'

export interface LLMOption {
  id: string
  name: string
  backend: LLMBackend
  webllmId?: string          // MLC model_id, e.g. "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  lfmModelId?: string        // HF repo name for Lfm2, e.g. "LiquidAI/LFM2.5-230M-GGUF"
  supportsVision: boolean
  sizeLabel: string
}

export const LLM_OPTIONS: LLMOption[] = [
  { id: 'gemma4', name: 'Gemma 4 E2B', backend: 'gemma4', supportsVision: true, sizeLabel: '~3.2 GB' },
  { id: 'lfm2-230m', name: 'Liquid LFM 2.5 230M', backend: 'lfm2', lfmModelId: 'LiquidAI/LFM2.5-230M-GGUF', supportsVision: false, sizeLabel: '~230 MB' },
  { id: 'lfm2-350m', name: 'Liquid LFM 2.5 350M', backend: 'lfm2', lfmModelId: 'LiquidAI/LFM2.5-350M-GGUF', supportsVision: false, sizeLabel: '~350 MB' },
  { id: 'qwen-0.5b', name: 'Qwen 0.5B', backend: 'webllm', webllmId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', supportsVision: false, sizeLabel: '~400 MB' },
  { id: 'qwen-1.5b', name: 'Qwen 1.5B', backend: 'webllm', webllmId: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', supportsVision: false, sizeLabel: '~1 GB' },
  { id: 'llama-3.2-1b', name: 'Llama 3.2 1B', backend: 'webllm', webllmId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC', supportsVision: false, sizeLabel: '~700 MB' },
  { id: 'llama-3.2-3b', name: 'Llama 3.2 3B', backend: 'webllm', webllmId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC', supportsVision: false, sizeLabel: '~2 GB' },
]
