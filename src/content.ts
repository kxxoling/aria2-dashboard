import { isInterceptableUrl } from "@/lib/downloadUrl";
import { readInterceptLinks } from "@/lib/extSettings";
import { STORAGE_KEY } from "@/store";

// Plasmo reads this export when generating the manifest; the ambient
// PlasmoCSConfig type only exists after a build, so it is not used here.
export const config = {
  matches: ["http://*/*", "https://*/*"],
  run_at: "document_end",
} as const;

const ADD_TASK_MESSAGE = "aria2:add-task";

// The toggle lives in the popup's settings; read it once per page load and
// follow live changes through storage events. Until the first read settles
// the default (enabled) applies.
let interceptEnabled = true;
void readInterceptLinks().then((value) => {
  interceptEnabled = value;
});
if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEY]) return;
    void readInterceptLinks().then((value) => {
      interceptEnabled = value;
    });
  });
}

/**
 * Claims plain left clicks on magnet: links and on http(s) links whose path
 * looks like a downloadable file: the URL goes to the background service
 * worker as a new aria2 task, and the browser default (external protocol
 * dialog / direct download) is suppressed. Modifier clicks keep their
 * native meaning (new tab etc.), and the whole behavior can be turned off
 * from the popup's settings.
 */
window.addEventListener(
  "click",
  (event) => {
    if (!interceptEnabled) return;
    if (!event.isTrusted || event.button !== 0) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      return;
    const target = event.target;
    const anchor =
      target instanceof Element
        ? target.closest<HTMLAnchorElement>("a[href]")
        : null;
    const href = anchor?.href;
    if (!href || !isInterceptableUrl(href)) return;

    event.preventDefault();
    event.stopPropagation();
    void chrome.runtime
      .sendMessage({ type: ADD_TASK_MESSAGE, url: href })
      .catch(() => {
        // Extension context is gone (reload/update) — nothing to do here.
      });
  },
  true,
);
