import type { StateStorage } from "zustand/middleware";

export const extensionStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get(name);
      const value = (result[name] as string) || null;
      if (value !== null || typeof localStorage === "undefined") return value;
      // One-time migration: early builds lacked the "storage" permission and
      // silently fell back to localStorage; carry that data over so users
      // keep their RPC config after updating.
      const legacy = localStorage.getItem(name);
      if (legacy !== null) {
        await chrome.storage.local.set({ [name]: legacy });
        localStorage.removeItem(name);
      }
      return legacy;
    }
    return localStorage.getItem(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.set({ [name]: value });
      return;
    }
    localStorage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      await chrome.storage.local.remove(name);
      return;
    }
    localStorage.removeItem(name);
  },
};
