/// <reference types="vite/client" />

interface ImportMeta {
  readonly env: {
    readonly VITE_API_BASE: string;
    readonly VITE_API_HOST: string;
  };
}
