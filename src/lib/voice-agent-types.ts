import { DEFAULT_LLM_ID } from "@/lib/llm-models"

import type { LLMToolCall, LLMToolResult } from '@/lib/tools/types'

export type VoiceAgentStatus =
  | "idle"
  | "loading"
  | "ready"
  | "listening"
  | "recording"
  | "transcribing"
  | "thinking"
  | "synthesizing"
  | "speaking"
  | "error"

export type SetupPhase = "selecting" | "loading" | "ready"

export interface LLMMetrics {
  timeToFirstTokenMs?: number
  tokensPerSecond?: number
  totalTokens?: number
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  createdAt?: number
  thinking?: string
  image?: string
  audioUrl?: string
  metrics?: LLMMetrics
  toolCalls?: LLMToolCall[]
  toolResults?: LLMToolResult[]
}

export interface DebugInfo {
  webgpu: string
  sttBackend: string
  llmMode: string
  vadLoaded: boolean
  sttLoaded: boolean
  ttsLoaded: boolean
  llmLoaded: boolean
}

export const INITIAL_DEBUG_INFO: DebugInfo = {
  webgpu: "checking...",
  sttBackend: "unknown",
  llmMode: DEFAULT_LLM_ID,
  vadLoaded: false,
  sttLoaded: false,
  ttsLoaded: false,
  llmLoaded: false,
}

export interface LoadProgress {
  label: string
  progress: number
  color: string
}
