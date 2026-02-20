import type { Medication } from "@/lib/types";
import { firedKey, isDueNow } from "@/lib/schedule";
import { playDing } from "@/lib/sound";

const LS_PROMPT_KEY = "medreminder:notifPromptShown";
const LS_FIRED_PREFIX = "medreminder:fired:";

export function shouldShowNotificationPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "default") return false;
  return localStorage.getItem(LS_PROMPT_KEY) !== "1";
}

export function markNotificationPromptShown() {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_PROMPT_KEY, "1");
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission;
  return await Notification.requestPermission();
}

export async function setupBackgroundChecks(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.ready;

  // Best effort: periodic background sync (Chrome/Android). Not supported on iOS/Safari.
  try {
    const anyReg = reg as any;
    if (anyReg.periodicSync?.register) {
      await anyReg.periodicSync.register("med-check", { minInterval: 15 * 60 * 1000 });
    }
  } catch {
    // ignored
  }

  // One-off background sync can help after edits; may fire when connectivity returns.
  try {
    const anyReg = reg as any;
    if (anyReg.sync?.register) {
      await anyReg.sync.register("med-check");
    }
  } catch {
    // ignored
  }

  // Kick a check immediately.
  try {
    reg.active?.postMessage({ type: "MED_CHECK_NOW" });
  } catch {
    // ignored
  }
}

export async function showDueNotificationsWhileAppOpen(meds: Medication[]): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!("serviceWorker" in navigator)) return;

  const reg = await navigator.serviceWorker.ready;
  const now = new Date();
  for (const med of meds) {
    if (!isDueNow(med, now)) continue;
    const key = firedKey(med, now);
    const lsKey = `${LS_FIRED_PREFIX}${key}`;
    if (localStorage.getItem(lsKey) === "1") continue;

    await reg.showNotification(med.name, {
      body: [med.dosage, `Час: ${med.time}`].filter(Boolean).join(" • "),
      tag: key,
      data: { url: "/", medId: med.id }
    });

    // Optional local sound if this reminder is configured for it
    if (med.playSound !== false) {
      void playDing();
    }

    localStorage.setItem(lsKey, "1");
  }
}


