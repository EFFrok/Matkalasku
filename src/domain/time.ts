export function durationMinutes(startMinutes: number, endMinutes: number): number {
  if (endMinutes >= startMinutes) return endMinutes - startMinutes;
  return 24 * 60 - startMinutes + endMinutes;
}

export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}.${String(mins).padStart(2, "0")}`;
}

export function formatRange(start: number | null, end: number | null): string {
  if (start == null && end == null) return "–";
  const from = start == null ? "–" : formatTime(start);
  const to = end == null ? "–" : formatTime(end);
  return `${from}–${to}`;
}

export function formatMinutes(total: number): string {
  const sign = total < 0 ? "−" : "";
  const abs = Math.abs(Math.round(total));
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  if (hours === 0) return `${sign}${mins} min`;
  if (mins === 0) return `${sign}${hours} h`;
  return `${sign}${hours} h ${String(mins).padStart(2, "0")} min`;
}

export function formatDuration(start: number | null, end: number | null): string {
  if (start == null || end == null) return "";
  return formatMinutes(durationMinutes(start, end));
}

export function parseTimeToMinutes(input: string): number | null {
  const match = input.trim().match(/^(\d{1,2})[.:](\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function currentMonth(now = new Date()): string {
  return todayIso(now).slice(0, 7);
}

export function formatFinnishDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return isoDate;
  return `${Number(match[3])}.${Number(match[2])}.${match[1]}`;
}

export function shiftMonth(month: string, delta: number): string {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return month;
  const date = new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) return month;
  const names = [
    "Tammikuu",
    "Helmikuu",
    "Maaliskuu",
    "Huhtikuu",
    "Toukokuu",
    "Kesäkuu",
    "Heinäkuu",
    "Elokuu",
    "Syyskuu",
    "Lokakuu",
    "Marraskuu",
    "Joulukuu",
  ];
  return `${names[Number(match[2]) - 1]} ${match[1]}`;
}

export function defaultDateForMonth(month: string, now = new Date()): string {
  const today = todayIso(now);
  if (today.startsWith(month)) return today;
  return `${month}-01`;
}
