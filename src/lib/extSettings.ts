import { STORAGE_KEY } from "@/store";

/**
 * Settings access for extension surfaces that do not run the React app
 * (the content script). The persisted zustand blob lives under one
 * chrome.storage key; this reads just the fields the content script needs.
 */

export async function readInterceptLinks(): Promise<boolean> {
  try {
    if (typeof chrome === "undefined" || !chrome.storage) return true;
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const raw = result[STORAGE_KEY] as string | undefined;
    const settings = raw
      ? (JSON.parse(raw)?.state?.settings as { interceptLinks?: unknown })
      : undefined;
    return typeof settings?.interceptLinks === "boolean"
      ? settings.interceptLinks
      : true;
  } catch {
    return true;
  }
}
