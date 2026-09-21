/** UI formatting helpers — 12-hour clocks, durations, distances. */

/** "09:12" → "9:12 AM"; returns "—" for null/invalid. */
export function clock12(hhmm: string | null | undefined): string {
  if (!hhmm) return "—";
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return hhmm;
  let h = Number(m[1]);
  const min = m[2];
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${suffix}`;
}

/** 154 → "2h 34m"; 45 → "45m"; null → "—". */
export function duration(minutes: number | null | undefined): string {
  if (minutes == null || Number.isNaN(minutes)) return "—";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Add minutes to an "HH:MM" clock; returns 12-hour formatted result. */
export function clockPlusMinutes(hhmm: string | null | undefined, minutes: number): string {
  if (!hhmm) return "—";
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return "—";
  const total = Number(m[1]) * 60 + Number(m[2]) + Math.round(minutes);
  const h = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return clock12(`${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
}

/** 15-minute clock options from 06:00–20:00 as { value: "09:00", label: "9:00 AM" }. */
export function clockOptions(from = "06:00", to = "20:00", stepMin = 15): { value: string; label: string }[] {
  const parse = (s: string) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!m) return 0;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const start = parse(from);
  const end = parse(to);
  const out: { value: string; label: string }[] = [];
  for (let t = start; t <= end; t += stepMin) {
    const h = Math.floor(t / 60) % 24;
    const mm = t % 60;
    const value = `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    out.push({ value, label: clock12(value) });
  }
  return out;
}
export function km(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)} km`;
}
