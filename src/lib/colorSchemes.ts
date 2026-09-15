/** Color schemes: palettes with light & dark variants applied via
 *  `data-scheme` on <html> alongside the light/dark class. */

export interface ColorScheme {
  id: string;
  label: string;
  /** Preview swatches for UI pickers [bg, accent, fg] per mode. */
  swatch: { light: [string, string]; dark: [string, string] };
}

export const colorSchemes: ColorScheme[] = [
  {
    id: "default",
    label: "Default",
    swatch: { light: ["#ffffff", "#3b82f6"], dark: ["#0f172a", "#3b82f6"] },
  },
  {
    id: "solarized",
    label: "Solarized",
    swatch: { light: ["#fdf6e3", "#268bd2"], dark: ["#002b36", "#268bd2"] },
  },
  {
    id: "dracula",
    label: "Dracula",
    swatch: { light: ["#f8f8f2", "#6c46a7"], dark: ["#282a36", "#bd93f9"] },
  },
  {
    id: "tokyo-night",
    label: "Tokyo Night",
    swatch: { light: ["#e1e2e7", "#2e7de9"], dark: ["#1a1b26", "#7aa2f7"] },
  },
  {
    id: "nord",
    label: "Nord",
    swatch: { light: ["#eceff4", "#5e81ac"], dark: ["#2e3440", "#88c0d0"] },
  },
  {
    id: "gruvbox",
    label: "Gruvbox",
    swatch: { light: ["#fbf1c7", "#458588"], dark: ["#282828", "#b8bb26"] },
  },
];

export const colorSchemeIds = colorSchemes.map((s) => s.id);

export function isColorScheme(id: string): boolean {
  return colorSchemeIds.includes(id);
}
