const isIOS =
  typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)

export const DEFAULT_LLM_ID = isIOS ? "qwen-0.5b" : "qwen35-0.8b"
export type LLMBackend = 'gemma4' | 'webllm' | 'lfm2' | 'qwen35'
export type LLMEngineType = 'gemma4-kernel' | 'lfm2-kernel' | 'transformers-js' | 'webllm'
export type LLMCapability = 'text' | 'vision' | 'thinking' | 'streaming'
export type LLMRequirement = 'webgpu' | 'high-memory' | 'mobile-friendly'

export interface LLMOption {
  id: string
  logicalModelId: string
  name: string
  family: 'gemma' | 'qwen' | 'llama' | 'lfm'
  variantLabel?: string
  backend: LLMBackend
  engineType: LLMEngineType
  webllmId?: string          // MLC model_id, e.g. "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  lfmModelId?: string        // HF repo name for Lfm2, e.g. "LiquidAI/LFM2.5-230M-GGUF"
  qwen35ModelId?: string     // HF repo for Qwen 3.5 ONNX, e.g. "onnx-community/Qwen3.5-0.8B-ONNX-OPT"
  capabilities: Record<LLMCapability, boolean>
  requirements: LLMRequirement[]
  recommendedFor: ('default' | 'mobile' | 'vision' | 'speed' | 'quality')[]
  sizeLabel: string
  sizeMb: number
  tokenLimits: { voice: number; text: number }
}

