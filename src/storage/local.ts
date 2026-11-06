import { defaultSettings, emptyEntry, type Entry, type Settings, type StoredData } from "../domain/types";

const STORAGE_KEY = "matkalasku.demo.v1";

export function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], settings: defaultSettings() };
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries.filter(isEntry).map(normalizeEntry) : [],
      settings: normalizeSettings(parsed.settings),
    };
  } catch {
    return { entries: [], settings: defaultSettings() };
  }
}

export function saveData(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function normalizeSettings(value: Settings | undefined): Settings {
  const defaults = defaultSettings();
  if (!value) return defaults;
  return {
    workerName: typeof value.workerName === "string" ? value.workerName : defaults.workerName,
    kmRateCents: typeof value.kmRateCents === "number" && Number.isFinite(value.kmRateCents) ? value.kmRateCents : defaults.kmRateCents,
  };
}

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<Entry>;
  return typeof entry.id === "string" && (entry.template === "monetra" || entry.template === "opetus" || entry.template === "ktt") && typeof entry.date === "string";
}

function normalizeEntry(entry: Entry): Entry {
  const base = emptyEntry(entry.template, entry.date);
  return { ...base, ...entry, id: entry.id };
}
