export type STTEngineType = 'transformers'

export interface STTModelOption {
  id: string
  name: string
  sizeLabel: string
  isEnglishOnly: boolean
  /** HuggingFace model path used by the transformers.js pipeline. */
  huggingFacePath: string
  engineType: STTEngineType
}

export const STT_OPTIONS: STTModelOption[] = [
  // ── Whisper ─────────────────────────────────────────────────────────────
  {
    id: 'whisper-tiny.en',
    name: 'Whisper Tiny (English Only)',
    sizeLabel: '~75 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/whisper-tiny.en',
    engineType: 'transformers',
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny (Multilingual)',
    sizeLabel: '~75 MB',
    isEnglishOnly: false,
    huggingFacePath: 'onnx-community/whisper-tiny',
    engineType: 'transformers',
  },
  {
    id: 'whisper-base.en',
    name: 'Whisper Base (English Only)',
    sizeLabel: '~145 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/whisper-base.en',
    engineType: 'transformers',
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base (Multilingual)',
    sizeLabel: '~145 MB',
    isEnglishOnly: false,
    huggingFacePath: 'onnx-community/whisper-base',
    engineType: 'transformers',
  },
  {
    id: 'whisper-small.en',
    name: 'Whisper Small (English Only)',
    sizeLabel: '~480 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/whisper-small.en',
    engineType: 'transformers',
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small (Multilingual)',
    sizeLabel: '~480 MB',
    isEnglishOnly: false,
    huggingFacePath: 'onnx-community/whisper-small',
    engineType: 'transformers',
  },

  // ── Distil-Whisper ───────────────────────────────────────────────────────
  {
    id: 'distil-small.en',
    name: 'Distil-Whisper Small (English Only)',
    sizeLabel: '~150 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/distil-small.en',
    engineType: 'transformers',
  },
  {
    id: 'distil-medium.en',
    name: 'Distil-Whisper Medium (English Only)',
    sizeLabel: '~350 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/distil-medium.en',
    engineType: 'transformers',
  },
  {
    id: 'distil-large-v3.5',
    name: 'Distil-Whisper Large v3.5 (Multilingual)',
    sizeLabel: '~750 MB',
    isEnglishOnly: false,
    huggingFacePath: 'onnx-community/distil-large-v3.5-ONNX',
    engineType: 'transformers',
  },

  // ── Moonshine ────────────────────────────────────────────────────────────
  {
    id: 'moonshine-tiny',
    name: 'Moonshine Tiny (English Only)',
    sizeLabel: '~27 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/moonshine-tiny-ONNX',
    engineType: 'transformers',
  },
  {
    id: 'moonshine-base',
    name: 'Moonshine Base (English Only)',
    sizeLabel: '~61 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/moonshine-base-ONNX',
    engineType: 'transformers',
  },

  // ── Wav2Vec2 ─────────────────────────────────────────────────────────────
  {
    id: 'wav2vec2-base',
    name: 'Wav2Vec2 Base (English Only)',
    sizeLabel: '~360 MB',
    isEnglishOnly: true,
    huggingFacePath: 'Xenova/wav2vec2-base-960h',
    engineType: 'transformers',
  },
  {
    id: 'wav2vec2-large-xlsr',
    name: 'Wav2Vec2 Large XLSR (Multilingual)',
    sizeLabel: '~1.2 GB',
    isEnglishOnly: false,
    huggingFacePath: 'Xenova/wav2vec2-large-xlsr-53-english',
    engineType: 'transformers',
  },
]

export const DEFAULT_STT_ID = 'whisper-base'
