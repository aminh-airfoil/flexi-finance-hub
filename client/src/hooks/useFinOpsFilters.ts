/**
 * useFinOpsFilters
 *
 * Shared hook that persists the selected month, year, and view mode across
 * all FinOps pages (Reports, Categories, Transactions) via localStorage.
 *
 * localStorage keys:
 *   finops_selected_month  — 0-indexed month number (0 = January)
 *   finops_selected_year   — 4-digit year
 *   finops_selected_view   — "monthly" | "yearly"
 */

import { useState, useCallback } from "react";

const KEYS = {
  month: "finops_selected_month",
  year:  "finops_selected_year",
  view:  "finops_selected_view",
} as const;

type ViewMode = "monthly" | "yearly";

// ── helpers ──────────────────────────────────────────────────────────────────

function readInt(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readView(fallback: ViewMode): ViewMode {
  try {
    const raw = localStorage.getItem(KEYS.view);
    if (raw === "monthly" || raw === "yearly") return raw;
    return fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: string | number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // localStorage unavailable (e.g. private browsing with storage blocked) — fail silently
  }
}

// ── hook ─────────────────────────────────────────────────────────────────────

export function useFinOpsFilters() {
  const now = new Date();

  // Initialise from localStorage; fall back to current month/year/monthly view
  const [selectedMonth, _setSelectedMonth] = useState<number>(
    () => readInt(KEYS.month, now.getMonth()),
  );
  const [selectedYear, _setSelectedYear] = useState<number>(
    () => readInt(KEYS.year, now.getFullYear()),
  );
  const [selectedView, _setSelectedView] = useState<ViewMode>(
    () => readView("monthly"),
  );

  // Wrapped setters that also persist to localStorage immediately
  const setSelectedMonth = useCallback((month: number) => {
    persist(KEYS.month, month);
    _setSelectedMonth(month);
  }, []);

  const setSelectedYear = useCallback((year: number) => {
    persist(KEYS.year, year);
    _setSelectedYear(year);
  }, []);

  const setSelectedView = useCallback((view: ViewMode) => {
    persist(KEYS.view, view);
    _setSelectedView(view);
  }, []);

  return {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    selectedView,
    setSelectedView,
  };
}
