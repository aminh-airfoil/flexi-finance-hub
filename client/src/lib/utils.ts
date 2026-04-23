import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a YYYY-MM-DD date string as LOCAL date (not UTC).
 *
 * Using `new Date("2026-03-01")` treats it as UTC midnight, which shifts
 * the date back by the local timezone offset (e.g. UTC+8 → Feb 28 23:00 local).
 * This causes getMonth()/getFullYear() to return the wrong values.
 *
 * This function avoids that by constructing the Date with explicit year/month/day
 * in local time.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  const parts = dateStr.split("-");
  if (parts.length !== 3) return new Date(dateStr);
  const [y, m, d] = parts.map(Number);
  return new Date(y, m - 1, d); // local time — no UTC offset shift
}
