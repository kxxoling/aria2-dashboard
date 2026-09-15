import { useEffect } from "react";
import { useAppStore } from "@/store";

/**
 * Applies the persisted theme to <html> and follows OS scheme changes.
 *
 * Theme flips are wrapped in the View Transition API when available, so
 * light/dark switches cross-fade natively instead of hard-cutting. The
 * fallback path is the plain class swap.
 */

function applyThemeClass(dark: boolean, scheme?: string) {
  const root = window.document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(dark ? "dark" : "light");
  if (scheme) root.dataset.scheme = scheme;
}

function withViewTransition(update: () => void) {
  const documentWithVT = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  if (
    typeof documentWithVT.startViewTransition === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    documentWithVT.startViewTransition(update);
  } else {
    update();
  }
}

function isDarkMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme() {
  const { theme } = useAppStore();
  const colorScheme = useAppStore((s) => s.colorScheme);

  useEffect(() => {
    withViewTransition(() =>
      applyThemeClass(
        theme === "system" ? isDarkMode() : theme === "dark",
        colorScheme,
      ),
    );
  }, [theme, colorScheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      if (useAppStore.getState().theme === "system") {
        withViewTransition(() => applyThemeClass(mediaQuery.matches));
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);
}
