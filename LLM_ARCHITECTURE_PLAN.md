# LLM Architecture Plan

This plan extends the current `llm-models` catalog and `llm-runtime` layer so the app can support multiple engines per model, expose thinking output cleanly, and add tool-call execution without scattering backend-specific logic through the voice agent.

## Goals

- Treat a model and its runtime engine as separate concepts.
- Allow one logical model to have multiple loadable variants, such as Gemma through custom kernels and Gemma through Transformers.js.
- Normalize backend output into structured stream events instead of plain text deltas.
- Support thinking output without leaking raw model-specific tags into chat text or TTS.
- Support tool calls through a safe, explicit tool registry and a common engine contract.
- Keep UI selection based on user needs first: recommended, vision, thinking, tools, speed, mobile, quality, and advanced engine choice.

## 1. Support Multiple Backends Per Model

### Current State

The catalog now has richer `LLMOption` metadata, including:

- `logicalModelId`
- `backend`
- `engineType`
- `capabilities`
- `requirements`
- `sizeMb`
- `tokenLimits`

This is enough to list multiple variants, but the current shape still uses `LLMOption` as both "logical model" and "loadable variant". The next step is to split those concepts explicitly.

### Target Data Model

Add two catalog types:

```ts
export interface LLMModel {
  id: string
  name: string
  family: "gemma" | "qwen" | "llama" | "lfm"
  description?: string
  capabilities: Record<LLMCapability, boolean>
  variants: LLMVariant[]
}

export interface LLMVariant {
  id: string
  modelId: string
  engine: LLMEngineType
  label: string
  engineModelId: string
  capabilities: Record<LLMCapability, boolean>
  requirements: LLMRequirement[]
  sizeMb: number
  sizeLabel: string
  tokenLimits: { voice: number; text: number }
  recommendedFor: LLMRecommendation[]
}
```

Example:

```ts
{
  id: "gemma-4-e2b",
  name: "Gemma 4 E2B",
  family: "gemma",
  capabilities: {
    text: true,
    vision: false,
    thinking: true,
    streaming: true,
    tools: false,
  },
  variants: [
    {
      id: "gemma-4-e2b-kernel",
      modelId: "gemma-4-e2b",
      engine: "gemma4-kernel",
      label: "Custom kernels",
      engineModelId: "google/gemma-4-E2B-it-qat-mobile-transformers",
      sizeMb: 3277,
    },
    {
      id: "gemma-4-e2b-transformers",
      modelId: "gemma-4-e2b",
      engine: "transformers-js",
      label: "Transformers.js",
      engineModelId: "google/gemma-4-E2B-it-qat-mobile-transformers",
      sizeMb: 3277,
    },
  ],
}
```

### Runtime Changes

Replace backend-specific loading branches with engine adapters:

```ts
export interface LLMEngineAdapter {
  engine: LLMEngineType
  load(variant: LLMVariant): Promise<boolean>
  unload(variant?: LLMVariant): Promise<void>
  isReady(variant: LLMVariant): boolean
  abort(): void
  stream(request: LLMRequest): AsyncGenerator<LLMStreamEvent>
}
```

Then register adapters:

```ts
const LLM_ENGINES: Record<LLMEngineType, LLMEngineAdapter> = {
  "gemma4-kernel": gemmaKernelEngine,
  "lfm2-kernel": lfmKernelEngine,
  "transformers-js": transformersEngine,
  webllm: webllmEngine,
}
```

`useVoiceAgent` should only call:

```ts
llmRuntime.load(selectedVariant)
llmRuntime.stream(request)
llmRuntime.abort()
llmRuntime.unload(previousVariant)
```

### Selection Policy

Add a selector function:

```ts
selectBestVariant({
  model,
  device,
  requiredCapabilities,
  preferredEngine,
  cachedVariants,
})
```

Rank by:

- Required capabilities first: vision, thinking, tools.
- Device constraints: WebGPU availability, mobile memory.
- Cached status.
- User preference.
- Quality/speed recommendation.

### UI Changes

The model selector should show:

- Logical model name as the primary item.
- Capability badges at the model level.
- Default variant summary.
- Advanced engine dropdown only when multiple variants exist.

Example:

```txt
Gemma 4 E2B
Thinking · 3.2 GB · Quality
Engine: Custom kernels
Other engines: Transformers.js
```

## 2. Add Thinking Support

### Current State

Thinking markup is currently stripped inside engine-specific hooks:

- Gemma strips channel/thought markers.
- Qwen strips `<thinking>` content.

