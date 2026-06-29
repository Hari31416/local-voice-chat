import { DEFAULT_LLM_ID, type LLMBackend, type LLMOption, LLM_OPTIONS } from "@/lib/llm-models"

export type LLMFilter = "all" | "vision" | "light" | "mobile"

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
  { id: "all", label: "All" },
  { id: "vision", label: "Vision" },
  { id: "light", label: "Under 1 GB" },
  { id: "mobile", label: "Mobile OK" },
]

const BACKEND_ORDER: LLMBackend[] = ["qwen35", "gemma4", "lfm2", "webllm"]

const MOBILE_MAX_SIZE_MB = 1536 // ~1.5 GB — typical mobile tab memory limit

export function parseModelSizeMB(sizeLabel: string): number {
  const value = parseFloat(sizeLabel.replace(/[~ MBGB]/g, "").trim())
  if (sizeLabel.includes("GB")) return value * 1024
  return value
}

/** Models likely to run on mobile browsers without crashing the tab. */
export function isMobileFriendlyModel(opt: LLMOption): boolean {
  return parseModelSizeMB(opt.sizeLabel) < MOBILE_MAX_SIZE_MB
}

export function isHeavyForMobile(opt: LLMOption, isMobile: boolean): boolean {
  if (!isMobile) return false
  return !isMobileFriendlyModel(opt)
}

export function matchesLLMFilter(opt: LLMOption, filter: LLMFilter, _isMobile: boolean): boolean {
  switch (filter) {
    case "vision":
      return opt.supportsVision
    case "light":
      return parseModelSizeMB(opt.sizeLabel) < 1024
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
  return LLM_OPTIONS.find((o) => o.id === id) ?? LLM_OPTIONS[0]
}

export function isRecommendedLLM(opt: LLMOption): boolean {
  return opt.id === DEFAULT_LLM_ID
}

export function sizeBarPercent(sizeLabel: string): number {
  const mb = parseModelSizeMB(sizeLabel)
  return Math.min(100, Math.round((mb / 4096) * 100))
}
