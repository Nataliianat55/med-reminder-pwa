import { openDB } from "idb";
import type { Medication } from "@/lib/types";

const DB_NAME = "med-reminder";
const DB_VERSION = 2;
const MED_STORE = "medications";
const FIRED_STORE = "firedNotifications";
const LS_KEY = "medreminder:medications";

function getDb() {
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

function readFromLocalStorage(): Medication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function writeToLocalStorage(meds: Medication[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(meds));
  } catch {
    // ignore quota / private-mode errors
  }
}

export async function listMedications(): Promise<Medication[]> {
  try {
    const db = await getDb();
    const all = await db.getAll(MED_STORE);
    const sorted = all.sort((a, b) => a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
    writeToLocalStorage(sorted);
    return sorted;
  } catch {
    const fallback = readFromLocalStorage();
    return fallback.sort((a, b) => a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
  }
}

export async function upsertMedication(med: Medication): Promise<void> {
  try {
    const db = await getDb();
    await db.put(MED_STORE, med);
  } catch {
    // ignore, will still persist via localStorage
  }

  const current = readFromLocalStorage();
  const idx = current.findIndex((m) => m.id === med.id);
  if (idx >= 0) {
    current[idx] = med;
  } else {
    current.push(med);
  }
  current.sort((a, b) => a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
  writeToLocalStorage(current);
}

export async function deleteMedication(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(MED_STORE, id);
  } catch {
    // ignore
  }

  const current = readFromLocalStorage().filter((m) => m.id !== id);
  writeToLocalStorage(current);
}

