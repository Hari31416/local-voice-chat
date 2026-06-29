import { AlertTriangle, Info, X } from "lucide-react"
import type { LLMOption } from "@/lib/llm-models"
import { IS_IOS } from "@/lib/voice-agent-constants"

interface WarningBannersProps {
  isSecure: boolean
  webgpuStatus: string
  isMobile: boolean
  selectedOption: LLMOption
  dismissedWarnings: string[]
  onDismiss: (id: string) => void
}

export function WarningBanners({
  isSecure,
  webgpuStatus,
  isMobile,
  selectedOption,
  dismissedWarnings,
  onDismiss,
}: WarningBannersProps) {
  const showWebGpuWarning =
    webgpuStatus !== "checking..." && webgpuStatus !== "available" && !dismissedWarnings.includes("webgpu")

  const showMemoryWarning =
    isMobile &&
    (selectedOption.backend === "gemma4" ||
      (selectedOption.backend === "qwen35" &&
        (selectedOption.id === "qwen35-2b" || selectedOption.id === "qwen35-4b")) ||
      (selectedOption.webllmId &&
        (selectedOption.webllmId.includes("3B") || selectedOption.webllmId.includes("1.5B")))) &&
    !dismissedWarnings.includes("memory")

  if (
    (isSecure || dismissedWarnings.includes("insecure")) &&
    !showWebGpuWarning &&
    !showMemoryWarning
  ) {
    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 pt-4 flex flex-col gap-2 z-30">
      {!isSecure && !dismissedWarnings.includes("insecure") && (
        <div className="flex items-start gap-3 bg-red-950/20 border border-red-500/30 rounded-xl p-3.5 shadow-md shadow-red-900/5">
          <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-red-200 text-xs">Secure Context (HTTPS) Required</h4>
            <p className="text-[11px] text-red-300/80 leading-normal mt-0.5">
              Microphone access is blocked on insecure connections. Please run/deploy this application
              over HTTPS or access it via localhost/127.0.0.1 for the voice feature to work.
            </p>
          </div>
          <button
            onClick={() => onDismiss("insecure")}
            className="text-red-400/60 hover:text-red-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showWebGpuWarning && (
        <div className="flex items-start gap-3 bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 shadow-md shadow-amber-900/5">
          <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-amber-200 text-xs">
              {IS_IOS ? "WebGPU Not Enabled (iOS Safari)" : "WebGPU Not Supported"}
            </h4>
            <p className="text-[11px] text-amber-300/80 leading-normal mt-0.5">
              {IS_IOS
                ? "Local LLMs require WebGPU. To enable WebGPU on iOS, open iOS Settings > Safari > Advanced > Feature Flags (or Experimental Features) and turn on WebGPU."
                : "Your current browser does not support WebGPU, which is required to run local LLMs. Please switch to a compatible browser like Google Chrome, Microsoft Edge, or Opera."}
            </p>
          </div>
          <button
            onClick={() => onDismiss("webgpu")}
            className="text-amber-400/60 hover:text-amber-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showMemoryWarning && (
        <div className="flex items-start gap-3 bg-zinc-900/80 border border-zinc-700/50 rounded-xl p-3.5 shadow-md backdrop-blur-sm">
          <Info className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-zinc-200 text-xs">Mobile Device Memory Warning</h4>
            <p className="text-[11px] text-zinc-400 leading-normal mt-0.5">
              You have selected{" "}
              <strong>
                {selectedOption.name} ({selectedOption.sizeLabel})
              </strong>
              . Mobile browsers enforce strict tab memory limits (typically ~1.5GB). Large models may
              crash the page. We recommend using <strong>Qwen 0.5B</strong> or{" "}
              <strong>Llama 1B</strong>.
            </p>
          </div>
          <button
            onClick={() => onDismiss("memory")}
            className="text-zinc-500 hover:text-zinc-300 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
