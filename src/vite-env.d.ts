/// <reference types="vite/client" />

declare module "piper-phonemize-internal" {
  export function createPiperPhonemize(options: {
    print: (data: string) => void
    printErr: (message: string) => void
    locateFile: (url: string) => string
  }): Promise<{ callMain: (args: string[]) => void }>
}
