"use client";

import { Trash2 } from "lucide-react";
import type { Medication } from "@/lib/types";
import { formatDays } from "@/lib/schedule";

type Props = {
  items: Medication[];
  onDelete: (id: string) => Promise<void> | void;
};

export function MedicationList({ items, onDelete }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-3xl shadow-card border border-black/5 p-6">
        <p className="text-subtext">Тут будуть твої нагадування…</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((m) => (
        <div key={m.id} className="bg-card rounded-3xl shadow-card border border-black/5 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <div className="text-xl font-semibold tabular-nums">{m.time}</div>
                <div className="text-sm text-subtext">{formatDays(m.daysOfWeek ?? [])}</div>
              </div>
              <div className="text-base font-semibold truncate">{m.name}</div>
              {m.dosage ? <div className="text-sm text-subtext">{m.dosage}</div> : null}
            </div>

            <button
              className="shrink-0 rounded-2xl px-3 py-2 bg-black/5 hover:bg-black/10 border border-black/5"
              onClick={() => onDelete(m.id)}
              aria-label="Видалити"
              title="Видалити"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

