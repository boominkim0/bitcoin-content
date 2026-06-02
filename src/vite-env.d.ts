/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string
  readonly DEV: boolean
  readonly MODE: string
  readonly PROD: boolean
  readonly SSR: boolean
  readonly VITE_BTC_API_BASE_URL: string
  readonly VITE_BTC_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
