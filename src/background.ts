import { aria2Client } from "@/api/aria2";
import {
  type NotifiedMap,
  selectCompletedForNotification,
} from "@/lib/completionNotify";
import { describeTaskUrl, isTaskUrl, truncate } from "@/lib/downloadUrl";
import { resolveLanguage, translate } from "@/lib/locale";
import { taskDisplayName } from "@/lib/taskDisplay";
import { STORAGE_KEY, useAppStore } from "@/store";

/**
 * Extension background service worker. Works entirely without the popup:
 * it receives download URLs from the content script and the context menu,
 * pushes them into aria2, reports the outcome through native Chrome
 * notifications, and announces freshly completed downloads (toggleable
 * from the popup's settings).
 */

const ADD_TASK_MESSAGE = "aria2:add-task";
const CONTEXT_MENU_ID = "aria2-dashboard:add-task";
const MENU_TITLE_KEY = "Create new task with Aria2 Dashboard";
const COMPLETION_ALARM = "aria2-dashboard:completion-check";
/** chrome.storage key for the already-announced completion gids. */
const NOTIFIED_KEY = "aria2-dashboard:notified-completions";

const NOTIFICATION_MESSAGE_MAX_LENGTH = 200;
// RPC transport-level failures read as "backend unreachable"; anything else
// (auth, duplicate torrent, …) is shown verbatim.
const CONNECTION_ERROR_PATTERN =
  /fetch|network|websocket|timeout|refused|unreachable|reset/i;

// --- language -------------------------------------------------------------

async function currentLanguage(): Promise<string> {
  // The persisted store hydrates asynchronously; re-read chrome.storage so a
  // freshly woken service worker never translates from a stale default.
  await useAppStore.persist.rehydrate();
  const { language } = useAppStore.getState().settings;
  const uiLanguage = chrome.i18n?.getUILanguage?.() ?? "en";
  return resolveLanguage(language, uiLanguage);
}

// --- context menu ---------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  void ensureContextMenu();
});

// Menus do not survive browser restarts; the service worker starts fresh.
chrome.runtime.onStartup.addListener(() => {
  void ensureContextMenu();
});

async function ensureContextMenu(): Promise<void> {
  chrome.contextMenus.create(
    {
      id: CONTEXT_MENU_ID,
      title: translate(await currentLanguage(), MENU_TITLE_KEY),
      contexts: ["link"],
    },
    // Creating twice (install + startup) throws; swallow that via lastError.
    () => void chrome.runtime.lastError,
  );
}

// Follow the in-app language setting without waiting for a browser restart.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[STORAGE_KEY]) return;
  void (async () => {
    chrome.contextMenus.update(
      CONTEXT_MENU_ID,
      { title: translate(await currentLanguage(), MENU_TITLE_KEY) },
      () => void chrome.runtime.lastError,
    );
  })();
});

chrome.contextMenus.onClicked.addListener((info) => {
  const url = info.linkUrl;
  // Explicit intent — any magnet/http(s)/ftp link is accepted, no heuristics.
  if (!url || !isTaskUrl(url)) return;
  void addTask(url);
});

// --- task creation --------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if ((message as { type?: unknown } | null)?.type !== ADD_TASK_MESSAGE) return;
  const url = String((message as { url?: unknown }).url ?? "");
  void addTask(url).finally(() => sendResponse({ ok: true }));
  // Keep the message channel open for the async reply.
  return true;
});

async function addTask(rawUrl: string): Promise<void> {
  const url = rawUrl.trim();
  if (!url) return;
  const language = await currentLanguage();
  try {
    await aria2Client.addUri([url]);
    notify(translate(language, "Task Added"), describeTaskUrl(url));
  } catch (error) {
    notify(
      translate(language, "Failed to add task"),
      failureMessage(language, (error as Error).message),
    );
  }
}

function failureMessage(language: string, errorText: string): string {
  if (CONNECTION_ERROR_PATTERN.test(errorText)) {
    return translate(language, "Cannot connect to Aria2. Check your settings.");
  }
  return truncate(
    errorText || "Unknown error",
    NOTIFICATION_MESSAGE_MAX_LENGTH,
  );
}

// --- notifications --------------------------------------------------------

function notify(title: string, message: string): void {
  const iconUrl = notificationIconUrl();
  if (!iconUrl) return;
  chrome.notifications.create(
    {
      type: "basic",
      iconUrl,
      title: truncate(title, 60),
      message: truncate(message, NOTIFICATION_MESSAGE_MAX_LENGTH),
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn(
          "Aria2 Dashboard notification failed:",
          chrome.runtime.lastError.message,
        );
      }
    },
  );
}

/** The extension's own manifest icon, whatever file name Plasmo emitted. */
function notificationIconUrl(): string | undefined {
  const icons = chrome.runtime.getManifest().icons ?? {};
  const path =
    icons["128"] ?? icons["48"] ?? Object.values(icons ?? {})[0] ?? null;
  return path ? chrome.runtime.getURL(path) : undefined;
}

// --- download completion notifications ------------------------------------

// The alarm wakes the service worker periodically; it is recreated (idempotently)
// on every start so it always exists.
chrome.alarms.create(COMPLETION_ALARM, { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === COMPLETION_ALARM) void checkCompletions();
});
// Also check right away on wake, not just on the next tick.
void checkCompletions();

async function checkCompletions(): Promise<void> {
  try {
    await useAppStore.persist.rehydrate();
    const { browserNotification } = useAppStore.getState().settings;
    if (!browserNotification) return;

    const stopped = await aria2Client.tellStopped(0, 20);
    const notified = await readNotifiedMap();
    const { toNotify, next } = selectCompletedForNotification(
      stopped,
      notified,
      Date.now(),
    );
    if (toNotify.length === 0) return;
    // New gids were marked — persist even if pruning kept the size equal.
    await writeNotifiedMap(next);
    const language = await currentLanguage();
    const fallback = translate(language, "Unknown Task");
    for (const task of toNotify) {
      notify(
        translate(language, "Download complete"),
        taskDisplayName(task, fallback),
      );
    }
  } catch {
    // Backend unreachable or RPC error — the connection manager surfaces
    // connection state; completion checks just wait for the next alarm.
  }
}

async function readNotifiedMap(): Promise<NotifiedMap> {
  try {
    const result = await chrome.storage.local.get(NOTIFIED_KEY);
    return (result[NOTIFIED_KEY] as NotifiedMap | undefined) ?? {};
  } catch {
    return {};
  }
}

function writeNotifiedMap(map: NotifiedMap): Promise<void> {
  return chrome.storage.local.set({ [NOTIFIED_KEY]: map });
}
