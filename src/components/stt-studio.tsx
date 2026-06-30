import { useState, useRef, useEffect } from "react"
import { Mic, Upload, Copy, Check, FileAudio, AudioLines, RefreshCw, Square, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StudioPageHeader, studioPageClass } from "@/components/studio-page-header"
import { cn } from "@/lib/utils"
import { STT_OPTIONS } from "@/lib/stt-models"
import type { STTModelOption } from "@/lib/stt-models"

const STT_ENGINE_GROUP_LABELS: Record<string, string> = {
  whisper: 'Whisper',
  distil: 'Distil-Whisper',
  moonshine: 'Moonshine',
  wav2vec2: 'Wav2Vec2 / MMS',
}

function getModelGroup(opt: STTModelOption): string {
  if (opt.id.startsWith('distil')) return 'distil'
  if (opt.id.startsWith('whisper')) return 'whisper'
  if (opt.id.startsWith('moonshine')) return 'moonshine'
  if (opt.id.startsWith('wav2vec2')) return 'wav2vec2'
  return 'other'
}

function groupSTTOptions(options: STTModelOption[]): { label: string; opts: STTModelOption[] }[] {
  const map = new Map<string, STTModelOption[]>()
  for (const opt of options) {
    const key = getModelGroup(opt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(opt)
  }
  return Array.from(map.entries()).map(([key, opts]) => ({
    label: STT_ENGINE_GROUP_LABELS[key] ?? key,
    opts,
  }))
}

function sttOptionLabel(opt: STTModelOption): string {
  return `${opt.name} (${opt.sizeLabel})`
}

interface STTStudioProps {
  isSttLoaded: boolean
  sttLoadProgress: number
  sttTranscriptResult: string | null
  setSttTranscriptResult: (text: string | null) => void
  sttTranscribing: boolean
  statusMessage: string
  loadSTTOnly: (modelId?: string) => Promise<void>
  transcribeAudioBuffer: (buffer: Float32Array) => void
  sttModelId?: string
}

export function STTStudio({
  isSttLoaded,
  sttLoadProgress,
  sttTranscriptResult,
  setSttTranscriptResult,
  sttTranscribing,
  statusMessage,
  loadSTTOnly,
  transcribeAudioBuffer,
  sttModelId = "whisper-base",
}: STTStudioProps) {
  const [selectedModelId, setSelectedModelId] = useState(sttModelId)

  useEffect(() => {
    setSelectedModelId(sttModelId)
  }, [sttModelId])

  const selectedStt = STT_OPTIONS.find((s) => s.id === selectedModelId) || STT_OPTIONS[3]
  const [recording, setRecording] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [audioFileName, setAudioFileName] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [loadingModel, setLoadingModel] = useState(false)

  useEffect(() => {
    if (isSttLoaded) {
      setLoadingModel(false)
    }
  }, [isSttLoaded])

  const handleLoadSTT = async () => {
    setLoadingModel(true)
    await loadSTTOnly(selectedModelId)
  }

  const resampleAudio = async (blob: Blob): Promise<Float32Array> => {
    const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const arrayBuffer = await blob.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

    const targetSampleRate = 16000
    const offlineCtx = new OfflineAudioContext(
      1,
      Math.round(audioBuffer.duration * targetSampleRate),
      targetSampleRate
    )

    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineCtx.destination)
    source.start()

    const renderedBuffer = await offlineCtx.startRendering()
    return renderedBuffer.getChannelData(0)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType })
        setAudioFileName("Microphone Recording")
        try {
          const float32PCM = await resampleAudio(audioBlob)
          transcribeAudioBuffer(float32PCM)
        } catch (err) {
          console.error("Audio resampling failed:", err)
        }
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime((p) => p + 1)
      }, 1000)
    } catch (err) {
      console.error("Failed to access microphone:", err)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop()
      setRecording(false)
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
    }
  }

  const processAudioFile = async (file: File) => {
    if (!isSttLoaded) {
      alert("Please load the Whisper models first.")
      return
    }
    setAudioFileName(file.name)
    try {
      const float32PCM = await resampleAudio(file)
      transcribeAudioBuffer(float32PCM)
    } catch (err) {
      console.error("File processing failed:", err)
      alert("Could not process audio file. Make sure it is a valid audio format.")
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("audio/")) {
      await processAudioFile(file)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processAudioFile(file)
    }
  }

  const handleCopy = () => {
    if (sttTranscriptResult) {
      navigator.clipboard.writeText(sttTranscriptResult)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current)
      }
    }
  }, [])

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0")
    const s = (secs % 60).toString().padStart(2, "0")
    return `${m}:${s}`
  }

  return (
    <div className={studioPageClass}>
      <StudioPageHeader
        eyebrow="Speech-to-Text"
        title="STT Studio"
        description="Transcribe voice or audio files on-device. Your data never leaves the browser."
        accent="amber"
      />

      {!isSttLoaded ? (
        <div className="glass-panel rounded-2xl p-6 sm:p-10 text-center space-y-5 max-w-lg mx-auto">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto">
            <AudioLines className="h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold text-white mb-1">Load speech model</h2>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Download {selectedStt.name} ({selectedStt.sizeLabel}) to transcribe on-device.
            </p>
          </div>
          {loadingModel || (sttLoadProgress > 0 && sttLoadProgress < 100) ? (
            <div className="space-y-2.5">
              <div className="flex justify-between text-xs text-zinc-500 font-medium">
                <span>{statusMessage || "Starting download..."}</span>
                <span className="text-amber-400 font-mono">{sttLoadProgress}%</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-350 rounded-full"
                  style={{ width: `${sttLoadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Select model</label>
                <select
                  value={selectedModelId}
                  onChange={(e) => setSelectedModelId(e.target.value)}
                  className="studio-input w-full px-3 py-2 text-xs cursor-pointer"
                >
                  {groupSTTOptions(STT_OPTIONS).map(({ label, opts }) => (
                    <optgroup key={label} label={label}>
                      {opts.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {sttOptionLabel(opt)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleLoadSTT}
                className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold px-6 py-5 rounded-xl text-sm cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Load speech recognition model
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Input panel */}
          <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4 sm:space-y-5">
            <div className="space-y-1.5">
              <label className="text-zinc-500 text-[10px] uppercase tracking-wider font-semibold">Active model</label>
              <select
                value={selectedModelId}
                disabled={sttTranscribing}
                onChange={async (e) => {
                  const val = e.target.value
                  setSelectedModelId(val)
                  setLoadingModel(true)
                  await loadSTTOnly(val)
                }}
                className="studio-input w-full px-3 py-2 text-xs cursor-pointer disabled:opacity-50"
              >
                {groupSTTOptions(STT_OPTIONS).map(({ label, opts }) => (
                  <optgroup key={label} label={label}>
                    {opts.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {sttOptionLabel(opt)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Mic */}
            <div className="flex flex-col items-center justify-center p-8 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-4">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Voice input</span>

              <div className="relative">
                {recording && (
                  <div className="absolute inset-0 bg-red-500/15 rounded-full animate-ping" />
                )}
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={sttTranscribing && !recording}
                  className={cn(
                    "relative h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300",
                    recording
                      ? "bg-red-500/20 border-2 border-red-500/50 text-red-400"
                      : "bg-white/[0.04] border-2 border-white/[0.08] text-zinc-400 hover:text-white hover:border-amber-500/30 hover:bg-amber-500/5 disabled:opacity-50",
                  )}
                >
                  {recording ? <Square className="h-7 w-7 fill-current" /> : <Mic className="h-8 w-8" />}
                </button>
              </div>

              {recording ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-red-400 font-semibold">Recording</span>
                  </div>
                  <span className="text-lg font-mono text-zinc-300 tabular-nums">{formatTime(recordingTime)}</span>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-2 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-semibold rounded-full transition-all border border-red-500/30"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-600">Tap to speak</span>
              )}
            </div>

            {/* File upload */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center space-y-2.5",
                isDragging
                  ? "bg-amber-500/8 border-amber-500/40 text-amber-300"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.14] text-zinc-500",
              )}
            >
              <Upload className="h-6 w-6" />
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-300 font-medium">Drop audio files here</p>
                <p className="text-[10px] text-zinc-600">WAV, MP3, M4A, and more</p>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  disabled={sttTranscribing}
                  className="hidden"
                />
                <span className="inline-block mt-1 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 hover:text-white text-[11px] font-semibold rounded-lg border border-white/[0.08] transition-all">
                  Browse files
                </span>
              </label>
            </div>
          </div>

          {/* Transcript panel */}
          <div className="glass-panel rounded-2xl p-5 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="font-semibold text-white text-sm">Transcription</span>
              </div>
              {audioFileName && (
                <span className="text-[10px] font-mono text-zinc-600 line-clamp-1 max-w-[140px]" title={audioFileName}>
                  {audioFileName}
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              {sttTranscribing ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-amber-400 animate-spin" />
                  <p className="text-xs text-zinc-500 font-medium">{statusMessage}</p>
                </div>
              ) : sttTranscriptResult !== null ? (
                sttTranscriptResult.startsWith('[Error:') ? (
                  <div className="flex-1 bg-red-500/8 border border-red-500/20 rounded-xl p-4 text-sm text-red-300 overflow-y-auto leading-relaxed min-h-[200px] flex flex-col gap-2">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Failed</span>
                    <p className="text-xs text-red-300/80">{sttTranscriptResult.replace('[Error: ', '').replace(']', '')}</p>
                  </div>
                ) : sttTranscriptResult.trim() === '' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2">
                    <FileAudio className="h-8 w-8 text-amber-700/40 mb-1" />
                    <p className="text-xs text-amber-500/80 font-semibold">No speech detected</p>
                    <p className="text-[10px] text-zinc-600">Try speaking louder or recording a longer clip.</p>
                  </div>
                ) : (
                  <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-sm text-zinc-200 overflow-y-auto leading-relaxed select-text min-h-[200px]">
                    {sttTranscriptResult}
                  </div>
                )
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <FileAudio className="h-10 w-10 text-zinc-700 mb-3" />
                  <p className="text-xs text-zinc-600 font-medium">Record or upload audio to see transcription.</p>
                </div>
              )}
            </div>

            {sttTranscriptResult !== null && sttTranscriptResult.trim() !== '' && !sttTranscriptResult.startsWith('[Error:') && !sttTranscribing && (
              <div className="flex gap-2 pt-4 mt-4 border-t border-white/[0.06]">
                <Button
                  onClick={handleCopy}
                  className="flex-1 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 font-semibold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-white/[0.08]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy transcript</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setSttTranscriptResult(null)
                    setAudioFileName(null)
                  }}
                  variant="outline"
                  className="border-white/[0.08] text-zinc-500 hover:bg-white/[0.06] text-xs py-3 px-4 rounded-xl"
                >
                  Clear
                </Button>
              </div>
            )}
            {sttTranscriptResult !== null && (sttTranscriptResult.trim() === '' || sttTranscriptResult.startsWith('[Error:')) && !sttTranscribing && (
              <div className="flex justify-end pt-3 mt-3 border-t border-white/[0.06]">
                <Button
                  onClick={() => {
                    setSttTranscriptResult(null)
                    setAudioFileName(null)
                  }}
                  variant="outline"
                  className="border-white/[0.08] text-zinc-500 hover:bg-white/[0.06] text-xs py-2 px-4 rounded-xl"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
