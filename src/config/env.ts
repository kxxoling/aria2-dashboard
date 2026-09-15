/**
 * Unified Environment Variable Config
 * Supports Vite (`import.meta.env`) and other bundlers (e.g. extension builds via `process.env`).
 */

function getEnvVar(key: string, fallback = ""): string {
  if (typeof process !== "undefined" && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env[key]
  ) {
    return import.meta.env[key] as string;
  }
  return fallback;
}

export const env = {
  // Mock mode for local development
  USE_MOCK: getEnvVar("VITE_USE_MOCK", "false") === "true",

  // Aria2 RPC Configuration
  // Used in standalone web app. For extension, usually configurable by user in UI.
  ARIA2_RPC_URL: getEnvVar("VITE_ARIA2_RPC_URL", "ws://localhost:6800/jsonrpc"),
  ARIA2_RPC_SECRET: getEnvVar("VITE_ARIA2_RPC_SECRET", ""),
} as const;
