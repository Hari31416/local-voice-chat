/** Decode a WAV blob (PCM16 or float32) into normalized Float32Array samples. */
export async function decodeWavBlob(
  blob: Blob,
): Promise<{ audio: Float32Array; sampling_rate: number }> {
  const buffer = await blob.arrayBuffer()
  const view = new DataView(buffer)

  if (readAscii(view, 0, 4) !== "RIFF" || readAscii(view, 8, 4) !== "WAVE") {
    throw new Error("Invalid WAV file")
  }

  let offset = 12
  let sampleRate = 22050
  let numChannels = 1
  let bitsPerSample = 16
  let dataOffset = 0
  let dataSize = 0

  while (offset + 8 <= buffer.byteLength) {
    const chunkId = readAscii(view, offset, 4)
    const chunkSize = view.getUint32(offset + 4, true)
    const chunkDataOffset = offset + 8

    if (chunkId === "fmt ") {
      numChannels = view.getUint16(chunkDataOffset + 2, true)
      sampleRate = view.getUint32(chunkDataOffset + 4, true)
      bitsPerSample = view.getUint16(chunkDataOffset + 14, true)
    } else if (chunkId === "data") {
      dataOffset = chunkDataOffset
      dataSize = chunkSize
      break
    }

    offset += 8 + chunkSize + (chunkSize % 2)
  }

  if (!dataSize) {
    throw new Error("WAV data chunk not found")
  }

  const numSamples = Math.floor(dataSize / (bitsPerSample / 8) / numChannels)
  const audio = new Float32Array(numSamples)

  if (bitsPerSample === 16) {
    for (let i = 0; i < numSamples; i++) {
      const sample = view.getInt16(dataOffset + i * 2 * numChannels, true)
      audio[i] = sample / 32768
    }
  } else if (bitsPerSample === 32) {
    for (let i = 0; i < numSamples; i++) {
      audio[i] = view.getFloat32(dataOffset + i * 4 * numChannels, true)
    }
  } else {
    throw new Error(`Unsupported WAV bit depth: ${bitsPerSample}`)
  }

  return { audio, sampling_rate: sampleRate }
}

function readAscii(view: DataView, offset: number, length: number): string {
  let out = ""
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(view.getUint8(offset + i))
  }
  return out
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i))
  }
}

/** Encode mono float32 PCM into a WAV ArrayBuffer (used by rhasspy piper session). */
export function pcmToWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = pcm.length * 2
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeAscii(view, 0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(view, 8, "WAVE")
  writeAscii(view, 12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeAscii(view, 36, "data")
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < pcm.length; i++) {
    const sample = Math.max(-1, Math.min(1, pcm[i]))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return buffer
}
