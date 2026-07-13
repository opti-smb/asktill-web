/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_AUTH_API_URL: string;
  readonly VITE_REGISTER_API_URL: string;
  readonly VITE_SUBSCRIPTION_API_URL?: string;
  readonly VITE_ENTITLEMENTS_API_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_APP_ORIGIN?: string;
  readonly TOKEN_STORAGE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
