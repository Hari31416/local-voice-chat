import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Square, Send, Brain } from 'lucide-react'
import { LiveWaveform } from '@/components/ui/live-waveform'
import type { VoiceAgentStatus } from '@/lib/voice-agent-types'
import type { useTTS } from '@/hooks/use-tts'
import { cn } from '@/lib/utils'

interface ActiveCallScreenProps {
  status: VoiceAgentStatus
  isMicMuted: boolean
  onToggleMicMute: () => void
  onEndCall: () => void
  waveformActive: boolean
  waveformProcessing: boolean
  waveformAnalyser?: AnalyserNode | null
  isGenerating: boolean
  onStopGeneration: () => void
  onForceSubmitSTT?: () => void
  tts: ReturnType<typeof useTTS>
  globalAnalyser: AnalyserNode | null
}

export function ActiveCallScreen({
  status,
  isMicMuted,
  onToggleMicMute,
  onEndCall,
  waveformActive,
  waveformProcessing,
  waveformAnalyser,
  isGenerating,
  onStopGeneration,
  onForceSubmitSTT,
  tts,
  globalAnalyser,
}: ActiveCallScreenProps) {
  const isSpeaking = status === 'speaking' || status === 'synthesizing'
  const activeAnalyser = isSpeaking ? globalAnalyser : waveformAnalyser
  const isWaveformActive = waveformActive || isSpeaking

  let statusText = 'Ready'
  let statusColorClass = 'text-zinc-400'
  let pulseColorClass = 'bg-zinc-400'
  let ringGlowClass = 'shadow-zinc-500/20 border-zinc-500/30 bg-zinc-500/10'
  let waveColorClass = 'text-zinc-600'

  if (isMicMuted) {
    statusText = 'Muted'
    statusColorClass = 'text-red-400 font-semibold'
    pulseColorClass = 'bg-red-400'
    ringGlowClass = 'shadow-red-500/30 border-red-500/20 bg-red-500/5 animate-pulse'
    waveColorClass = 'text-red-500/30'
  } else {
    switch (status) {
      case 'listening':
      case 'recording':
        statusText = 'Listening...'
        statusColorClass = 'text-emerald-400 font-semibold animate-pulse'
        pulseColorClass = 'bg-emerald-400 animate-ping'
        ringGlowClass = 'shadow-emerald-500/40 border-emerald-500/30 bg-emerald-500/10 animate-call-pulse-emerald'
        waveColorClass = 'text-emerald-400'
        break
      case 'transcribing':
        statusText = 'Processing voice...'
        statusColorClass = 'text-blue-400 font-semibold animate-pulse'
        pulseColorClass = 'bg-blue-400'
        ringGlowClass = 'shadow-blue-500/30 border-blue-500/20 bg-blue-500/10 animate-pulse'
        waveColorClass = 'text-blue-400'
        break
      case 'thinking':
        statusText = 'Thinking...'
        statusColorClass = 'text-teal-400 font-semibold animate-pulse'
        pulseColorClass = 'bg-teal-400 animate-pulse'
        ringGlowClass = 'shadow-teal-500/40 border-teal-500/30 bg-teal-500/10 animate-call-pulse-teal'
        waveColorClass = 'text-teal-400'
        break
      case 'synthesizing':
        statusText = `Synthesizing speech (${tts.synthesisProgress}%)...`
        statusColorClass = 'text-indigo-400 font-semibold animate-pulse'
        pulseColorClass = 'bg-indigo-400 animate-pulse'
        ringGlowClass = 'shadow-indigo-500/30 border-indigo-500/20 bg-indigo-500/10 animate-pulse'
        waveColorClass = 'text-indigo-400'
        break
      case 'speaking':
        statusText = 'Speaking...'
        statusColorClass = 'text-violet-400 font-semibold'
        pulseColorClass = 'bg-violet-400 animate-ping'
        ringGlowClass = 'shadow-violet-500/40 border-violet-500/30 bg-violet-500/10 animate-call-pulse-violet'
        waveColorClass = 'text-violet-400'
        break
      case 'error':
        statusText = 'Error'
        statusColorClass = 'text-red-500 font-semibold'
        pulseColorClass = 'bg-red-500'
        ringGlowClass = 'shadow-red-500/40 border-red-500/30 bg-red-500/10'
        waveColorClass = 'text-red-600'
        break
      default:
        statusText = 'Connected'
        statusColorClass = 'text-zinc-400'
        pulseColorClass = 'bg-zinc-500'
        ringGlowClass = 'shadow-zinc-500/20 border-zinc-500/20 bg-zinc-500/5'
        waveColorClass = 'text-zinc-700'
        break
    }
  }

  return (
    <div className='flex-1 flex flex-col justify-between items-center px-6 py-10 md:py-16 min-h-[calc(100vh-2rem)] select-none'>
      <div className='text-center space-y-2 mt-4 animate-fade-up'>
        <h2 className='text-2xl md:text-3xl font-display font-extrabold text-white tracking-tight'>
          WebVoice Call
        </h2>
        <div className='flex items-center justify-center gap-2'>
          <span className={cn('h-2 w-2 rounded-full', pulseColorClass)} />
          <span className={cn('text-xs md:text-sm tracking-wide font-medium', statusColorClass)}>
            {statusText}
          </span>
        </div>
      </div>

      <div className='relative flex items-center justify-center my-8'>
        <div className={cn('absolute rounded-full w-56 h-56 border transition-all duration-700 opacity-20 scale-[0.8] blur-sm', ringGlowClass)} />
        <div className={cn('absolute rounded-full w-48 h-48 border transition-all duration-700 opacity-40 scale-[0.9] blur-xs', ringGlowClass)} />
        <div className={cn('absolute rounded-full w-38 h-38 border transition-all duration-700 opacity-70', ringGlowClass)} />

        <button
          onClick={onToggleMicMute}
          className={cn(
            'relative z-10 w-28 h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border cursor-pointer',
            isMicMuted
              ? 'bg-red-950/40 border-red-500/40 hover:bg-red-900/40 hover:scale-[1.04]'
              : status === 'listening' || status === 'recording'
                ? 'bg-emerald-950/30 border-emerald-500/40 hover:bg-emerald-900/30 hover:scale-[1.04]'
                : status === 'thinking'
                  ? 'bg-teal-950/30 border-teal-500/40 hover:bg-teal-900/30 hover:scale-[1.04]'
                  : status === 'speaking'
                    ? 'bg-violet-950/30 border-violet-500/40 hover:bg-violet-900/30 hover:scale-[1.04]'
                    : 'bg-zinc-900/50 border-zinc-700 hover:border-zinc-500 hover:scale-[1.04]'
          )}
          title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMicMuted ? (
            <MicOff className='h-10 w-10 text-red-400' />
          ) : status === 'thinking' ? (
            <Brain className='h-10 w-10 text-teal-400 animate-pulse' />
          ) : status === 'speaking' ? (
            <Volume2 className='h-10 w-10 text-violet-400 animate-bounce' />
          ) : (
            <Mic className='h-10 w-10 text-emerald-400' />
          )}
        </button>
      </div>

      <div className='w-full max-w-lg px-4 flex flex-col items-center gap-2'>
        <div className='w-full h-16 flex items-center'>
          <LiveWaveform
            active={isWaveformActive}
            processing={waveformProcessing}
            sharedAnalyser={activeAnalyser}
            barWidth={4}
            barGap={3}
            barRadius={2}
            fadeEdges={true}
            fadeWidth={36}
            sensitivity={isSpeaking ? 1.8 : 3.0}
            smoothingTimeConstant={0.75}
            height={48}
            mode='static'
            className={cn('w-full transition-all duration-300', waveColorClass)}
          />
        </div>
      </div>

      <div className='w-full max-w-sm flex items-center justify-center gap-6 mt-6 animate-fade-up'>
        <button
          onClick={() => tts.setMuted(!tts.muted)}
          className={cn(
            'p-3 rounded-full border bg-white/[0.03] transition-all cursor-pointer shadow-md',
            tts.muted
              ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
              : 'border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
          )}
          title={tts.muted ? 'Unmute Speaker' : 'Mute Speaker'}
        >
          {tts.muted ? <VolumeX className='h-5 w-5' /> : <Volume2 className='h-5 w-5' />}
        </button>

        <button
          onClick={onEndCall}
          className='h-14 w-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 hover:shadow-red-500/40 transition-all duration-300 hover:scale-[1.08] cursor-pointer'
          title='End Call'
        >
          <PhoneOff className='h-6 w-6' />
        </button>

        {isGenerating ? (
          <button
            onClick={onStopGeneration}
            className='p-3 rounded-full border border-amber-500/30 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 transition-all cursor-pointer shadow-md'
            title='Stop Assistant Speaking'
          >
            <Square className='h-5 w-5 fill-current' />
          </button>
        ) : (status === 'listening' || status === 'recording') && onForceSubmitSTT ? (
          <button
            onClick={onForceSubmitSTT}
            className='p-3 rounded-full border border-emerald-500/30 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-all cursor-pointer shadow-md'
            title='Force Submit Speech'
          >
            <Send className='h-5 w-5' />
          </button>
        ) : (
          <div className='w-12 h-12' />
        )}
      </div>
    </div>
  )
}
