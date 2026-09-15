import type { StateStorage } from "zustand/middleware";

export const extensionStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (typeof chrome !== "undefined" && chrome.storage) {
      const result = await chrome.storage.local.get(name);
      return (result[name] as string) || null;
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
