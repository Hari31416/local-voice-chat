export interface STTModelOption {
  id: string
  name: string
  sizeLabel: string
  isEnglishOnly: boolean
  huggingFacePath: string
}

export const STT_OPTIONS: STTModelOption[] = [
  {
    id: 'whisper-tiny.en',
    name: 'Whisper Tiny (English Only)',
    sizeLabel: '~75 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/whisper-tiny.en'
  },
  {
    id: 'whisper-tiny',
    name: 'Whisper Tiny (Multilingual)',
    sizeLabel: '~75 MB',
    isEnglishOnly: false,
    huggingFacePath: 'onnx-community/whisper-tiny'
  },
  {
    id: 'whisper-base.en',
    name: 'Whisper Base (English Only)',
    sizeLabel: '~145 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/whisper-base.en'
  },
  {
    id: 'whisper-base',
    name: 'Whisper Base (Multilingual)',
    sizeLabel: '~145 MB',
    isEnglishOnly: false,
    huggingFacePath: 'onnx-community/whisper-base'
  },
  {
    id: 'whisper-small.en',
    name: 'Whisper Small (English Only)',
    sizeLabel: '~480 MB',
    isEnglishOnly: true,
    huggingFacePath: 'onnx-community/whisper-small.en'
  },
  {
    id: 'whisper-small',
    name: 'Whisper Small (Multilingual)',
    sizeLabel: '~480 MB',
    isEnglishOnly: false,
    huggingFacePath: 'onnx-community/whisper-small'
  }
]

export const DEFAULT_STT_ID = 'whisper-base'
