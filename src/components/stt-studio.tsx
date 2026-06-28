import { useState, useRef, useEffect } from "react"
import { Mic, MicOff, Upload, Copy, Check, FileAudio, AudioLines, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { STT_OPTIONS } from "@/lib/stt-models"

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

  // Resample helper
  const resampleAudio = async (blob: Blob): Promise<Float32Array> => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
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
    <div className="max-w-3xl mx-auto w-full px-4 py-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          STT Studio
        </h1>
        <p className="text-zinc-400 text-sm max-w-lg mx-auto">
          Transcribe voice messages or audio files completely in your browser, keeping your data private.
        </p>
      </div>

      {!isSttLoaded ? (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8 text-center space-y-4 backdrop-blur-xl">
          <AudioLines className="h-12 w-12 text-zinc-600 mx-auto animate-pulse" />
          <h2 className="text-lg font-bold text-white">Speech Recognition Model Required ({selectedStt.name})</h2>
          <p className="text-zinc-400 text-xs max-w-sm mx-auto">
            This module requires downloading local Whisper model ({selectedStt.sizeLabel}) and VAD systems to run on-device.
          </p>
          {loadingModel || (sttLoadProgress > 0 && sttLoadProgress < 100) ? (
            <div className="max-w-xs mx-auto space-y-2">
              <div className="flex justify-between text-xs text-zinc-400 font-semibold">
                <span>{statusMessage || "Starting download..."}</span>
                <span className="text-emerald-400">{sttLoadProgress}%</span>
              </div>
              <div className="h-2 bg-zinc-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-350"
                  style={{ width: `${sttLoadProgress}%` }}
                />
              </div>
            </div>
          ) : (
              <div className="max-w-xs mx-auto space-y-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Select Speech Model</label>
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer hover:border-zinc-700 focus:border-zinc-600 transition-colors"
                  >
                    {STT_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white">
                        {opt.name} ({opt.sizeLabel})
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={handleLoadSTT}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-5 rounded-xl text-xs cursor-pointer"
                >
                  Load Speech Recognition Model
                </Button>
              </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Controls Panel */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-5 backdrop-blur-xl">
              {/* Active Speech Model Dropdown */}
              <div className="space-y-1.5">
                <label className="text-zinc-400 text-[10px] uppercase tracking-wider font-semibold">Active Speech Model</label>
                <select
                  value={selectedModelId}
                  disabled={sttTranscribing}
                  onChange={async (e) => {
                    const val = e.target.value
                    setSelectedModelId(val)
                    setLoadingModel(true)
                    await loadSTTOnly(val)
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none cursor-pointer hover:border-zinc-700 focus:border-zinc-600 transition-colors disabled:opacity-50"
                >
                  {STT_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id} className="bg-zinc-950 text-white">
                      {opt.name} ({opt.sizeLabel})
                    </option>
                  ))}
                </select>
              </div>

            {/* Record Box */}
            <div className="flex flex-col items-center justify-center p-6 bg-zinc-950/40 border border-zinc-850 rounded-xl space-y-4">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Voice Input</span>

              <div className="relative">
                {recording && (
                  <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                )}
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  disabled={sttTranscribing}
                  className={cn(
                    "h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl",
                    recording
                      ? "bg-red-600 text-white hover:bg-red-750"
                      : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-50"
                  )}
                >
                  {recording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </button>
              </div>

              {recording ? (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-red-500 font-bold animate-pulse">Recording...</span>
                  <span className="text-sm font-mono text-zinc-300">{formatTime(recordingTime)}</span>
                </div>
              ) : (
                <span className="text-xs text-zinc-500">Tap mic to speak</span>
              )}
            </div>

            {/* File Upload Box */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-all flex flex-col items-center justify-center space-y-2.5",
                isDragging
                  ? "bg-emerald-950/15 border-emerald-500 text-emerald-400"
                  : "bg-zinc-950/20 border-zinc-800 hover:border-zinc-700 text-zinc-500"
              )}
            >
              <Upload className="h-7 w-7 text-zinc-500" />
              <div className="space-y-1">
                <p className="text-xs text-zinc-300 font-semibold">Drag & drop audio files here</p>
                <p className="text-[10px] text-zinc-500">Supports WAV, MP3, M4A, etc.</p>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileChange}
                  disabled={sttTranscribing}
                  className="hidden"
                />
                <span className="inline-block mt-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[11px] font-semibold rounded-lg border border-zinc-700/50 transition-all">
                  Browse Files
                </span>
              </label>
            </div>
          </div>

          {/* Transcript Panel */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl min-h-[350px]">
            <div className="space-y-4 flex-1 flex flex-col">
              <div className="flex items-center justify-between text-zinc-300 border-b border-zinc-800/80 pb-2 text-sm">
                <span className="font-semibold">Transcription Result</span>
                {audioFileName && (
                  <span className="text-[10px] font-mono text-zinc-500 line-clamp-1 max-w-[150px]" title={audioFileName}>
                    {audioFileName}
                  </span>
                )}
              </div>

              {sttTranscribing ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
                  <p className="text-xs text-zinc-400 font-semibold">{statusMessage}</p>
                </div>
              ) : sttTranscriptResult ? (
                <div className="flex-1 bg-zinc-950/60 border border-zinc-850 rounded-xl p-3.5 text-sm text-zinc-100 overflow-y-auto leading-relaxed select-text min-h-[180px]">
                  {sttTranscriptResult}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <FileAudio className="h-8 w-8 text-zinc-700 mb-2" />
                  <p className="text-xs text-zinc-500 font-medium">Record voice or upload an audio file to view transcription.</p>
                </div>
              )}
            </div>

            {sttTranscriptResult && !sttTranscribing && (
              <div className="flex gap-2 pt-4 border-t border-zinc-850 mt-4">
                <Button
                  onClick={handleCopy}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold py-4 rounded-xl text-xs flex items-center justify-center gap-1.5 border border-zinc-750"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Transcript</span>
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => {
                    setSttTranscriptResult(null)
                    setAudioFileName(null)
                  }}
                  variant="outline"
                  className="border-zinc-800 text-zinc-500 hover:bg-zinc-800 text-xs py-4 px-4 rounded-xl"
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
