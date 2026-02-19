"use client";

import { useMemo, useRef, useState } from "react";
import type { Medication } from "@/lib/types";

type Props = {
  med: Medication;
  taken: boolean;
  onToggleTaken: () => void;
  onDelete: () => Promise<void> | void;
};

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest("button, a, input, textarea, select, label");
}

export function SwipeMedicationCard({ med, taken, onToggleTaken, onDelete }: Props) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);

  const action = useMemo(() => {
    if (dx > 18) return "right";
    if (dx < -18) return "left";
    return "none";
  }, [dx]);

  const threshold = 84;

  return (
    <div className="relative">
      {/* Background actions */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden">
        <div
          className={[
            "absolute inset-y-0 left-0 right-1/2 grid place-items-center",
            "bg-emerald-600 text-white font-semibold"
          ].join(" ")}
        >
          Прийнято
        </div>
        <div
          className={[
            "absolute inset-y-0 right-0 left-1/2 grid place-items-center",
            "bg-rose-600 text-white font-semibold"
          ].join(" ")}
        >
          Видалити
        </div>
      </div>

      <div
        className={[
          "relative bg-card rounded-3xl shadow-card border border-black/5 p-5",
          "transition-transform",
          dragging ? "duration-0" : "duration-200"
        ].join(" ")}
        style={{
          transform: `translateX(${dx}px)`
        }}
        onPointerDown={(e) => {
          if (busy) return;
          if (isInteractiveTarget(e.target)) return;
          start.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          try {
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
        }}
        onPointerMove={(e) => {
          if (!start.current) return;
          if (busy) return;
          const { x, y } = start.current;
          const nextDx = e.clientX - x;
          const nextDy = e.clientY - y;

          // Decide if user intends horizontal swipe.
          if (!dragging) {
            if (Math.abs(nextDx) < 8) return;
            if (Math.abs(nextDx) < Math.abs(nextDy)) return; // likely scroll
            setDragging(true);
          }

          e.preventDefault();
          const clamped = Math.max(-140, Math.min(140, nextDx));
          setDx(clamped);
        }}
        onPointerUp={async () => {
          if (!start.current) return;
          start.current = null;

          const commitRight = dx >= threshold;
          const commitLeft = dx <= -threshold;

          setDragging(false);

          if (commitRight) {
            setDx(0);
            onToggleTaken();
            return;
          }

          if (commitLeft) {
            setBusy(true);
            try {
              // animate off-screen a bit
              setDx(-220);
              await onDelete();
            } finally {
              setBusy(false);
              setDx(0);
            }
            return;
          }

          setDx(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setDragging(false);
          setDx(0);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-baseline gap-3">
              <div className="text-2xl font-semibold tabular-nums">{med.time}</div>
              <span
                className={[
                  "text-xs font-semibold px-2 py-1 rounded-full border",
                  taken ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-100"
                ].join(" ")}
              >
                {taken ? "Прийнято" : "Не прийнято"}
              </span>
            </div>
            <div className="text-lg font-semibold truncate mt-1">{med.name}</div>
            {med.dosage ? <div className="text-sm text-subtext mt-0.5">{med.dosage}</div> : null}
          </div>

          <div className="grid gap-2 justify-items-end">
            <button
              className={[
                "rounded-2xl px-4 py-2 text-sm font-semibold border",
                taken ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-text border-black/10"
              ].join(" ")}
              onClick={onToggleTaken}
            >
              {taken ? "Скасувати" : "Позначити"}
            </button>

            <button
              className="rounded-2xl px-4 py-2 text-sm font-semibold bg-black/5 hover:bg-black/10 border border-black/5"
              onClick={() => void onDelete()}
            >
              Видалити
            </button>
          </div>
        </div>

        {/* subtle hint */}
        {action !== "none" ? (
          <div className="mt-4 text-xs text-subtext">
            {action === "right" ? "Відпусти, щоб позначити як “прийнято”" : "Відпусти, щоб видалити"}
          </div>
        ) : (
          <div className="mt-4 text-xs text-subtext">Свайп вправо — прийнято, вліво — видалити</div>
        )}
      </div>
    </div>
  );
}

