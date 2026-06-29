import { BaseStreamParser } from './index'

export class QwenStreamParser extends BaseStreamParser {
  protected override parse(cleanText: string) {
    const cleanTextVal = cleanText
      .replace(/<\|im_end\|>/g, '')
      .replace(/<\|im_start\|>/g, '')

    let thinkStart = cleanTextVal.indexOf('<think>')
    let tagLength = '<think>'.length
    let closeTag = '</think>'

    if (thinkStart === -1) {
      thinkStart = cleanTextVal.indexOf('<thinking>')
      tagLength = '<thinking>'.length
      closeTag = '</thinking>'
    }

    if (thinkStart === -1) {
      return { text: cleanTextVal, thinking: '' }
    }

    const thinkEnd = cleanTextVal.indexOf(closeTag, thinkStart)
    if (thinkEnd === -1) {
      const thinking = cleanTextVal.slice(thinkStart + tagLength)
      const text = cleanTextVal.slice(0, thinkStart)
      return {
        text: text.replace(/^[\s\n]+/, ''),
        thinking: thinking.replace(/^[\s\n]+/, ''),
      }
    } else {
      const thinking = cleanTextVal.slice(thinkStart + tagLength, thinkEnd)
      const textBefore = cleanTextVal.slice(0, thinkStart)
      const textAfter = cleanTextVal.slice(thinkEnd + closeTag.length)

      const cleanTextOut =
        textBefore +
        textAfter.replace(/^[\s\n]+/, '')

      const cleanThinkingVal = thinking.replace(/^[\s\n]+/, '')

      return { text: cleanTextOut, thinking: cleanThinkingVal }
    }
  }
}
