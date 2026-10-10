import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { aria2Client } from "@/api/aria2";
import {
  type NotifiedMap,
  selectCompletedForNotification,
} from "@/lib/completionNotify";
import { isExtension } from "@/lib/runtime";
import { taskDisplayName } from "@/lib/taskDisplay";
import { useAppStore } from "@/store";

const NOTIFIED_KEY = "aria2-notified-completions";
const POLL_INTERVAL_MS = 10_000;

/**
 * Web-app side of the "notify when downloads complete" setting: while the
 * page is open, freshly completed downloads are announced through the
 * Notification API (permission is requested by the settings toggle). The
 * extension popup skips this — its background service worker owns
 * notifications there, otherwise every completed task would fire twice.
 */
export function useCompletionNotifications() {
  const { t } = useTranslation();
  const enabled = useAppStore((s) => s.settings.browserNotification);

  useEffect(() => {
    if (!enabled || isExtension()) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;

    let cancelled = false;

    const check = async () => {
      try {
        const stopped = await aria2Client.tellStopped(0, 20);
        if (cancelled) return;
        const { toNotify, next } = selectCompletedForNotification(
          stopped,
          readNotified(),
          Date.now(),
        );
        if (toNotify.length === 0) return;
        // Mark before firing: a concurrently polling second tab re-reads
        // this map from localStorage and skips the same gids.
        writeNotified(next);
        for (const task of toNotify) {
          const notification = new Notification(t("Download complete"), {
            body: taskDisplayName(task, t("Unknown Task")),
            tag: `aria2-complete-${task.gid}`,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      } catch {
        // Backend unreachable — the status bar shows that; retry next tick.
      }
    };

    void check();
    const timer = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, t]);
}

function readNotified(): NotifiedMap {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? (JSON.parse(raw) as NotifiedMap) : {};
  } catch {
    return {};
  }
}

function writeNotified(map: NotifiedMap): void {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(map));
  } catch {
    // Storage unavailable — dedupe just resets on the next load.
  }
}