This keeps chat output clean, but throws away a useful stream channel and makes each backend responsible for app-level behavior.

### Target Stream Event Model

Replace text-only stream deltas with structured events:

```ts
export type LLMStreamEvent =
  | { type: "text_delta"; text: string }
  | { type: "thinking_delta"; text: string }
  | { type: "tool_call"; call: LLMToolCall }
  | { type: "usage"; usage: LLMUsage }
  | { type: "done" }
```

Each engine adapter should parse raw tokens into these events. `useVoiceAgent` should not know about Gemma channel markers or Qwen thinking tags.

### Parser Responsibilities

Create parser utilities per model family:

```txt
src/lib/llm/parsers/gemma.ts
src/lib/llm/parsers/qwen.ts
src/lib/llm/parsers/default.ts
```

Each parser should:

- Convert raw stream text into visible answer deltas and thinking deltas.
- Avoid emitting duplicate deltas.
- Handle partial tags across token boundaries.
- Emit final cleaned answer text.

### Message Model Changes

Extend chat messages:

```ts
export interface ChatMessage {
  role: "user" | "assistant" | "tool"
  content: string
  thinking?: string
  toolCalls?: LLMToolCall[]
  toolResults?: LLMToolResult[]
}
```

### UI Behavior

- Text chat: show a collapsible "Thinking" panel on assistant messages when present.
- Voice mode: we can keeo skipping thinking tokens for voice mode to avoid latency. Only do if full call mode is configured. If not, we may show reasoning token but do not do TTS on reasoning tokens.
- Streaming: update thinking panel live if enabled.
- Settings: add a toggle for "Show model thinking" if we want user control.

### Safety and Product Rules

- Thinking should be off by default if it contains raw chain-of-thought that should not be exposed.
- If exposed, prefer summarized reasoning or model-provided reasoning summaries.
- Store thinking separately from assistant content so TTS and message copying do not accidentally include it.

## 3. Add Tool-Call Support

### Target Capability

Tool support should allow local/browser-safe tools such as:

- Current time.
- Calculator.
- Lightweight app state queries.
- Possibly web/search later, only with explicit permissions and clear UX.

Do not let model output directly execute arbitrary code.

### Data Types

```ts
export interface LLMToolDefinition {
  name: string
  description: string
  parameters: JSONSchema
  execute(input: unknown, context: ToolExecutionContext): Promise<LLMToolResult>
}

export interface LLMToolCall {
  id: string
  name: string
  arguments: unknown
}

export interface LLMToolResult {
  callId: string
  name: string
  content: string
  error?: string
}
```

### Tool Registry

Create:

```txt
src/lib/tools/types.ts
src/lib/tools/registry.ts
src/lib/tools/builtins/
```

Example registry:

```ts
export const TOOL_REGISTRY = {
  get_current_time,
  calculator,
}
```

Tool execution rules:

- Validate tool arguments against schema before execution.
- Enforce per-tool timeouts.
- Return tool errors as structured results, not thrown app crashes.
- Keep tools deterministic and local at first.
- Require explicit UI/user approval before external or sensitive actions.

### Engine Adapter Responsibilities

Each adapter should map the engine's tool-call format to `LLMToolCall`.

For WebLLM/OpenAI-style engines:

- Pass `tools` to chat completion where supported.
- Parse assistant tool calls from returned messages/chunks.

For Transformers.js/custom kernels:

- Use prompt-based tool calling if native tool calls are unavailable.
- Require strict JSON tool-call blocks.
- Parse only from a fenced/sentinel format.

Suggested fallback format:

```txt
<tool_call>
{"name":"calculator","arguments":{"expression":"12 * 7"}}
</tool_call>
```

The parser must ignore malformed tool JSON and ask the model to retry rather than executing untrusted text.

### Tool-Calling Loop

Add a tool loop in `llmRuntime`:

```ts
while (turn.toolCalls.length > 0 && depth < maxToolRounds) {
  execute tool calls
  append tool results
  continue generation
}
```

Limits:

- `maxToolRounds`: 3
- `maxToolCallsPerRound`: 4
- Per-tool timeout: 5 seconds
- Abort support must stop active tool rounds and generation.

### Message Flow

1. User sends message.
2. LLM streams thinking/text/tool-call events.
3. If tool calls are emitted, pause visible answer if needed.
4. Execute allowed tools.
5. Append tool results to model context.
6. Resume generation.
7. Final assistant message stores visible text, optional thinking, tool calls, and tool results.

