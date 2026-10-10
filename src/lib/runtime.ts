/**
 * True when the app runs inside the browser extension (popup), as opposed
 * to the standalone web build. Extension-only surfaces (link interception
 * settings, background notifications) gate on this.
 */
export function isExtension(): boolean {
  return (
    typeof chrome !== "undefined" && typeof chrome.runtime?.id === "string"
  );
}
