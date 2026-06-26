import {
  detectLanguage,
  loadTextToSpeech,
  loadVoiceStyle,
  TextToSpeech,
  type LoadProgressCallback,
  type Style,
  type SupertonicLang,
  voiceStyleUrl,
  ONNX_DIR,
} from "./supertonic3/engine";

export type TTSVoice = "F1" | "F2" | "F3" | "F4" | "F5" | "M1" | "M2" | "M3" | "M4" | "M5";
export type TTSLanguage = "auto" | SupertonicLang;

const DEFAULT_QUALITY = 8;
const DEFAULT_SPEED = 1.05;

let enginePromise: Promise<{
  textToSpeech: TextToSpeech;
  backend: "webgpu" | "wasm";
}> | null = null;

const styleCache = new Map<TTSVoice, Style>();

export async function loadEngine(progressCallback?: LoadProgressCallback) {
  return (enginePromise ??= loadTextToSpeech(ONNX_DIR, progressCallback));
}

export async function loadVoice(voice: TTSVoice): Promise<Style> {
  const cached = styleCache.get(voice);
  if (cached) return cached;

  const style = await loadVoiceStyle([voiceStyleUrl(voice)]);
  styleCache.set(voice, style);
  return style;
}

export interface SynthesisResult {
  audio: Float32Array;
  sampling_rate: number;
  language: SupertonicLang;
}

export async function synthesizeSpeech(
  text: string,
  voice: TTSVoice,
  options: {
    language?: TTSLanguage;
    quality?: number;
    speed?: number;
    onProgress?: (step: number, total: number) => void;
  } = {},
): Promise<SynthesisResult> {
  const { textToSpeech } = await loadEngine();
  const style = await loadVoice(voice);

  const lang =
    options.language && options.language !== "auto"
      ? options.language
      : detectLanguage(text);

  const { wav, duration } = await textToSpeech.call(
    text,
    lang,
    style,
    options.quality ?? DEFAULT_QUALITY,
    options.speed ?? DEFAULT_SPEED,
    0.3,
    options.onProgress,
  );

  const wavLen = Math.floor(textToSpeech.sampleRate * duration[0]);
  const trimmed = wav.slice(0, wavLen);

  return {
    audio: Float32Array.from(trimmed),
    sampling_rate: textToSpeech.sampleRate,
    language: lang,
  };
}
