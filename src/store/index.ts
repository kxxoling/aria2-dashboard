import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { env } from "@/config/env";
import { extensionStorage } from "./storage";

export type LanguagePreference = "system" | string;

export interface AppSettings {
  language: LanguagePreference;
  /** Show live rates in the browser tab title. */
  titleSpeedEnabled: boolean;
  /** Browser notification when a download completes. */
  browserNotification: boolean;
  /** Ask for confirmation before removing tasks. */
  confirmTaskRemoval: boolean;
  /** Global hotkeys (Cmd/Ctrl+K new task). */
  hotkeysEnabled: boolean;
  /** Polling intervals, ms. */
  globalStatInterval: number;
  taskListInterval: number;
  /** WebSocket reconnect delay, ms. */
  wsReconnectInterval: number;
}

export const defaultSettings: AppSettings = {
  language: "system",
  titleSpeedEnabled: true,
  browserNotification: false,
  confirmTaskRemoval: true,
  hotkeysEnabled: true,
  globalStatInterval: 1000,
  taskListInterval: 2000,
  wsReconnectInterval: 5000,
};

export interface AppState {
  rpcUrl: string;
  rpcSecret: string;
  setRpcConfig: (url: string, secret: string) => void;
  // UI preferences
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  colorScheme: string;
  setColorScheme: (scheme: string) => void;
  /** Task table column visibility (column id -> shown). Missing = shown. */
  taskColumnVisibility: Record<string, boolean>;
  setTaskColumnVisibility: (visibility: Record<string, boolean>) => void;
  /** Persisted per-tab table sorting (tab -> SortingState). */
  taskSorting: Record<string, Array<{ id: string; desc: boolean }>>;
  setTaskSorting: (
    tab: string,
    sorting: Array<{ id: string; desc: boolean }>,
  ) => void;
  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      rpcUrl: env.ARIA2_RPC_URL,
      rpcSecret: env.ARIA2_RPC_SECRET,
      setRpcConfig: (url, secret) => set({ rpcUrl: url, rpcSecret: secret }),
      sidebarOpen: true,
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      theme: "system" as const,
      setTheme: (theme) => set({ theme }),
      colorScheme: "default",
      setColorScheme: (colorScheme) => set({ colorScheme }),
      taskColumnVisibility: {},
      setTaskColumnVisibility: (taskColumnVisibility) =>
        set({ taskColumnVisibility }),
      taskSorting: {},
      setTaskSorting: (tab, sorting) =>
        set((state) => ({
          taskSorting: { ...state.taskSorting, [tab]: sorting },
        })),
      settings: defaultSettings,
      setSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),
    }),
    {
      name: "aria2-dashboard-storage",
      storage: createJSONStorage(() => extensionStorage),
    },
  ),
);
