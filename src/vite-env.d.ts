/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_RELAY: string;
  readonly VITE_MASTER_PUBKEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
