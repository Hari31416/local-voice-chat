# WebVoice Studio — In-Browser Voice AI (Chat, TTS & STT)

A fully local voice AI workbench in your browser — conversational chat, text-to-speech, and speech-to-text. Speech recognition, LLM, and TTS all run on-device using WebGPU — no API keys, no server, no data leaves your device.

## What Makes This Different

**Everything runs in your browser:**

- **Speech-to-Text**: Whisper model via WebGPU/WASM (optional — disable for text-only chat)
- **Voice Activity Detection**: Silero VAD detects when you're speaking
- **LLM**: Gemma 4 E2B via Transformers.js + ONNX WebGPU, or Qwen / Llama via WebLLM
- **Text-to-Speech**: **Supertonic 3** (multilingual) or **Piper** (lightweight per-voice models) — optional for text-only mode
- **Hindi typing**: Roman-to-Devanagari input via [Lipilekhika](https://www.npmjs.com/package/lipilekhika) in the message box

No data leaves your device. No API keys needed. Pick your models on the setup screen, then talk or type.

## Three Studios

The app is split into three tabs under **WebVoice Studio**:

| Tab             | Purpose                                                                               |
| --------------- | ------------------------------------------------------------------------------------- |
| **Voice Agent** | Full conversational assistant — voice call, push-to-talk, or text + image input       |
| **TTS Studio**  | Standalone text-to-speech sandbox — type text, pick engine/voice, synthesize and play |
| **STT Studio**  | Standalone speech-to-text — record mic audio or upload a file, get a transcript       |

Each studio loads models on demand with progress tracking. Switching away from Voice Agent ends an active call or mic session.

## Modes

### Voice mode (STT + TTS enabled)

Hands-free or push-to-talk conversation. The LLM uses a concise voice persona (short answers, no markdown). TTS streams sentence-by-sentence as the model generates text. An LED-matrix waveform player shows playback in each assistant bubble.

### Text-only mode (STT and/or TTS disabled)

Type messages (and optionally attach images with Gemma 4). The LLM uses a richer text persona — longer answers, markdown, lists, and code blocks via `react-markdown`. No microphone required when STT is off.

### Hindi & Hinglish

- **Supertonic 3**: Auto-detect, English, Hindi, or Hinglish output language
- **LLM**: Replies in the same language the user used (Hindi in Devanagari, English, or mixed Hinglish)
- **Voice persona**: System prompt adapts to the selected TTS voice gender (e.g. Hindi verb endings match female/male speaker)
- **Hindi typing**: Toggle Roman → Devanagari transliteration in the message box (auto-enabled for Hindi/Hinglish TTS language)

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
| Whisper STT model | ~150MB | First use (if STT enabled) | ✓ IndexedDB |
| Silero VAD model | ~2MB | First use (if STT enabled) | ✓ IndexedDB |
| Gemma 4 E2B LLM | ~3.2GB | First use (if selected) | ✓ IndexedDB |
| WebLLM models | ~400MB–2GB | First use (if selected) | ✓ IndexedDB |
| Supertonic 3 TTS | ~400MB | First use (if selected) | ✓ Cache API |
| Piper TTS voice | ~15–75MB each | First use (if selected) | ✓ OPFS / browser cache |
| Voice styles (Supertonic) | ~300KB each | On voice select | ✓ Memory |

First load downloads models based on your setup choices (typically 150MB–4GB) from HuggingFace CDN. After that, everything runs offline.

## Model setup

On first launch you pick **LLM**, whether to enable **STT** and **TTS**, **TTS engine** (Supertonic 3 or Piper), **voice**, and **language** before any downloads begin. The setup screen shows estimated download sizes per selection.

Choices are saved in `localStorage` and can be cleared with **Reset choices** on the setup screen or in the debug panel (gear icon). You can also switch LLM, voice, and language from the control bar during a session.

**Default LLM**: Gemma 4 E2B on desktop; Qwen 0.5B on iOS (WebGPU limitations).

## Requirements

- **Browser**: Chrome 113+ or Edge 113+ (WebGPU recommended for STT and TTS)
- **RAM**: ~6GB available for full voice stack (Gemma 4 E2B + STT + TTS); less for text-only or smaller WebLLM models
- **Microphone**: Required only when STT is enabled

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
├── App.tsx                         # Tab shell: Voice Agent / TTS Studio / STT Studio
├── main.tsx                        # Vite entry point
├── index.css                       # Tailwind + shadcn theme
├── components/
│   ├── setup-screen.tsx            # Pre-download model & voice picker
│   ├── conversation-area.tsx       # Chat messages + setup / load progress
│   ├── control-bar.tsx             # Mic, call, text input, LLM/voice controls
│   ├── voice-agent-top-bar.tsx     # Status, debug panel
│   ├── warning-banners.tsx         # HTTPS, WebGPU, mobile warnings
│   ├── message-text.tsx            # Markdown rendering for text-mode replies
│   ├── hindi-typing-input.tsx      # Lipilekhika Roman → Devanagari input
│   ├── audio-waveform-player.tsx   # LED-matrix bubble audio player
│   ├── tts-studio.tsx              # Standalone TTS sandbox
│   ├── stt-studio.tsx              # Standalone STT sandbox
│   └── ui/                         # shadcn primitives (button, message, …)
├── hooks/
│   ├── use-voice-agent.ts          # Orchestrates STT, LLM, TTS, preferences
│   ├── use-gemma4.ts               # Gemma 4 E2B via Transformers.js (streaming)
│   ├── use-webllm.ts               # WebLLM / Qwen / Llama fallback
│   └── use-tts.ts                  # Supertonic 3 + Piper TTS hook (sentence streaming)
└── lib/
    ├── system-prompt.ts            # Voice vs text personas, voice gender rules
    ├── tts-voices.ts               # Curated voice catalogs + voice profiles
    ├── user-preferences.ts         # Saved model/voice/STT/TTS choices
    ├── voice-agent-types.ts        # Shared types
    ├── voice-agent-constants.ts
    ├── llm-models.ts               # LLM catalog (Gemma 4, Qwen, Llama)
    ├── tts.ts                      # TTS provider facade
    ├── tts-providers/
    │   ├── supertonic.ts
    │   └── piper.ts
    ├── piper/
    │   ├── rhasspy-session.ts
    │   └── wav.ts
    └── supertonic3/
        └── engine.ts               # Supertonic 3 ONNX inference

public/
├── stt-worker-esm.js               # Whisper + VAD worker
└── vad-processor.js                # Audio worklet
```

## Using a Different LLM

**Gemma 4 E2B** (`onnx-community/gemma-4-E2B-it-ONNX`) is the default on desktop via `@huggingface/transformers` with WebGPU and vision support.

**WebLLM** models (Qwen 0.5B/1.5B, Llama 3.2 1B/3B) are selectable on the setup screen or from the control bar. iOS defaults to Qwen 0.5B.

To use a remote API instead, replace the `llm.chat()` call in `use-voice-agent.ts` with a fetch to your endpoint.

## Tech Stack

- **Framework**: Vite, React 19, TypeScript
- **UI**: shadcn/ui, Tailwind CSS v4
- **STT**: Whisper via @huggingface/transformers
- **VAD**: Silero VAD via ONNX Runtime
- **LLM**: Gemma 4 E2B via @huggingface/transformers (WebGPU ONNX); Qwen / Llama via @mlc-ai/web-llm
- **TTS**: Supertonic 3 or Piper via onnxruntime-web / @realtimex/piper-tts-web
- **Markdown**: react-markdown + remark-gfm (text-mode replies)
- **Hindi input**: lipilekhika (Roman → Devanagari transliteration)

## License

MIT License — see [LICENSE](LICENSE)

## Credits

- [activated-intelligence/voice-chat](https://github.com/activated-intelligence/voice-chat) — voice pipeline foundation
- [Supertonic 3](https://github.com/supertone-inc/supertonic) — multilingual TTS engine
- [Piper](https://github.com/rhasspy/piper) / [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) — lightweight TTS option
- [Whisper](https://github.com/openai/whisper) — OpenAI
- [Gemma 4 E2B ONNX](https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX) — default LLM
- [Gemma 4 WebGPU Kernels demo](https://huggingface.co/spaces/webml-community/gemma-4-webgpu-kernels) — reference implementation
- [WebLLM](https://github.com/mlc-ai/web-llm) — MLC AI (Qwen / Llama models)
- [Transformers.js](https://github.com/huggingface/transformers.js) — Hugging Face
- [Lipilekhika](https://www.npmjs.com/package/lipilekhika) — Hindi transliteration input
