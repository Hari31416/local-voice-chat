import { Fragment, type ReactNode } from "react"

/** Insert breaks before inline numbered / bullet list markers when the model omits newlines. */
function normalizeLineBreaks(text: string): string {
  return text
    .replace(/ (?=\d+\.\s)/g, "\n")
    .replace(/ (?=-\s)/g, "\n")
}

const INLINE_MARKDOWN =
  /\*\*(.+?)\*\*|__(.+?)__|(?<![\w*])\*([^*\n]+?)\*(?![\w*])|(?<![\w])_([^_\n]+?)_(?![\w])/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let index = 0

  INLINE_MARKDOWN.lastIndex = 0
  while ((match = INLINE_MARKDOWN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const key = `${keyPrefix}-${index++}`
    const bold = match[1] ?? match[2]
    const italicStar = match[3]
    const italicUnderscore = match[4]

    if (bold) {
      nodes.push(
        <strong key={key} className="font-semibold text-inherit">
          {bold}
        </strong>,
      )
    } else {
      nodes.push(
        <em key={key} className="italic text-inherit">
          {italicStar ?? italicUnderscore}
        </em>,
      )
    }

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes.length > 0 ? nodes : [text]
}

interface MessageTextProps {
  children: string
  className?: string
}

export function MessageText({ children, className }: MessageTextProps) {
  const normalized = normalizeLineBreaks(children)
  const lines = normalized.split("\n")

  return (
    <div className={className}>
      {lines.map((line, lineIndex) => (
        <Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {renderInline(line, `line-${lineIndex}`)}
        </Fragment>
      ))}
    </div>
  )
}
