"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, Plus, X } from "lucide-react";
import { MedicationForm } from "@/components/MedicationForm";
import { SwipeMedicationCard } from "@/components/SwipeMedicationCard";
import type { Medication } from "@/lib/types";
import { deleteMedication, listMedications, upsertMedication } from "@/lib/medications-db";
import {
  markNotificationPromptShown,
  requestNotificationPermission,
  setupBackgroundChecks,
  shouldShowNotificationPrompt,
  showDueNotificationsWhileAppOpen
} from "@/lib/notifications";
import { toLocalWeekdayIndex } from "@/lib/schedule";

export default function Home() {
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    typeof window === "undefined" ? "unsupported" : ("Notification" in window ? Notification.permission : "unsupported")
  );
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [takenMap, setTakenMap] = useState<Record<string, boolean>>({});
  const [showAbout, setShowAbout] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "success" | "error">("idle");

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => {
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [today]);

  const todayLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat("uk-UA", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
    const s = fmt.format(today);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [today]);

  const medsToday = useMemo(() => {
    const idx = toLocalWeekdayIndex(new Date());
    return items.filter((m) => Array.isArray(m.daysOfWeek) && m.daysOfWeek.includes(idx));
  }, [items]);

  async function refresh() {
    const meds = await listMedications();
    setItems(meds);
  }

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setShowNotifPrompt(shouldShowNotificationPrompt());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(`medreminder:taken:${todayKey}`);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") setTakenMap(parsed);
    } catch {
      // ignore
    }
  }, [todayKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setInterval(() => {
      void showDueNotificationsWhileAppOpen(items);
    }, 20_000);
    return () => window.clearInterval(id);
  }, [items]);

  return (
    <main className="min-h-screen pb-28">
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-emerald-50 to-appBg">
        <div className="max-w-md mx-auto px-4 pt-8 pb-10 grid gap-5">
          <header className="flex items-start justify-between gap-4">
            <div className="grid gap-1">
              <div className="text-sm font-semibold text-subtext">{todayLabel}</div>
              <h1 className="text-4xl font-bold tracking-tight">Мої ліки</h1>
              <div className="text-sm text-subtext">
                {loading ? "Завантаження…" : `${medsToday.length} на сьогодні`} • офлайн
              </div>
            </div>
            <button
              type="button"
              className="mt-1 h-9 w-9 shrink-0 rounded-2xl bg-white/70 border border-black/5 shadow-sm grid place-items-center text-subtext hover:text-text"
              aria-label="Про додаток"
              title="Про додаток"
              onClick={() => {
                setShareStatus("idle");
                setShowAbout(true);
              }}
            >
              <Info className="h-4 w-4" />
            </button>
          </header>

          {showNotifPrompt ? (
            <section className="bg-card rounded-3xl shadow-card border border-black/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">Сповіщення</div>
                  <div className="text-sm text-subtext mt-1">Дозволь, щоб нагадування приходили у потрібний час.</div>
                </div>
                <button
                  className="shrink-0 rounded-2xl px-4 py-2 bg-accent text-white font-semibold"
                  onClick={async () => {
                    markNotificationPromptShown();
                    setShowNotifPrompt(false);
                    const perm = await requestNotificationPermission();
                    setNotifPermission(perm);
                    if (perm === "granted") {
                      await setupBackgroundChecks();
                    }
                  }}
                >
                  Увімкнути
                </button>
              </div>
            </section>
          ) : null}

          <section className="grid gap-3">
            {medsToday.length === 0 ? (
              <div className="bg-card rounded-3xl shadow-card border border-black/5 p-6">
                <div className="text-base font-semibold">Немає нагадувань на сьогодні</div>
                <div className="text-sm text-subtext mt-1">Натисни “+”, щоб додати перші ліки.</div>
              </div>
            ) : (
              medsToday.map((m) => {
                const taken = !!takenMap[m.id];
                return (
                  <SwipeMedicationCard
                    key={m.id}
                    med={m}
                    taken={taken}
                    onToggleTaken={() => {
                      setTakenMap((prev) => {
                        const next = { ...prev, [m.id]: !prev[m.id] };
                        localStorage.setItem(`medreminder:taken:${todayKey}`, JSON.stringify(next));
                        return next;
                      });
                    }}
                    onDelete={async () => {
                      await deleteMedication(m.id);
                      await refresh();
                      if (notifPermission === "granted") {
                        await setupBackgroundChecks();
                      }
                    }}
                  />
                );
              })
            )}
          </section>
        </div>
      </div>

      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setShowAddSheet(true)}
        className="fixed right-5 bottom-6 z-40 h-16 w-16 rounded-full bg-accent text-white shadow-[0_18px_40px_rgba(10,132,255,0.35)] active:scale-95 transition grid place-items-center"
        aria-label="Додати"
        title="Додати"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Add sheet */}
      {showAddSheet ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowAddSheet(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-x-0 bottom-0">
            <div className="max-w-md mx-auto px-4 pb-6">
              <div className="bg-card rounded-t-3xl rounded-b-3xl shadow-card border border-black/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-semibold">Додати ліки</div>
                  <button
                    className="h-10 w-10 rounded-2xl bg-black/5 hover:bg-black/10 border border-black/5 grid place-items-center"
                    onClick={() => setShowAddSheet(false)}
                    aria-label="Закрити"
                    title="Закрити"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <MedicationForm
                  onAdd={async (med) => {
                    await upsertMedication(med);
                    await refresh();
                    setShowAddSheet(false);
                    if (notifPermission === "granted") {
                      await setupBackgroundChecks();
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* About modal */}
      {showAbout ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAbout(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-card rounded-3xl shadow-card border border-black/10 p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold tracking-[0.3em] text-subtext">
                    ПРО ДОДАТОК
                  </div>
                  <div className="text-xl font-bold leading-snug">
                    100% Приватно. Без реклами. Безкоштовно.
                  </div>
                </div>
                <button
                  type="button"
                  className="h-9 w-9 rounded-2xl bg-black/5 hover:bg-black/10 border border-black/5 grid place-items-center"
                  onClick={() => setShowAbout(false)}
                  aria-label="Закрити"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-sm text-subtext mb-4">
                Дані зберігаються лише на вашому пристрої. Додаток працює офлайн і не передає інформацію
                на сервери.
              </p>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold bg-accent text-white shadow-sm"
                  onClick={async () => {
                    try {
                      const url =
                        typeof window !== "undefined"
                          ? window.location.href
                          : "https://example.com";
                      if (navigator.share) {
                        await navigator.share({
                          title: "Нагадування про ліки",
                          text: "Простий офлайн-додаток для нагадувань про прийом ліків.",
                          url
                        });
                      } else if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(url);
                      }
                      setShareStatus("success");
                    } catch {
                      setShareStatus("error");
                    }
                  }}
                >
                  Поділитися
                </button>

                <span className="text-xs text-subtext">
                  {shareStatus === "success"
                    ? "Посилання скопійовано."
                    : shareStatus === "error"
                    ? "Не вдалося поділитися."
                    : "Посилання: поточна адреса сторінки."}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

