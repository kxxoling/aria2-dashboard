/**
 * RPC URL resolution. Kept free of client/store dependencies so it can be
 * unit-tested and reused by the standalone (same-origin) deployment mode.
 */

/**
 * "same-origin" resolves against the page origin, so an all-in-one container
 * can serve the dashboard and reverse-proxy /jsonrpc through one port — the
 * browser connects with ws:// or wss:// depending on how the page was loaded.
 */
export const SAME_ORIGIN_RPC = "same-origin";

export function resolveRpcUrl(url: string): string {
  if (url !== SAME_ORIGIN_RPC) return url;
  if (typeof window === "undefined") return url;
  const scheme = window.location.protocol === "https:" ? "wss://" : "ws://";
  return `${scheme}${window.location.host}/jsonrpc`;
}
