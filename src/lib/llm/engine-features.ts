import type { LLMEngineType, LLMModel, LLMVariant } from '@/lib/llm-models'

export type LLMEngineFeature = 'nativeThinking' | 'nativeTools'

export const ENGINE_FEATURES: Record<LLMEngineType, readonly LLMEngineFeature[]> = {
  'transformers-js': ['nativeThinking'],
  webllm: ['nativeThinking', 'nativeTools'],
  'gemma4-kernel': [],
  'lfm2-kernel': [],
}

export function engineHasNativeFeature(
  engine: LLMEngineType,
  feature: LLMEngineFeature,
): boolean {
  return ENGINE_FEATURES[engine].includes(feature)
}

export function modelHasNativeThinking(model: LLMModel): boolean {
  return model.variants.some(
    (v) => v.capabilities.thinking && engineHasNativeFeature(v.engine, 'nativeThinking'),
  )
}

export function variantHasNativeThinking(variant: LLMVariant): boolean {
  return (
    variant.capabilities.thinking &&
    engineHasNativeFeature(variant.engine, 'nativeThinking')
  )
}

export function variantHasParsedThinking(variant: LLMVariant): boolean {
  return variant.capabilities.thinking && variant.engine === 'gemma4-kernel'
}

export function variantHasNativeTools(variant: LLMVariant): boolean {
  return engineHasNativeFeature(variant.engine, 'nativeTools')
}

export function variantSupportsTools(variant: LLMVariant): boolean {
  return (
    variantHasNativeTools(variant) ||
    variant.engine === 'transformers-js' ||
    variant.engine === 'gemma4-kernel' ||
    variant.engine === 'lfm2-kernel'
  )
}

export function variantUsesPromptToolFallback(variant: LLMVariant): boolean {
  return variantSupportsTools(variant) && !variantHasNativeTools(variant)
}

export function variantHasParsedTools(variant: LLMVariant): boolean {
  return variantUsesPromptToolFallback(variant)
}

export function variantSupportsThinkingToggle(variant: LLMVariant): boolean {
  return variant.capabilities.thinking
}

export function getThinkingToggleHint(variant: LLMVariant): string | null {
  if (!variant.capabilities.thinking) return null
  if (variantHasNativeThinking(variant)) {
    return 'Reasoning is streamed natively by the engine.'
  }
  if (variantHasParsedThinking(variant)) {
    return 'Reasoning is parsed from model output tags. Switch to Transformers.js for native reasoning and vision.'
  }
  return null
}
