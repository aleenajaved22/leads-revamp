export const DATE_PLACEHOLDER = "MM/DD/YY";

function pad2(part: string | number) {
  const text = String(part);
  return text.length === 1 ? `0${text}` : text;
}

function expandYear(twoDigit: number) {
  return twoDigit >= 70 ? 1900 + twoDigit : 2000 + twoDigit;
}

/** Display/storage format MM/DD/YY from ISO, MM/DD/YYYY, or MM/DD/YY. */
export function formatAppDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return `${iso[2]}/${iso[3]}/${iso[1].slice(-2)}`;
  }

  const longUs = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (longUs) {
    return `${pad2(longUs[1])}/${pad2(longUs[2])}/${longUs[3].slice(-2)}`;
  }

  const shortUs = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (shortUs) {
    return `${pad2(shortUs[1])}/${pad2(shortUs[2])}/${shortUs[3]}`;
  }

  return trimmed;
}

/** ISO YYYY-MM-DD for native date picker from app date strings. */
export function appDateToIso(value: string) {
  const formatted = formatAppDate(value);
  const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return "";
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = expandYear(Number(match[3]));
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function isoToAppDate(iso: string) {
  return formatAppDate(iso);
}

/** Normalize user input to MM/DD/YY or empty when invalid. */
export function normalizeAppDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const formatted = formatAppDate(trimmed);
  if (!/^(\d{2})\/(\d{2})\/(\d{2})$/.test(formatted)) return "";
  return appDateToIso(formatted) ? formatted : "";
}

export function parseAppDate(value: string) {
  if (value === "-" || value === "N/A" || !value.trim()) return 0;
  const iso = appDateToIso(value);
  if (iso) {
    const [year, month, day] = iso.split("-").map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  const formatted = formatAppDate(value);
  const match = formatted.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return 0;
  const year = expandYear(Number(match[3]));
  const month = Number(match[1]);
  const day = Number(match[2]);
  return new Date(year, month - 1, day).getTime();
}
