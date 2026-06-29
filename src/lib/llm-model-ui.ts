import {
  DEFAULT_LLM_ID,
  getLLMOption as getCatalogLLMOption,
  hasLLMCapability,
  type LLMBackend,
  type LLMEngineType,
  type LLMOption,
} from "@/lib/llm-models"

export type LLMFilter = "all" | "recommended" | "vision" | "thinking" | "light" | "mobile"

export const LLM_BACKEND_META: Record<
  LLMBackend,
  { label: string; description: string; accent: string; chip: string }
> = {
  qwen35: {
    label: "Qwen 3.5",
    description: "Vision · Transformers.js · WebGPU",
    accent: "border-violet-500/40 bg-violet-500/10",
    chip: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  },
  gemma4: {
    label: "Gemma 4",
    description: "Flagship · custom WebGPU kernels",
    accent: "border-sky-500/40 bg-sky-500/10",
    chip: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  },
  lfm2: {
    label: "Liquid LFM",
    description: "Ultra-fast hybrid · WebGPU kernels",
    accent: "border-cyan-500/40 bg-cyan-500/10",
    chip: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  },
  webllm: {
    label: "WebLLM",
    description: "Lightweight text-only · MLC",
    accent: "border-amber-500/40 bg-amber-500/10",
    chip: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  },
}

export const LLM_FILTER_OPTIONS: { id: LLMFilter; label: string }[] = [
  { id: "recommended", label: "Recommended" },
  { id: "vision", label: "Vision" },
  { id: "thinking", label: "Thinking" },
  { id: "light", label: "Under 1 GB" },
  { id: "mobile", label: "Mobile OK" },
  { id: "all", label: "All" },
]

const BACKEND_ORDER: LLMBackend[] = ["qwen35", "gemma4", "lfm2", "webllm"]

const MOBILE_MAX_SIZE_MB = 1536 // ~1.5 GB — typical mobile tab memory limit

export const LLM_ENGINE_META: Record<LLMEngineType, { label: string; description: string }> = {
  "transformers-js": {
    label: "Transformers.js",
    description: "HF Transformers.js on WebGPU",
  },
  "gemma4-kernel": {
    label: "Gemma kernels",
    description: "Precomputed custom WebGPU kernels",
  },
  "lfm2-kernel": {
    label: "LFM kernels",
    description: "Precomputed hybrid WebGPU kernels",
  },
  webllm: {
    label: "WebLLM",
    description: "MLC runtime on WebGPU",
  },
}

export function parseModelSizeMB(sizeLabel: string): number {
  const value = parseFloat(sizeLabel.replace(/[~ MBGB]/g, "").trim())
  if (sizeLabel.includes("GB")) return value * 1024
  return value
}

/** Models likely to run on mobile browsers without crashing the tab. */
export function isMobileFriendlyModel(opt: LLMOption): boolean {
  return opt.sizeMb < MOBILE_MAX_SIZE_MB || opt.requirements.includes("mobile-friendly")
}

export function isHeavyForMobile(opt: LLMOption, isMobile: boolean): boolean {
  if (!isMobile) return false
  return !isMobileFriendlyModel(opt)
}

export function matchesLLMFilter(opt: LLMOption, filter: LLMFilter, _isMobile: boolean): boolean {
  switch (filter) {
    case "recommended":
      return isRecommendedLLM(opt) || opt.recommendedFor.includes("mobile") || opt.recommendedFor.includes("vision")
    case "vision":
      return hasLLMCapability(opt, "vision")
    case "thinking":
      return hasLLMCapability(opt, "thinking")
    case "light":
      return opt.sizeMb < 1024
    case "mobile":
      return isMobileFriendlyModel(opt)
    default:
      return true
  }
}

export function groupLLMOptions(options: LLMOption[]): { backend: LLMBackend; opts: LLMOption[] }[] {
  const map = new Map<LLMBackend, LLMOption[]>()
  for (const opt of options) {
    if (!map.has(opt.backend)) map.set(opt.backend, [])
    map.get(opt.backend)!.push(opt)
  }
  return BACKEND_ORDER.filter((b) => map.has(b)).map((backend) => ({
    backend,
    opts: map.get(backend)!,
  }))
}

export function filterLLMOptions(
  options: LLMOption[],
  filter: LLMFilter,
  isMobile: boolean,
): LLMOption[] {
  return options.filter((opt) => matchesLLMFilter(opt, filter, isMobile))
}

export function getLLMOption(id: string): LLMOption {
  return getCatalogLLMOption(id)
}

export function isRecommendedLLM(opt: LLMOption): boolean {
  return opt.id === DEFAULT_LLM_ID
}

export function sizeBarPercent(sizeLabel: string): number {
  const mb = parseModelSizeMB(sizeLabel)
  return Math.min(100, Math.round((mb / 4096) * 100))
}

export function sizeBarPercentForOption(opt: LLMOption): number {
  return Math.min(100, Math.round((opt.sizeMb / 4096) * 100))
}

export function getCapabilityLabels(opt: LLMOption): string[] {
  const labels = ["Text"]
  if (hasLLMCapability(opt, "vision")) labels.push("Vision")
  if (hasLLMCapability(opt, "thinking")) labels.push("Thinking")
  return labels
}

export function getModelSubtitle(opt: LLMOption): string {
  const engine = LLM_ENGINE_META[opt.engineType].label
  const suffix = opt.variantLabel ? ` · ${opt.variantLabel}` : ""
  return `${engine}${suffix}`
}
