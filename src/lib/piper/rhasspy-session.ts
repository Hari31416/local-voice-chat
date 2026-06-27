import { fetchCachedArrayBuffer, fetchCachedJson } from "@/lib/asset-cache"
import { configureOrtWasm, createOrtSession } from "@/lib/ort-config"
import type { LoadProgressCallback } from "@/lib/tts-types"

const RHASSPY_HF_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main"
const PIPER_WASM_BASE =
  "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize"

interface PiperModelConfig {
  audio: { sample_rate: number }
  espeak: { voice: string }
  inference: { noise_scale: number; length_scale: number; noise_w: number }
  speaker_id_map: Record<string, number>
}

type PiperPhonemizeFactory = (options: {
  print: (data: string) => void
  printErr: (message: string) => void
  locateFile: (url: string) => string
}) => Promise<{ callMain: (args: string[]) => void }>

export interface PiperPcmResult {
  pcm: Float32Array
  sampleRate: number
}

export interface PiperSession {
  ready: boolean
  backend: "webgpu" | "wasm"
  predictPcm(text: string): Promise<PiperPcmResult>
  unload(): Promise<void>
}

const wasmPaths = {
  piperData: `${PIPER_WASM_BASE}.data`,
  piperWasm: `${PIPER_WASM_BASE}.wasm`,
}

/** Pre-load espeak-ng WASM so the first utterance isn't penalized. */
let phonemizeWarmup: Promise<void> | null = null

function warmPhonemizer(): Promise<void> {
  return (phonemizeWarmup ??= import("piper-phonemize-internal").then(
    async ({ createPiperPhonemize }) => {
      const module = await (createPiperPhonemize as PiperPhonemizeFactory)({
        print: () => {},
        printErr: () => {},
        locateFile: (url) => {
          if (url.endsWith(".wasm")) return wasmPaths.piperWasm
          if (url.endsWith(".data")) return wasmPaths.piperData
          return url
        },
      })
      module.callMain(["-l", "en-us", "--input", '[" "]', "--espeak_data", "/espeak-ng-data"])
    },
  ).catch(() => {}))
}

async function phonemizeText(text: string, espeakVoice: string): Promise<number[]> {
  const input = JSON.stringify([{ text: text.trim() }])
  const { createPiperPhonemize } = await import("piper-phonemize-internal")

  return new Promise<number[]>((resolve, reject) => {
    void (createPiperPhonemize as PiperPhonemizeFactory)({
      print: (data) => resolve(JSON.parse(data).phoneme_ids as number[]),
      printErr: (message) => reject(new Error(message)),
      locateFile: (url) => {
        if (url.endsWith(".wasm")) return wasmPaths.piperWasm
        if (url.endsWith(".data")) return wasmPaths.piperData
        return url
      },
    }).then((module) => {
      module.callMain(["-l", espeakVoice, "--input", input, "--espeak_data", "/espeak-ng-data"])
    })
  })
}

export async function createRhasspyPiperSession(
  modelPath: string,
  progressCallback?: LoadProgressCallback,
): Promise<PiperSession> {
  const modelUrl = `${RHASSPY_HF_BASE}/${modelPath}.onnx`
  const configUrl = `${RHASSPY_HF_BASE}/${modelPath}.onnx.json`

  progressCallback?.({ model: "Piper config", progress: 5, backend: "wasm" })

  const ortModule = await import("onnxruntime-web")
  const ort = ortModule.default ?? ortModule
  configureOrtWasm(ort)

  const modelConfig = await fetchCachedJson<PiperModelConfig>(configUrl)

  progressCallback?.({ model: "Piper voice model", progress: 15, backend: "wasm" })

  const modelBuffer = await fetchCachedArrayBuffer(modelUrl)
  progressCallback?.({ model: "Piper voice model", progress: 85, backend: "wasm" })

  // Piper uses int64 inputs (phoneme ids) — WebGPU EP can't run GatherND on int64.
  const { session: ortSession, backend } = await createOrtSession(ort, modelBuffer, {
    preferWebGpu: false,
  })
  void warmPhonemizer()

  progressCallback?.({ model: "Piper voice model", progress: 100, backend })

  const hasSpeaker = Object.keys(modelConfig.speaker_id_map).length > 0
  const inferenceScales = new Float32Array([
    modelConfig.inference.noise_scale,
    modelConfig.inference.length_scale,
    modelConfig.inference.noise_w,
  ])

  return {
    ready: true,
    backend,
    async predictPcm(text: string): Promise<PiperPcmResult> {
      const phonemeIds = await phonemizeText(text, modelConfig.espeak.voice)

      const feeds: Record<string, InstanceType<typeof ort.Tensor>> = {
        input: new ort.Tensor("int64", phonemeIds, [1, phonemeIds.length]),
        input_lengths: new ort.Tensor("int64", [phonemeIds.length]),
        scales: new ort.Tensor("float32", inferenceScales),
      }

      if (hasSpeaker) {
        feeds.sid = new ort.Tensor("int64", [0])
      }

      const result = await ortSession.run(feeds)
      return {
        pcm: result.output.data as Float32Array,
        sampleRate: modelConfig.audio.sample_rate,
      }
    },
    async unload() {
      await ortSession.release()
    },
  }
}
