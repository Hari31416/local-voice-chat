# WebVoice - 100% In-Browser AI Voice Chat

A hands-free AI voice assistant that runs entirely in your browser. Speech recognition, LLM, and text-to-speech all run locally using WebGPU — no API keys, no server, no data leaves your device.

Based on [activated-intelligence/voice-chat](https://github.com/activated-intelligence/voice-chat), with **Supertonic 3** or **Piper** for TTS (English + Hindi).

## What Makes This Different

**Everything runs in your browser:**

- **Speech-to-Text**: Whisper model via WebGPU/WASM
- **Voice Activity Detection**: Silero VAD detects when you're speaking
- **LLM**: Gemma 4 E2B via Transformers.js + ONNX WebGPU (`onnx-community/gemma-4-E2B-it-ONNX`)
- **Text-to-Speech**: **Supertonic 3** (multilingual) or **Piper** (lightweight per-voice models)

No audio leaves your device. No API keys needed. Pick your models on the setup screen, then talk.

## Quick Start

```bash
pnpm install
pnpm dev
```

For production static export (e.g. HuggingFace Spaces):

```bash
pnpm build
# output in dist/
```

Open [http://localhost:5173](http://localhost:5173) in Chrome or Edge.

## What Downloads When

| Asset | Size | When | Cached |
|-------|------|------|--------|
| Whisper STT model | ~150MB | First use | ✓ IndexedDB |
| Silero VAD model | ~2MB | First use | ✓ IndexedDB |
| Gemma 4 E2B LLM | ~3.2GB | First use | ✓ IndexedDB |
| Supertonic 3 TTS | ~400MB | First use (if selected) | ✓ Cache API |
| Piper TTS voice | ~15–75MB each | First use (if selected) | ✓ OPFS / browser cache |
| Voice styles (Supertonic) | ~300KB each | On voice select | ✓ Memory |

First load downloads models based on your setup choices (typically 1–4GB) from HuggingFace CDN. After that, everything runs offline.

## Model setup

On first launch you pick **LLM**, **TTS engine** (Supertonic 3 or Piper), and **voice** before any downloads begin. Choices are saved in `localStorage` and can be cleared with **Reset choices** on the setup screen or in the debug panel.

## Requirements

- **Browser**: Chrome 113+ or Edge 113+ (WebGPU recommended for STT and TTS)
- **RAM**: ~6GB available for models (Gemma 4 E2B + STT + TTS)
- **Microphone**: Required for voice input

TTS falls back to WASM if WebGPU is unavailable (Supertonic). Piper always uses WASM.

## TTS engines

### Supertonic 3

Uses [Supertone/supertonic-3](https://huggingface.co/Supertone/supertonic-3) (~400MB engine + style files) via `onnxruntime-web`.

- **Languages**: Auto-detect, English, Hindi, or Hinglish
- **Voices**: 10 preset styles (F1–F5, M1–M5)
- **Inference**: WebGPU with WASM fallback

### Piper

Uses [@realtimex/piper-tts-web](https://github.com/therealtimex/piper-tts-web) with voices from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) (~60MB per voice).

- **Languages**: One language per voice (English US/UK, Hindi)
- **Inference**: WASM via ONNX Runtime Web
- Hindi voices load directly from rhasspy/piper-voices

## Project Structure

```
src/
├── App.tsx                   # Main voice chat UI
├── components/
│   └── setup-screen.tsx      # Pre-download model & voice picker
├── main.tsx                  # Vite entry point
├── index.css                 # Tailwind + shadcn theme
├── hooks/
│   ├── use-gemma4.ts         # Gemma 4 E2B via Transformers.js (default LLM)
│   ├── use-webllm.ts         # WebLLM / Qwen fallback
│   └── use-tts.ts            # Supertonic 3 + Piper TTS hook
└── lib/
    ├── tts.ts                # TTS provider facade
    ├── tts-voices.ts         # Curated voice catalogs
    ├── user-preferences.ts   # Saved model/voice choices
    ├── tts-providers/
    │   ├── supertonic.ts
    │   └── piper.ts
    ├── piper/
    │   ├── rhasspy-session.ts
    │   └── wav.ts
    └── supertonic3/
        └── engine.ts         # Supertonic 3 ONNX inference

public/
├── stt-worker-esm.js         # Whisper + VAD worker
└── vad-processor.js          # Audio worklet
```

## Using a Different LLM

Default is **Gemma 4 E2B** (`onnx-community/gemma-4-E2B-it-ONNX`) via `@huggingface/transformers` with WebGPU. Switch to Qwen via the debug panel (gear icon), or replace the `llm.chat()` call in `handleLLMResponse()` with a fetch to your API endpoint.

## Tech Stack

- **Framework**: Vite, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS v4
- **STT**: Whisper via @huggingface/transformers
- **VAD**: Silero VAD via ONNX Runtime
- **LLM**: Gemma 4 E2B via @huggingface/transformers (WebGPU ONNX); Qwen fallback via @mlc-ai/web-llm
- **TTS**: Supertonic 3 or Piper via onnxruntime-web / @realtimex/piper-tts-web
- **Styling**: Tailwind CSS v4

## License

MIT License — see [LICENSE](LICENSE)

## Credits

- [activated-intelligence/voice-chat](https://github.com/activated-intelligence/voice-chat) — voice pipeline foundation
- [Supertonic 3](https://github.com/supertone-inc/supertonic) — multilingual TTS engine
- [Piper](https://github.com/rhasspy/piper) / [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) — lightweight TTS option
- [Whisper](https://github.com/openai/whisper) — OpenAI
- [Gemma 4 E2B ONNX](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX) — default LLM
- [Gemma 4 WebGPU Kernels demo](https://huggingface.co/spaces/webml-community/gemma-4-webgpu-kernels) — reference implementation
- [WebLLM](https://github.com/mlc-ai/web-llm) — MLC AI (Qwen fallback)
- [Transformers.js](https://github.com/huggingface/transformers.js) — Hugging Face
