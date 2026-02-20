import { openDB } from "idb";

const DB_NAME = "med-reminder";
const DB_VERSION = 2;
const MED_STORE = "medications";
const FIRED_STORE = "firedNotifications";
const WINDOW_MINUTES = 15;

type Medication = {
  id: string;
  name: string;
  dosage: string;
  time: string; // "HH:MM"
  daysOfWeek: number[]; // 0=Mon..6=Sun
  createdAt: number;
};

function toLocalWeekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function minutesSinceMidnight(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function timeToMinutes(time: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(time);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function firedKey(med: Medication, date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${med.id}:${yyyy}-${mm}-${dd}:${med.time}`;
}

async function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(MED_STORE)) {
        db.createObjectStore(MED_STORE, { keyPath: "id" });
      }
      if (oldVersion < 2 && !db.objectStoreNames.contains(FIRED_STORE)) {
        db.createObjectStore(FIRED_STORE, { keyPath: "key" });
      }
    }
  });
}

async function checkAndNotify(windowMinutes = WINDOW_MINUTES) {
  // Note: Service workers are not guaranteed to run at exact times.
  // We use a look-back window and de-dup by (med, date, time).
  if (!("registration" in self)) return;

  // @ts-expect-error - SW global
  const reg: ServiceWorkerRegistration = self.registration;
  if (!reg) return;

  // Notification permission is checked implicitly; showNotification will fail if not granted.
  const db = await getDb();
  const meds = (await db.getAll(MED_STORE)) as Medication[];

  const now = new Date();
  const dayIdx = toLocalWeekdayIndex(now);
  const nowMin = minutesSinceMidnight(now);

  for (const med of meds) {
    const days = Array.isArray(med.daysOfWeek) ? med.daysOfWeek : [];
    if (!days.includes(dayIdx)) continue;

    const medMin = timeToMinutes(med.time);
    if (medMin === null) continue;
    const diff = nowMin - medMin;
    if (diff < 0 || diff > windowMinutes) continue;

    const key = firedKey(med, now);
    const already = await db.get(FIRED_STORE, key);
    if (already) continue;

    try {
      await reg.showNotification(med.name, {
        body: [med.dosage, `Час: ${med.time}`].filter(Boolean).join(" • "),
        tag: key,
        data: { url: "/", medId: med.id }
      });
      await db.put(FIRED_STORE, { key, firedAt: Date.now() });
    } catch {
      // ignored
    }
  }
}

self.addEventListener("message", (event: MessageEvent) => {
  const data = event.data as any;
  if (data?.type === "MED_CHECK_NOW") {
    void checkAndNotify();
  }
});

// Best-effort background scheduling (only where supported).
// - periodicSync: Chrome/Android (behind permissions/conditions)
// - sync: one-off background sync (not time-precise)
self.addEventListener("periodicsync" as any, (event: any) => {
  if (event?.tag !== "med-check") return;
  event.waitUntil(checkAndNotify());
});

self.addEventListener("sync" as any, (event: any) => {
  if (event?.tag !== "med-check") return;
  event.waitUntil(checkAndNotify());
});

self.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const url = (event.notification.data as any)?.url ?? "/";
  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        // @ts-expect-error - client typing differs
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })()
  );
});




