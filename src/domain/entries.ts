import { legCents } from "./money";
import { durationMinutes } from "./time";
import type { Entry, TemplateId } from "./types";
import { emptyEntry } from "./types";

export function clearDriving(entry: Entry): Entry {
  return {
    ...entry,
    outboundStart: null,
    outboundEnd: null,
    outboundFrom: "",
    outboundTo: "",
    outboundKmTenths: null,
    returnStart: null,
    returnEnd: null,
    returnFrom: "",
    returnTo: "",
    returnKmTenths: null,
  };
}

export function copyClient(source: Entry): Entry {
  const next = emptyEntry(source.template);
  return {
    ...next,
    clientName: source.clientName,
    municipality: source.municipality,
    orderer: source.orderer,
    grantedHours: source.grantedHours,
    validUntil: source.validUntil,
    folderGivenOn: source.folderGivenOn,
    outboundFrom: source.outboundFrom,
    outboundTo: source.outboundTo,
    outboundKmTenths: source.outboundKmTenths,
    returnFrom: source.returnFrom,
    returnTo: source.returnTo,
    returnKmTenths: source.returnKmTenths,
  };
}

export function clientKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLocaleLowerCase("fi");
}

export function matchingClient(entries: Entry[], template: TemplateId, name: string, exceptId?: string): Entry | null {
  const key = clientKey(name);
  if (!key) return null;
  const same = entries
    .filter((entry) => entry.template === template && entry.id !== exceptId && clientKey(entry.clientName) === key)
    .sort(compareEntries);
  return same.at(-1) ?? null;
}

export function clientNames(entries: Entry[], template: TemplateId): string[] {
  const latest = new Map<string, string>();
  for (const entry of entries.filter((item) => item.template === template).sort(compareEntries)) {
    const key = clientKey(entry.clientName);
    if (key) latest.set(key, entry.clientName);
  }
  return [...latest.values()].sort((a, b) => a.localeCompare(b, "fi"));
}

export function adoptClient(entries: Entry[], entry: Entry): Entry {
  const cleaned = entry.clientName.trim().replace(/\s+/g, " ");
  const match = matchingClient(entries, entry.template, cleaned, entry.id);
  if (!match) return { ...entry, clientName: cleaned };
  return {
    ...entry,
    clientName: match.clientName,
    municipality: entry.municipality.trim() ? entry.municipality : match.municipality,
    orderer: entry.template === "ktt" && !entry.orderer.trim() ? match.orderer : entry.orderer,
    grantedHours: entry.template === "opetus" && !entry.grantedHours.trim() ? match.grantedHours : entry.grantedHours,
    validUntil: entry.template === "opetus" && !entry.validUntil ? match.validUntil : entry.validUntil,
    folderGivenOn: entry.template === "opetus" && !entry.folderGivenOn ? match.folderGivenOn : entry.folderGivenOn,
  };
}

export function usesOrderedHours(template: TemplateId): boolean {
  return template === "monetra" || template === "ktt";
}

export function sessionCountOf(entry: Entry): number {
  const value = Math.round(Number(entry.sessionCount));
  if (!Number.isInteger(value) || value < 1) return 1;
  return Math.min(10, value);
}

export function sessionCountLabel(count: number): string {
  return count === 1 ? "1 kerta" : `${count} kertaa`;
}

export function parseSessionCount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

export function orderedMinutes(entry: Entry): number | null {
  if (!usesOrderedHours(entry.template) || entry.orderedStart == null || entry.orderedEnd == null) return null;
  return durationMinutes(entry.orderedStart, entry.orderedEnd);
}

export function workedMinutes(entry: Entry): number | null {
  if (usesOrderedHours(entry.template) && entry.workMatchesOrder) return orderedMinutes(entry);
  if (entry.workStart == null || entry.workEnd == null) return null;
  return durationMinutes(entry.workStart, entry.workEnd);
}

export function sessionBalance(entries: Entry[], entry: Entry): { granted: number; used: number; remaining: number } | null {
  if (entry.template !== "opetus") return null;
  const granted = parseSessionCount(entry.grantedHours);
  if (granted == null || !entry.clientName.trim()) return null;
  const key = clientKey(entry.clientName);
  const same = entries
    .filter((item) => item.template === "opetus" && clientKey(item.clientName) === key)
    .map((item) => (item.id === entry.id ? entry : item));
  const sequence = (same.some((item) => item.id === entry.id) ? same : [...same, entry]).sort(compareEntries);
  let used = 0;
  for (const item of sequence) {
    used += sessionCountOf(item);
    if (item.id === entry.id) break;
  }
  return { granted, used, remaining: granted - used };
}

export function entryKmTenths(entry: Entry): number {
  if (entry.remote) return 0;
  return (entry.outboundKmTenths ?? 0) + (entry.returnKmTenths ?? 0);
}

export function entryCents(entry: Entry, rateCents: number): number {
  if (entry.remote) return 0;
  return legCents(entry.outboundKmTenths, rateCents) + legCents(entry.returnKmTenths, rateCents);
}

export function compareEntries(a: Entry, b: Entry): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const aStart = a.outboundStart ?? 24 * 60 + 1;
  const bStart = b.outboundStart ?? 24 * 60 + 1;
  if (aStart !== bStart) return aStart - bStart;
  return a.clientName.localeCompare(b.clientName, "fi");
}

export function monthEntries(entries: Entry[], template: TemplateId, month: string): Entry[] {
  return entries.filter((entry) => entry.template === template && entry.date.startsWith(month)).sort(compareEntries);
}

