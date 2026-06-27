import type * as OrtNamespace from "onnxruntime-web"

const ONNX_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/"

/** Whether the page can use SharedArrayBuffer for multi-threaded WASM. */
export function isCrossOriginIsolated(): boolean {
  return typeof crossOriginIsolated !== "undefined" && crossOriginIsolated
}

/**
 * Configure onnxruntime-web WASM for the current environment.
 * Multi-threading requires COOP/COEP headers (see vercel.json + vite.config.ts).
 */
export function configureOrtWasm(ort: typeof OrtNamespace) {
  ort.env.logLevel = "error"
  ort.env.wasm.wasmPaths = ONNX_CDN
  ort.env.wasm.simd = true

  if (isCrossOriginIsolated()) {
    ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 8)
  } else {
    // Avoid the noisy warning + useless thread config when isolation is off.
    ort.env.wasm.numThreads = 1
  }
}

export async function createOrtSession(
  ort: typeof OrtNamespace,
  modelBuffer: ArrayBuffer,
  options: { preferWebGpu?: boolean } = {},
): Promise<{ session: OrtNamespace.InferenceSession; backend: "webgpu" | "wasm" }> {
  const sessionOptions: OrtNamespace.InferenceSession.SessionOptions = {
    graphOptimizationLevel: "all",
  }

  if (options.preferWebGpu !== false && typeof navigator !== "undefined" && "gpu" in navigator) {
    try {
      const session = await ort.InferenceSession.create(new Uint8Array(modelBuffer), {
        ...sessionOptions,
        executionProviders: ["webgpu"],
      })
      return { session, backend: "webgpu" }
    } catch {
      // fall through to WASM
    }
  }

  const session = await ort.InferenceSession.create(new Uint8Array(modelBuffer), {
    ...sessionOptions,
    executionProviders: ["wasm"],
  })
  return { session, backend: "wasm" }
}

export async function getConfiguredOrt(): Promise<typeof OrtNamespace> {
  const ortModule = await import("onnxruntime-web")
  const ort = (ortModule.default ?? ortModule) as typeof OrtNamespace
  configureOrtWasm(ort)
  return ort
}
