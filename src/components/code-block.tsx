import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
}

const TOKEN_REGEX = /(\/\*[\s\S]*?\*\/|\/\/.*|#.*|`[\s\S]*?`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:const|let|var|function|return|import|export|class|if|else|for|while|do|switch|case|break|continue|default|typeof|instanceof|new|this|super|extends|try|catch|finally|throw|async|await|yield|def|lambda|pass|in|is|not|and|or|elif|except|raise|with|as|global|nonlocal|assert|del|interface|type|public|private|protected|readonly|implements|package)\b|\b(?:true|false|null|undefined|None|NaN)\b|\b\d+(?:\.\d+)?\b|\b\w+(?=\()|[+\-*/%=!&|^~<>?]+|[{}[\]()::,.;])/g

function classifyToken(token: string): string {
  if (token.startsWith('/*') || token.startsWith('//') || token.startsWith('#')) {
    return 'text-zinc-500 italic'
  }
  if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) {
    return 'text-amber-300'
  }
  if (/^\d+(?:\.\d+)?$/.test(token)) {
    return 'text-orange-400'
  }
  if (/^(?:const|let|var|function|return|import|export|class|if|else|for|while|do|switch|case|break|continue|default|typeof|instanceof|new|this|super|extends|try|catch|finally|throw|async|await|yield|def|lambda|pass|in|is|not|and|or|elif|except|raise|with|as|global|nonlocal|assert|del|interface|type|public|private|protected|readonly|implements|package)$/.test(token)) {
    return 'text-pink-400 font-semibold'
  }
  if (/^(?:true|false|null|undefined|None|NaN)$/.test(token)) {
    return 'text-violet-400 font-semibold'
  }
  if (/^[+\-*/%=!&|^~<>?]+$/.test(token)) {
    return 'text-sky-400'
  }
  if (/^[{}[\]()::,.;]$/.test(token)) {
    return 'text-zinc-400'
  }
  if (/^\w+$/.test(token)) {
    return 'text-blue-400'
  }
  return 'text-zinc-200'
}

export function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code: ', err)
    }
  }

  const parts = code.split(TOKEN_REGEX)

  return (
    <div className='w-full my-3 rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden shadow-md'>
      <div className='flex items-center justify-between px-4 py-1.5 bg-zinc-900 border-b border-zinc-800/80 text-zinc-400 text-xs font-mono select-none'>
        <span className='text-[11px] font-semibold tracking-wider text-zinc-400 uppercase'>{language}</span>
        <button
          onClick={handleCopy}
          className='flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/40 hover:bg-zinc-800 text-[11px] font-medium transition-colors cursor-pointer text-zinc-300'
          title='Copy code'
        >
          {copied ? (
            <>
              <Check className='h-3 w-3 text-emerald-400' />
              <span className='text-emerald-400'>Copied</span>
            </>
          ) : (
            <>
              <Copy className='h-3 w-3' />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className='p-4 overflow-x-auto font-mono text-xs leading-relaxed max-w-full text-zinc-200'>
        <code>
          {parts.map((part, index) => {
            if (index % 2 === 0) {
              return part
            }
            return (
              <span key={index} className={classifyToken(part)}>
                {part}
              </span>
            )
          })}
        </code>
      </pre>
    </div>
  )
}
