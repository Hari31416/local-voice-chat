import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Enable SharedArrayBuffer → multi-threaded ONNX WASM in local dev (matches vercel.json).
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "piper-phonemize-internal": path.resolve(
        __dirname,
        "node_modules/@realtimex/piper-tts-web/dist/piper-o91UDS6e.js",
      ),
    },
  },
  optimizeDeps: {
    exclude: [
      "@huggingface/transformers",
      "@mlc-ai/web-llm",
      "@browser-ai/transformers-js",
      "@browser-ai/web-llm",
      "onnxruntime-web",
      "@realtimex/piper-tts-web",
    ],
  },
  build: {
    target: "esnext",
  },
})
