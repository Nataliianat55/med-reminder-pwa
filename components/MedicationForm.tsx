"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Medication } from "@/lib/types";
import { WEEKDAYS_UK_SHORT } from "@/lib/schedule";

type Props = {
  onAdd: (med: Medication) => Promise<void> | void;
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function MedicationForm({ onAdd }: Props) {
  const defaultTime = useMemo(() => {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, []);

  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [time, setTime] = useState(defaultTime);
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [withSound, setWithSound] = useState(true);
  const [busy, setBusy] = useState(false);

  const canSubmit = name.trim().length > 0 && time.trim().length > 0 && days.length > 0 && !busy;

  return (
    <form
      className="bg-card rounded-3xl shadow-card border border-black/5 p-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        setBusy(true);
        try {
          const med: Medication = {
            id: uid(),
            name: name.trim(),
            dosage: dosage.trim(),
            time,
            daysOfWeek: days.slice().sort((a, b) => a - b),
            playSound: withSound,
            createdAt: Date.now()
          };
          await onAdd(med);
          setName("");
          setDosage("");
          setTime(defaultTime);
          setDays([0, 1, 2, 3, 4, 5, 6]);
          setWithSound(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-base font-semibold">Додати ліки</div>
          <div className="text-sm text-subtext">Збережеться тільки на цьому пристрої</div>
        </div>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-accent text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Додати
        </button>
      </div>

      <div className="grid gap-3">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-subtext">Назва</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Напр. Вітамін D"
            className="w-full rounded-2xl bg-black/5 border border-black/5 px-4 py-3 outline-none focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-xs font-semibold text-subtext">Час</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-2xl bg-black/5 border border-black/5 px-4 py-3 outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-semibold text-subtext">Дозування</span>
            <input
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="Напр. 1000 IU"
              className="w-full rounded-2xl bg-black/5 border border-black/5 px-4 py-3 outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>

        <div className="grid gap-2 pt-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold text-subtext">Дні тижня</span>
            <button
              type="button"
              className="text-xs font-semibold text-accent"
              onClick={() => setDays(days.length === 7 ? [0, 1, 2, 3, 4] : [0, 1, 2, 3, 4, 5, 6])}
            >
              {days.length === 7 ? "Тільки будні" : "Щодня"}
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {WEEKDAYS_UK_SHORT.map((label, idx) => {
              const checked = days.includes(idx);
              return (
                <label
                  key={label}
                  className={[
                    "select-none text-center rounded-2xl px-0 py-2 border text-sm font-semibold",
                    checked ? "bg-accent text-white border-transparent" : "bg-black/5 border-black/5 text-text"
                  ].join(" ")}
                >
                  <input
                    className="sr-only"
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setDays((prev) => {
                        const has = prev.includes(idx);
                        const next = has ? prev.filter((d) => d !== idx) : [...prev, idx];
                        return next.sort((a, b) => a - b);
                      });
                    }}
                  />
                  {label}
                </label>
              );
            })}
          </div>

          <label className="mt-1 flex items-center justify-between gap-3 rounded-2xl bg-black/5 border border-black/5 px-3 py-2">
            <div className="text-xs text-subtext">
              <div className="font-semibold">Звук при нагадуванні</div>
              <div>Короткий м’який “дзинь” у момент нагадування.</div>
            </div>
            <button
              type="button"
              onClick={() => setWithSound((v) => !v)}
              className={[
                "relative inline-flex h-7 w-12 items-center rounded-full transition",
                withSound ? "bg-accent" : "bg-black/20"
              ].join(" ")}
              aria-pressed={withSound}
            >
              <span
                className={[
                  "inline-block h-6 w-6 transform rounded-full bg-white shadow transition",
                  withSound ? "translate-x-5" : "translate-x-1"
                ].join(" ")}
              />
            </button>
          </label>
        </div>
      </div>
    </form>
  );
}