export const LLM_OPTIONS: LLMOption[] = [
  {
    id: 'qwen35-0.8b',
    logicalModelId: 'qwen35-0.8b',
    name: 'Qwen 3.5 0.8B',
    family: 'qwen',
    backend: 'qwen35',
    engineType: 'transformers-js',
    qwen35ModelId: 'onnx-community/Qwen3.5-0.8B-ONNX-OPT',
    capabilities: { text: true, vision: true, thinking: true, streaming: true },
    requirements: ['webgpu', 'mobile-friendly'],
    recommendedFor: ['default', 'mobile', 'vision'],
    sizeLabel: '~800 MB',
    sizeMb: 800,
    tokenLimits: { voice: 256, text: 1024 },
  },
  {
    id: 'qwen35-2b',
    logicalModelId: 'qwen35-2b',
    name: 'Qwen 3.5 2B',
    family: 'qwen',
    backend: 'qwen35',
    engineType: 'transformers-js',
    qwen35ModelId: 'onnx-community/Qwen3.5-2B-ONNX-OPT',
    capabilities: { text: true, vision: true, thinking: true, streaming: true },
    requirements: ['webgpu', 'high-memory'],
    recommendedFor: ['vision', 'quality'],
    sizeLabel: '~2 GB',
    sizeMb: 2048,
    tokenLimits: { voice: 256, text: 1536 },
  },
  {
    id: 'qwen35-4b',
    logicalModelId: 'qwen35-4b',
    name: 'Qwen 3.5 4B',
    family: 'qwen',
    backend: 'qwen35',
    engineType: 'transformers-js',
    qwen35ModelId: 'onnx-community/Qwen3.5-4B-ONNX-OPT',
    capabilities: { text: true, vision: true, thinking: true, streaming: true },
    requirements: ['webgpu', 'high-memory'],
    recommendedFor: ['vision', 'quality'],
    sizeLabel: '~4 GB',
    sizeMb: 4096,
    tokenLimits: { voice: 256, text: 2048 },
  },
  {
    id: 'gemma-4-e2b-kernel',
    logicalModelId: 'gemma-4-e2b',
    name: 'Gemma 4 E2B',
    family: 'gemma',
    variantLabel: 'custom kernels',
    backend: 'gemma4',
    engineType: 'gemma4-kernel',
    capabilities: { text: true, vision: false, thinking: true, streaming: true },
    requirements: ['webgpu', 'high-memory'],
    recommendedFor: ['quality'],
    sizeLabel: '~3.2 GB',
    sizeMb: 3277,
    tokenLimits: { voice: 128, text: 512 },
  },
  {
    id: 'lfm2-230m',
    logicalModelId: 'lfm2-230m',
    name: 'Liquid LFM 2.5 230M',
    family: 'lfm',
    backend: 'lfm2',
    engineType: 'lfm2-kernel',
    lfmModelId: 'LiquidAI/LFM2.5-230M-GGUF',
    capabilities: { text: true, vision: false, thinking: false, streaming: true },
    requirements: ['webgpu', 'mobile-friendly'],
    recommendedFor: ['mobile', 'speed'],
    sizeLabel: '~230 MB',
    sizeMb: 230,
    tokenLimits: { voice: 192, text: 768 },
  },
  {
    id: 'lfm2-350m',
    logicalModelId: 'lfm2-350m',
    name: 'Liquid LFM 2.5 350M',
    family: 'lfm',
    backend: 'lfm2',
    engineType: 'lfm2-kernel',
    lfmModelId: 'LiquidAI/LFM2.5-350M-GGUF',
    capabilities: { text: true, vision: false, thinking: false, streaming: true },
    requirements: ['webgpu', 'mobile-friendly'],
    recommendedFor: ['mobile', 'speed'],
    sizeLabel: '~350 MB',
    sizeMb: 350,
    tokenLimits: { voice: 256, text: 1024 },
  },
  {
    id: 'qwen-0.5b',
    logicalModelId: 'qwen2.5-0.5b',
    name: 'Qwen 0.5B',
    family: 'qwen',
    backend: 'webllm',
    engineType: 'webllm',
    webllmId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    capabilities: { text: true, vision: false, thinking: false, streaming: true },
    requirements: ['webgpu', 'mobile-friendly'],
    recommendedFor: ['mobile', 'speed'],
    sizeLabel: '~400 MB',
    sizeMb: 400,
    tokenLimits: { voice: 192, text: 768 },
  },
  {
    id: 'llama-3.2-1b',
    logicalModelId: 'llama-3.2-1b',
    name: 'Llama 3.2 1B',
    family: 'llama',
    backend: 'webllm',
    engineType: 'webllm',
    webllmId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    capabilities: { text: true, vision: false, thinking: false, streaming: true },
    requirements: ['webgpu', 'mobile-friendly'],
    recommendedFor: ['mobile'],
    sizeLabel: '~700 MB',
    sizeMb: 700,
    tokenLimits: { voice: 256, text: 1024 },
  },
  {
    id: 'gemma-2-2b-webllm',
    logicalModelId: 'gemma-2-2b',
    name: 'Gemma 2B',
    family: 'gemma',
    variantLabel: 'WebLLM',
    backend: 'webllm',
    engineType: 'webllm',
    webllmId: 'gemma-2-2b-it-q4f16_1-MLC',
    capabilities: { text: true, vision: false, thinking: false, streaming: true },
    requirements: ['webgpu'],
    recommendedFor: ['quality'],
    sizeLabel: '~1.5 GB',
    sizeMb: 1536,
    tokenLimits: { voice: 256, text: 1024 },
  },
  {
    id: 'llama-3.2-3b',
    logicalModelId: 'llama-3.2-3b',
    name: 'Llama 3.2 3B',
    family: 'llama',
    backend: 'webllm',
    engineType: 'webllm',
    webllmId: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    capabilities: { text: true, vision: false, thinking: false, streaming: true },
    requirements: ['webgpu', 'high-memory'],
    recommendedFor: ['quality'],
    sizeLabel: '~2 GB',
    sizeMb: 2048,
    tokenLimits: { voice: 256, text: 1536 },
  },
]

export function getLLMOption(id: string): LLMOption {
  return LLM_OPTIONS.find((o) => o.id === id) ?? LLM_OPTIONS[0]
}

export function hasLLMCapability(option: LLMOption, capability: LLMCapability): boolean {
  return option.capabilities[capability] === true
}

export function getLLMEngineModelId(option: LLMOption): string {
  if (option.backend === 'gemma4') return option.id
  if (option.backend === 'lfm2') return option.lfmModelId ?? ''
  if (option.backend === 'qwen35') return option.qwen35ModelId ?? ''
  return option.webllmId ?? ''
}

export function getLLMVariants(logicalModelId: string): LLMOption[] {
  return LLM_OPTIONS.filter((option) => option.logicalModelId === logicalModelId)
}

export function getLLMMaxTokens(option: LLMOption, ttsEnabled: boolean): number {
  return ttsEnabled ? option.tokenLimits.voice : option.tokenLimits.text
}
