# Planned Features

Two upcoming improvements: a user-facing LLM picker and optional image input for vision-capable models.

---

## 1. LLM dropdown

Replace the debug-panel-only model switcher with a dropdown in the bottom bar (next to voice/language selectors).

### Recommended models (browser-ready today)

| ID             | Label        | Backend         | Size    | Hindi           | Vision |
| -------------- | ------------ | --------------- | ------- | --------------- | ------ |
| `gemma4`       | Gemma 4 E2B  | Transformers.js | ~3.2 GB | Good            | Yes    |
| `qwen-0.5b`    | Qwen 0.5B    | WebLLM          | ~400 MB | Basic           | No     |
| `qwen-1.5b`    | Qwen 1.5B    | WebLLM          | ~1 GB   | Decent          | No     |
| `llama-3.2-1b` | Llama 3.2 1B | WebLLM          | ~700 MB | Best (official) | No     |
| `llama-3.2-3b` | Llama 3.2 3B | WebLLM          | ~2 GB   | Good            | No     |

All WebLLM models use prebuilt MLC weights — no conversion needed. Gemma 4 loads via `@huggingface/transformers` + ONNX WebGPU (already in `use-gemma4.ts`).

### How to implement

**Step 1 — Define a single model registry**

Create `src/lib/llm-models.ts`:

```ts
export type LLMBackend = "gemma4" | "webllm"

export interface LLMOption {
  id: string
  name: string
  backend: LLMBackend
  webllmId?: string          // MLC model_id, e.g. "Llama-3.2-1B-Instruct-q4f16_1-MLC"
  supportsVision: boolean
  sizeLabel: string
}

export const LLM_OPTIONS: LLMOption[] = [
  { id: "gemma4", name: "Gemma 4 E2B", backend: "gemma4", supportsVision: true, sizeLabel: "~3.2 GB" },
  { id: "qwen-0.5b", name: "Qwen 0.5B", backend: "webllm", webllmId: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", supportsVision: false, sizeLabel: "~400 MB" },
  { id: "qwen-1.5b", name: "Qwen 1.5B", backend: "webllm", webllmId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC", supportsVision: false, sizeLabel: "~1 GB" },
  { id: "llama-3.2-1b", name: "Llama 3.2 1B", backend: "webllm", webllmId: "Llama-3.2-1B-Instruct-q4f16_1-MLC", supportsVision: false, sizeLabel: "~700 MB" },
  { id: "llama-3.2-3b", name: "Llama 3.2 3B", backend: "webllm", webllmId: "Llama-3.2-3B-Instruct-q4f16_1-MLC", supportsVision: false, sizeLabel: "~2 GB" },
]
```

**Step 2 — Replace `llmMode` string union in `App.tsx`**

- Change `useState<LLMMode>` → `useState<string>` holding an `LLMOption.id`
- Default: `"gemma4"` on desktop, `"qwen-0.5b"` on iOS (same logic as today)
- Selection only applies **before** models load, or trigger a full reload on change

**Step 3 — Unify load + chat paths**

In `loadModels()` / worker `ready` handler:

```ts
const option = LLM_OPTIONS.find(o => o.id === selectedLLM)
if (option.backend === "gemma4") {
  await gemma4.loadModel()
} else {
  await webllm.loadModel(option.webllmId!)
}
```

In `handleLLMResponse()`:

```ts
if (option.backend === "gemma4") {
  assistantMessage = await gemma4.chat(messages, systemPrompt, image?)
} else {
  assistantMessage = await webllm.chat(messages, systemPrompt)
}
```

**Step 4 — Add dropdown UI**

Reuse the existing voice/language dropdown pattern in the bottom bar:

```tsx
<Button onClick={() => setShowLLMMenu(!showLLMMenu)}>
  <span>{selectedOption.name}</span>
  <ChevronDown />
</Button>
```

Show `sizeLabel` as secondary text in each menu item. Disable the dropdown while `status === "loading"` or `isCallActive`.

**Step 5 — Remove debug-panel LLM buttons**

Keep WebGPU / VAD / STT / TTS / LLM status in the debug panel, but drop the three Gemma/Qwen toggle buttons once the dropdown exists.

---

## 2. Image input (vision)

Gemma 4 E2B is multimodal. The processor in `use-gemma4.ts` already accepts an `images` argument — it is currently always passed as `null`:

```ts
const inputs = await processor(prompt, null, null, { add_special_tokens: false })
//                              ^ images
```

WebLLM models in the list above are **text-only** — hide the image button when a non-vision model is selected.

### How to implement

**Step 1 — Extend message type**

```ts
interface ChatMessage {
  role: "user" | "assistant"
  content: string
  image?: string   // base64 data URL, only on user messages
}
```

**Step 2 — Add image picker to the input bar**

- Small camera/image icon button left of the text input (same row as voice controls)
- `<input type="file" accept="image/*" hidden />` triggered by the button
- On select: read with `FileReader` → store as `pendingImage` state, show a thumbnail preview
- Clear thumbnail after send

**Step 3 — Pass image into Gemma 4**

In `use-gemma4.ts`, update `chat()`:

```ts
async function chat(messages, systemPrompt?, imageDataUrl?: string) {
  // Convert data URL → RawImage for Transformers.js
  const { RawImage } = await import("@huggingface/transformers")
  const image = imageDataUrl
    ? await RawImage.fromURL(imageDataUrl)
    : null

  const inputs = await processor(prompt, image, null, { add_special_tokens: false })
  // ...
}
```

For messages with images, include the image only on the **last user turn** (the current query). Earlier turns stay text-only.

**Step 4 — Show images in the conversation**

In the message list, render a small `<img>` above the text bubble when `msg.image` is set.

**Step 5 — Guard UX**

- Show image button only when `selectedLLM.supportsVision === true`
- Disable during active voice call (images are a text-mode feature for now)
- Cap image size (e.g. resize to 768px max edge before encoding) to avoid GPU OOM alongside STT/TTS models

---

## Suggested order

1. Model registry + unified load/chat routing
2. LLM dropdown in bottom bar
3. Image picker + Gemma 4 vision path
4. Remove redundant debug-panel model buttons

Steps 1–2 are independent of vision. Step 3 depends on Gemma 4 being selectable (step 1).
