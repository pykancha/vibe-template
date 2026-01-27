/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSIST_URL?: string
  readonly VITE_ASSIST_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
