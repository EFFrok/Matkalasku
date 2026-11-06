export function formatKm(tenths: number | null): string {
  if (tenths == null) return "";
  const negative = tenths < 0;
  const abs = Math.abs(tenths);
  const whole = Math.floor(abs / 10);
  const frac = abs % 10;
  const text = frac === 0 ? String(whole) : `${whole},${frac}`;
  return `${negative ? "−" : ""}${text}`;
}

export function formatKmLabel(tenths: number | null): string {
  if (tenths == null) return "–";
  return `${formatKm(tenths)} km`;
}

export function parseKmToTenths(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "").replace(/km$/i, "").replace(",", ".");
  if (!/^\d+(\.\d)?$/.test(trimmed)) return null;
  const [whole, frac = "0"] = trimmed.split(".");
  return Number(whole) * 10 + Number(frac);
}

export function formatEuros(cents: number): string {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${euros},${frac} €`;
}

export function formatRate(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const euros = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${euros},${frac}`;
}

export function parseEuroToCents(input: string): number | null {
  const trimmed = input.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) return null;
  const [whole, frac = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function legCents(kmTenths: number | null, rateCents: number): number {
  if (kmTenths == null) return 0;
  return Math.round((kmTenths / 10) * rateCents);
}
