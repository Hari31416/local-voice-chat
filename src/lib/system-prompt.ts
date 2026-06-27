import { detectLanguage } from "@/lib/supertonic3/engine"

const LANGUAGE_RULES = `Language (critical):
- Reply in the same language the user just used.
- Hindi query → Hindi reply (Devanagari script).
- English query → English reply.
- Mixed Hindi-English (Hinglish) → match that mix naturally.
- Do not switch to English unless the user wrote in English.`

const VOICE_SYSTEM_PROMPT = `You are a warm, helpful voice assistant in a hands-free chat.

${LANGUAGE_RULES}

Style:
- Keep answers short: 1-3 sentences, easy to speak aloud.
- Be conversational, not formal or robotic.
- No emojis, markdown, or bullet lists.`

const TEXT_SYSTEM_PROMPT = `You are a warm, helpful assistant in a text chat.

${LANGUAGE_RULES}

Style:
- Give clear, complete answers. Use as much detail as the question needs.
- Markdown, lists, and code blocks are fine when they help readability.
- Be conversational but thorough — the user is reading, not listening.`

export const LLM_MAX_TOKENS = {
  webllm: { voice: 256, text: 1024 },
  gemma4: { voice: 128, text: 512 },
} as const

export function getMaxTokens(
  backend: "webllm" | "gemma4",
  ttsEnabled: boolean,
): number {
  return ttsEnabled ? LLM_MAX_TOKENS[backend].voice : LLM_MAX_TOKENS[backend].text
}

function turnHint(lastUserMessage: string): string {
  const lang = detectLanguage(lastUserMessage)
  if (lang === "hi") {
    return "This turn: the user wrote in Hindi. Reply only in Hindi using Devanagari script."
  }
  if (lang === "na") {
    return "This turn: the user wrote in Hinglish. Match their Hindi-English mix."
  }
  return "This turn: the user wrote in English. Reply in English."
}

export function buildSystemPrompt(lastUserMessage: string, ttsEnabled = true): string {
  const base = ttsEnabled ? VOICE_SYSTEM_PROMPT : TEXT_SYSTEM_PROMPT
  return `${base}\n\n${turnHint(lastUserMessage)}`
}