### UI Behavior

- Show compact tool activity rows inside the assistant message.
- Example: `Used calculator`.
- Show failed tool calls with a small warning state.
- Do not speak tool JSON or internal tool traces.
- In voice mode, only speak final assistant answer.

## 4. Implementation Phases

### Phase 1: Catalog Split

- Introduce `LLMModel` and `LLMVariant`.
- Convert the existing flat `LLM_OPTIONS` into logical models plus variants.
- Keep a derived flat list only where old components still need it.
- Add Gemma Transformers.js as a second Gemma variant.
- Update preferences to store `variantId`, not only `llmId`.

### Phase 2: Engine Adapter Layer

- Move current hook-specific backend logic behind `LLMEngineAdapter`.
- Keep existing hooks temporarily as adapter internals.
- Remove backend branching from `useVoiceAgent`.
- Add adapter-level readiness and loaded-variant tracking.

### Phase 3: Structured Streaming

- Introduce `LLMStreamEvent`.
- Convert adapters from `AsyncGenerator<string>` to `AsyncGenerator<LLMStreamEvent>`.
- Update `useVoiceAgent` to route `text_delta` to visible answer and TTS.
- Add parser tests for Gemma and Qwen thinking markup.

### Phase 4: Thinking UI

- Extend `ChatMessage` with `thinking`.
- Add collapsible thinking rendering in conversation messages.
- Add setting for showing/hiding thinking if desired.
- Ensure TTS ignores thinking.

### Phase 4b: AI SDK Dependencies and Stream Mapper

- Add `ai`, `@browser-ai/transformers-js`, and `@browser-ai/web-llm`.
- Add `src/lib/llm/ai-sdk-stream.ts` to map `streamText` / `fullStream` parts to `LLMStreamEvent`.
- Use `extractReasoningMiddleware` for thinking-capable models on native engines.

### Phase 4c: Transformers.js via AI SDK

- Refactor `use-qwen35` to load models through `@browser-ai/transformers-js`.
- Stream through `chatStreamEvents` instead of raw `TextStreamer` + regex parsing.

### Phase 4d: WebLLM via AI SDK

- Refactor `use-webllm` to load models through `@browser-ai/web-llm`.
- Stream through `chatStreamEvents` with native `enable_thinking` provider options.

### Phase 4e: Parser Scope Reduction

- Remove `parseRawStream` from `transformers-js` and `webllm` adapters.
- Keep family parsers only for `gemma4-kernel` (channel-marker output).

### Phase 4f: Engine Feature UI

- Add `src/lib/llm/engine-features.ts` for native vs parsed capability metadata.
- Show engine badges: Native reasoning, Parsed reasoning, Tools.
- Gate thinking toggle by variant support and show engine-specific hints.

### Phase 5: Tool Registry

- Add tool types and local registry.
- Implement calculator and current-time tools first.
- Add schema validation and timeout handling.
- Add tool activity UI.

### Phase 6: Tool-Calling Runtime

- Add tool-call events and parser support.
- Add multi-round tool loop with strict limits.
- Add prompt fallback for engines without native tool calling.
- Add tests for malformed tool calls and abort behavior.

## 5. Validation Checklist

- `pnpm build` passes.
- Model selector shows logical models and engine variants correctly.
- Switching between variants unloads only the previous incompatible engine/model.
- Vision upload is shown only for variants with `vision`.
- Thinking is stored separately from visible answer.
- TTS never speaks thinking, tool JSON, or tool traces.
- Tool calls cannot execute unless they match a registered tool schema.
- Tool loops stop after the configured round limit.
- Abort interrupts generation and tool execution cleanly.

## 6. Key Files To Touch

Expected files:

```txt
src/lib/llm-models.ts
src/lib/llm-model-ui.ts
src/lib/llm-runtime.ts
src/lib/llm/ai-sdk-stream.ts
src/lib/llm/engine-features.ts
src/lib/llm/parsers/
src/lib/tools/
src/hooks/use-voice-agent.ts
src/components/llm-model-selector.tsx
src/components/conversation-area.tsx
src/components/message-text.tsx
```

## 7. Design Principle

The voice agent should not branch on `gemma`, `qwen`, `webllm`, `transformers`, or custom kernels. It should only consume:

- selected variant metadata,
- structured stream events,
- tool-call events,
- and normalized runtime status.

All model-specific formatting, thinking parsing, tool-call parsing, and engine loading should stay inside the catalog, parser, and engine adapter layers.