export function prepareEntry(entry: Entry): Entry {
  const trimmed: Entry = {
    ...entry,
    clientName: entry.clientName.trim(),
    municipality: entry.municipality.trim(),
    grantedHours: entry.grantedHours.trim(),
    note: entry.note.trim(),
    outboundFrom: entry.outboundFrom.trim(),
    outboundTo: entry.outboundTo.trim(),
    returnFrom: entry.returnFrom.trim(),
    returnTo: entry.returnTo.trim(),
    orderer: entry.orderer.trim(),
  };
  if (trimmed.template !== "opetus") {
    trimmed.grantedHours = "";
    trimmed.validUntil = "";
    trimmed.folderGivenOn = "";
    trimmed.sessionCount = 1;
  } else {
    trimmed.sessionCount = sessionCountOf(trimmed);
  }
  if (trimmed.template !== "ktt") trimmed.orderer = "";
  if (!usesOrderedHours(trimmed.template)) {
    trimmed.orderedStart = null;
    trimmed.orderedEnd = null;
    trimmed.workMatchesOrder = false;
  } else if (trimmed.workMatchesOrder) {
    trimmed.workStart = null;
    trimmed.workEnd = null;
  }
  if (trimmed.template === "opetus") {
    trimmed.workStart = null;
    trimmed.workEnd = null;
  }
  return trimmed.remote ? clearDriving({ ...trimmed, remote: true }) : trimmed;
}

export function exampleEntries(template: TemplateId, month: string): Entry[] {
  const day = (value: number) => `${month}-${String(value).padStart(2, "0")}`;
  const year = month.slice(0, 4);
  const monetra = template === "monetra";

  const antti = emptyEntry(template, day(3));
  const maija = emptyEntry(template, day(3));
  const remote = emptyEntry(template, day(12));
  const cancelled = emptyEntry(template, day(19));

  return [
    {
      ...antti,
      clientName: "Antti Asiakas",
      municipality: "Helsinki",
      grantedHours: template === "opetus" ? "10" : "",
      validUntil: `${year}-12-31`,
      folderGivenOn: day(2),
      outboundStart: 7 * 60 + 30,
      outboundEnd: 8 * 60 + 10,
      outboundFrom: "Kotikatu 1, Helsinki",
      outboundTo: "Opetuskatu 1, Helsinki",
      outboundKmTenths: 220,
      returnStart: 15 * 60,
      returnEnd: 15 * 60 + 40,
      returnFrom: "Opetuskatu 1, Helsinki",
      returnTo: "Kotikatu 1, Helsinki",
      returnKmTenths: 220,
      ...workSample(template, 8 * 60 + 15, 9 * 60 + 15),
      sessionCount: template === "opetus" ? 2 : 1,
      note: monetra ? "Ensimmäinen käynti" : template === "ktt" ? "Sopimus tarkistettu" : "Oppikirja mukana",
    },
    {
      ...maija,
      clientName: "Maija Mallinen",
      municipality: "Espoo",
      grantedHours: template === "opetus" ? "8" : "",
      validUntil: `${year}-06-30`,
      outboundStart: 9 * 60 + 30,
      outboundEnd: 10 * 60 + 5,
      outboundFrom: "Kotikatu 1, Helsinki",
      outboundTo: "Koulutie 4, Espoo",
      outboundKmTenths: 150,
      returnStart: 12 * 60,
      returnEnd: 12 * 60 + 40,
      returnFrom: "Koulutie 4, Espoo",
      returnTo: "Kotikatu 1, Helsinki",
      returnKmTenths: 160,
      ...workSample(template, 10 * 60 + 15, 11 * 60 + 45, false),
      note: monetra ? "Materiaali mukana" : template === "ktt" ? "Loppui etuajassa" : "Huoltaja paikalla",
    },
    {
      ...remote,
      clientName: "Antti Asiakas",
      municipality: "Helsinki",
      grantedHours: template === "opetus" ? "10" : "",
      validUntil: `${year}-12-31`,
      folderGivenOn: day(2),
      remote: true,
      ...workSample(template, 12 * 60, 13 * 60),
      note: monetra ? "Etäyhteys" : template === "ktt" ? "Etätapaaminen" : "Etäopetus",
    },
    {
      ...cancelled,
      clientName: "Maija Mallinen",
      municipality: "Espoo",
      grantedHours: template === "opetus" ? "8" : "",
      validUntil: `${year}-06-30`,
      outboundStart: 8 * 60,
      outboundEnd: 8 * 60 + 25,
      outboundFrom: "Kotikatu 1, Helsinki",
      outboundTo: "Koulutie 4, Espoo",
      outboundKmTenths: 100,
      returnStart: 11 * 60,
      returnEnd: 11 * 60 + 20,
      returnFrom: "Koulutie 4, Espoo",
      returnTo: "Kotikatu 1, Helsinki",
      returnKmTenths: 100,
      cancellation: "100",
      ...workSample(template, 8 * 60 + 30, 9 * 60),
      note: monetra ? "Peruttu aamulla" : template === "ktt" ? "Asiakas perui" : "Peruttu aamulla",
    },
  ];
}

function workSample(template: TemplateId, start: number, end: number, matchesOrder = true): Partial<Entry> {
  if (template === "opetus") return {};
  const orderer = template === "ktt" ? (matchesOrder ? "Helsingin kaupunki" : "Hyvinvointialue") : "";
  return matchesOrder
    ? { orderer, orderedStart: start, orderedEnd: end, workMatchesOrder: true }
    : { orderer, orderedStart: start, orderedEnd: end + 45, workStart: start, workEnd: end, workMatchesOrder: false };
}
