import { detectLanguage } from "@/lib/supertonic3/engine"
import type { VoiceProfile } from "@/lib/tts-voices"

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

function voicePersonaRules(profile: VoiceProfile): string {
  const hindiExamples =
    profile.gender === "female"
      ? "करती हूँ, बताती हूँ, जानती हूँ, सकती हूँ"
      : "करता हूँ, बताता हूँ, जानता हूँ, सकता हूँ"

  return `Voice persona (critical when speaking aloud):
- You are voiced as ${profile.label}, a ${profile.gender} speaker.
- When the language has grammatical gender, use ${profile.gender} first-person forms when you refer to yourself.
- In Hindi, prefer ${profile.gender} verb endings (e.g. ${hindiExamples}) for self-reference.
- Do not change the user's gender; only match your own spoken persona.`
}

export const LLM_MAX_TOKENS = {
  webllm: { voice: 256, text: 1024 },
  gemma4: { voice: 128, text: 512 },
  lfm2: { voice: 256, text: 1024 },
} as const

export function getMaxTokens(
  backend: "webllm" | "gemma4" | "lfm2",
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

export function buildSystemPrompt(
  lastUserMessage: string,
  ttsEnabled = true,
  voiceProfile: VoiceProfile | null = null,
): string {
  const base = ttsEnabled ? VOICE_SYSTEM_PROMPT : TEXT_SYSTEM_PROMPT
  const persona =
    ttsEnabled && voiceProfile ? `\n\n${voicePersonaRules(voiceProfile)}` : ""
  return `${base}${persona}\n\n${turnHint(lastUserMessage)}`
}
