import { isInterceptableUrl } from "@/lib/downloadUrl";

// Plasmo reads this export when generating the manifest; the ambient
// PlasmoCSConfig type only exists after a build, so it is not used here.
export const config = {
  matches: ["http://*/*", "https://*/*"],
  run_at: "document_end",
} as const;

const ADD_TASK_MESSAGE = "aria2:add-task";

/**
 * Claims plain left clicks on magnet: links and on http(s) links whose path
 * looks like a downloadable file: the URL goes to the background service
 * worker as a new aria2 task, and the browser default (external protocol
 * dialog / direct download) is suppressed. Modifier clicks keep their
 * native meaning (new tab etc.).
 */
window.addEventListener(
  "click",
  (event) => {
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
