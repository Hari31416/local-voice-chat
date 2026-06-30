import { detectLanguage } from '@/lib/supertonic3/engine'
import type { VoiceProfile } from '@/lib/tts-voices'

const ENGLISH_LANGUAGE_RULES = `Language (critical):
- Reply in English. Do not write in any other language.`

const HINDI_LANGUAGE_RULES = `Language (critical):
- Reply in Hindi using Devanagari script. Do not write in English.`

const HINGLISH_LANGUAGE_RULES = `Language (critical):
- Reply in Hinglish (mixed Hindi-English). Match the user's mix naturally.`

function voicePersonaRules(profile: VoiceProfile, lang: string): string {
  if (lang === 'hi' || lang === 'na') {
    const hindiExamples =
      profile.gender === 'female'
        ? 'करती हूँ, बताती हूँ, जानती हूँ, सकती हूँ'
        : 'करता हूँ, बताता हूँ, जानता हूँ, सकता हूँ'

    return `Voice persona (critical when speaking aloud):
- You are voiced as ${profile.label}, a ${profile.gender} speaker.
- When the language has grammatical gender, use ${profile.gender} first-person forms when you refer to yourself.
- In Hindi, prefer ${profile.gender} verb endings (e.g. ${hindiExamples}) for self-reference.
- Do not change the user's gender; only match your own spoken persona.`
  }

  return `Voice persona:
- You are voiced as ${profile.label}, a ${profile.gender} speaker.`
}

export function buildSystemPrompt(
  lastUserMessage: string,
  ttsEnabled = true,
  voiceProfile: VoiceProfile | null = null
): string {
  const lang = detectLanguage(lastUserMessage)

  let langRules = ENGLISH_LANGUAGE_RULES
  if (lang === 'hi') {
    langRules = HINDI_LANGUAGE_RULES
  } else if (lang === 'na') {
    langRules = HINGLISH_LANGUAGE_RULES
  }

  const basePrompt = ttsEnabled
    ? `You are a warm, helpful voice assistant in a hands-free chat.

${langRules}

Style & Constraints (Critical for Voice):
- Be helpful, direct, and answer the question immediately. Do not deflect or reply with open-ended conversational filler.
- Keep answers concise (1-3 sentences) so they are easy to speak and listen to. This limit applies ONLY to your final spoken message.
- Speak naturally, directly, and conversationally.
- DO NOT output any markdown, emojis, bullet lists, asterisks, or parenthetical actions (e.g., do not write *laughs*, (smiles), *giggles*, or parenthetical directions) in your spoken replies, as they will be read literally by the text-to-speech reader. Only output direct spoken speech.`
    : `You are a warm, helpful assistant in a text chat.

${langRules}

Style:
- Give clear, complete answers. Use as much detail as the question needs.
- Markdown, lists, and code blocks are fine when they help readability.
- Be conversational but thorough — the user is reading, not listening.`

  const persona = ttsEnabled && voiceProfile ? `\n\n${voicePersonaRules(voiceProfile, lang)}` : ''

  let turnText = 'This turn: the user wrote in English. Reply in English.'
  if (lang === 'hi') {
    turnText = 'This turn: the user wrote in Hindi. Reply only in Hindi using Devanagari script.'
  } else if (lang === 'na') {
    turnText = 'This turn: the user wrote in Hinglish. Match their Hindi-English mix.'
  }

  return `${basePrompt}${persona}\n\n${turnText}`
}
