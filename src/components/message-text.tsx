import { CodeBlock } from '@/components/code-block'
import Markdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

/** LLMs often emit table rows on one line; GFM needs a newline before each row. */
function normalizeMarkdown(text: string): string {
  return text.replace(/ \| (?=\|)/g, " |\n|")
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-inherit">{children}</strong>,
  em: ({ children }) => <em className="italic text-inherit">{children}</em>,
  h1: ({ children }) => (
    <h1 className="mb-2 text-base font-bold last:mb-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 text-sm font-bold last:mb-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 text-sm font-semibold last:mb-0">{children}</h3>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-zinc-600 pl-3 text-zinc-300 last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-zinc-700" />,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-emerald-400 underline underline-offset-2 hover:text-emerald-300"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children, ...props }) => {
    const codeStr = String(children).replace(/\n$/, '')
    const isBlock = Boolean(className) || codeStr.includes('\n')
    if (isBlock) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : 'text'
      return <CodeBlock code={codeStr} language={language} />
    }
    return (
      <code
        className='rounded bg-zinc-950/60 px-1.5 py-0.5 font-mono text-[0.9em] text-zinc-200'
        {...props}
      >
        {children}
      </code>
    )
  },
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto last:mb-0">
      <table className="w-full min-w-[280px] border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-zinc-600">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-zinc-700/60">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold text-zinc-200 first:pl-0 last:pr-0">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 align-top text-zinc-300 first:pl-0 last:pr-0">{children}</td>
  ),
}

interface MessageTextProps {
  children: string
  className?: string
  markdown?: boolean
}

export function MessageText({ children, className, markdown = false }: MessageTextProps) {
  if (!markdown) {
    return <div className={cn("whitespace-pre-wrap leading-relaxed", className)}>{children}</div>
  }

  return (
    <div className={cn("leading-relaxed", className)}>
      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {normalizeMarkdown(children)}
      </Markdown>
    </div>
  )
}
