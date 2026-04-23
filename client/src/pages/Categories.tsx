import { useState, useMemo } from "react";
import { useFinOpsFilters } from "@/hooks/useFinOpsFilters";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { ChevronDown, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { SEOHead } from "@/components/shared/SEOHead";
import { parseLocalDate } from "@/lib/utils";
import { Category } from "@/lib/types";

// ─── helpers ────────────────────────────────────────────────────────────────

/** Walk up the category tree to find the root (Main) ancestor */
function getMainAncestor(catId: string, byId: Map<string, Category>): Category | undefined {
  let cur = byId.get(catId);
  while (cur?.parentId) {
    const parent = byId.get(cur.parentId);
    if (!parent) break;
    cur = parent;
  }
  return cur;
}

/** Determine the level of a category: main | sub | detail */
function getLevel(cat: Category, byId: Map<string, Category>): "main" | "sub" | "detail" {
  if (!cat.parentId) return "main";
  const parent = byId.get(cat.parentId);
  if (!parent) return "sub"; // orphan treated as sub
  if (!parent.parentId) return "sub";
  return "detail";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const BOOKKEEPING_NAME = "Bookkeeping";

// ─── page wrapper ────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  return (
    <>
      <SEOHead title="Categories" description="Transaction-based category breakdown for FinTrack." />
      <CategoriesContent />
    </>
  );
}

// ─── main content ────────────────────────────────────────────────────────────

function CategoriesContent() {
  const { categories, transactions, fmt } = useApp();

  // ── period selector ──────────────────────────────────────────────────────
  const {
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
  } = useFinOpsFilters();

  // ── filter controls ──────────────────────────────────────────────────────
  const [excludeBookkeeping, setExcludeBookkeeping] = useState(true);
  const [selectedMainId, setSelectedMainId]         = useState<string>("all");
  const [selectedSubId, setSelectedSubId]           = useState<string>("all");

  // ── build lookup maps ────────────────────────────────────────────────────
  const byId = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const mainCats = useMemo(
    () => categories.filter(c => !c.parentId).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  );

  // Cascading: sub options depend on selected main
  const subCats = useMemo(() => {
    const parentId = selectedMainId === "all" ? null : selectedMainId;
    return categories
      .filter(c => {
        if (!c.parentId) return false;
        const level = getLevel(c, byId);
        if (level !== "sub") return false;
        if (parentId) return c.parentId === parentId;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, selectedMainId, byId]);

  // ── filter transactions for selected period + category filters ───────────
  const periodTxns = useMemo(() => {
    return transactions.filter(t => {
      const d = parseLocalDate(t.date);
      if (Number.isNaN(d.getTime())) return false;
      if (d.getFullYear() !== selectedYear || d.getMonth() !== selectedMonth) return false;

      // Bookkeeping toggle — exclude if the transaction's main category is Bookkeeping
      if (excludeBookkeeping && t.cat) {
        const main = getMainAncestor(t.cat, byId);
        if (main?.name === BOOKKEEPING_NAME) return false;
      }

      // Main category filter
      if (selectedMainId !== "all" && t.cat) {
        const main = getMainAncestor(t.cat, byId);
        if (main?.id !== selectedMainId) return false;
      }

      // Sub category filter (cascading — uses category_id, not name)
      if (selectedSubId !== "all" && t.cat) {
        const cat = byId.get(t.cat);
        if (!cat) return false;
        const level = getLevel(cat, byId);
        if (level === "detail") {
          // parent must match selected sub
          if (cat.parentId !== selectedSubId) return false;
        } else if (level === "sub") {
          if (cat.id !== selectedSubId) return false;
        } else {
          return false; // main-level txn doesn't match a sub filter
        }
      }

      return true;
    });
  }, [transactions, selectedYear, selectedMonth, excludeBookkeeping, selectedMainId, selectedSubId, byId]);

  // ── aggregate: Main → Sub → Detail (all from transactions, no budget) ────
  type AggRow = {
    id: string;
    name: string;
    color: string;
    total: number;
    count: number;
    subs: {
      id: string;
      name: string;
      color: string;
      total: number;
      count: number;
      details: { id: string; name: string; color: string; total: number; count: number }[];
    }[];
  };

  const aggregated = useMemo<AggRow[]>(() => {
    // Accumulate by category_id
    const totals = new Map<string, { total: number; count: number }>();
    for (const t of periodTxns) {
      if (!t.cat) continue;
      const prev = totals.get(t.cat) ?? { total: 0, count: 0 };
      totals.set(t.cat, { total: prev.total + t.amount, count: prev.count + 1 });
    }

    // Build hierarchy
    const mainMap = new Map<string, AggRow>();

    for (const [catId, { total, count }] of Array.from(totals.entries())) {
      const cat = byId.get(catId);
      if (!cat) continue;
      const level = getLevel(cat, byId);

      if (level === "main") {
        const row = mainMap.get(catId) ?? { id: catId, name: cat.name, color: cat.color, total: 0, count: 0, subs: [] };
        row.total += total;
        row.count += count;
        mainMap.set(catId, row);
      } else if (level === "sub") {
        const mainId = cat.parentId!;
        const mainCat = byId.get(mainId);
        if (!mainCat) continue;
        const mainRow = mainMap.get(mainId) ?? { id: mainId, name: mainCat.name, color: mainCat.color, total: 0, count: 0, subs: [] };
        mainRow.total += total;
        mainRow.count += count;
        const existingSub = mainRow.subs.find(s => s.id === catId);
        if (existingSub) {
          existingSub.total += total;
          existingSub.count += count;
        } else {
          mainRow.subs.push({ id: catId, name: cat.name, color: cat.color, total, count, details: [] });
        }
        mainMap.set(mainId, mainRow);
      } else if (level === "detail") {
        const subCat = byId.get(cat.parentId!);
        if (!subCat) continue;
        const mainId = subCat.parentId!;
        const mainCat = byId.get(mainId);
        if (!mainCat) continue;

        const mainRow = mainMap.get(mainId) ?? { id: mainId, name: mainCat.name, color: mainCat.color, total: 0, count: 0, subs: [] };
        mainRow.total += total;
        mainRow.count += count;

        let subRow = mainRow.subs.find(s => s.id === subCat.id);
        if (!subRow) {
          subRow = { id: subCat.id, name: subCat.name, color: subCat.color, total: 0, count: 0, details: [] };
          mainRow.subs.push(subRow);
        }
        subRow.total += total;
        subRow.count += count;

        const existingDetail = subRow.details.find(d => d.id === catId);
        if (existingDetail) {
          existingDetail.total += total;
          existingDetail.count += count;
        } else {
          subRow.details.push({ id: catId, name: cat.name, color: cat.color, total, count });
        }

        mainMap.set(mainId, mainRow);
      }
    }

    // Sort each level by absolute total descending
    const rows = Array.from(mainMap.values());
    rows.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    for (const row of rows) {
      row.subs.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
      for (const sub of row.subs) {
        sub.details.sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
      }
    }
    return rows;
  }, [periodTxns, byId]);

  // ── summary stats ─────────────────────────────────────────────────────────
  const totalAmount = periodTxns.reduce((s, t) => s + t.amount, 0);
  const totalIncome  = periodTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalExpense = periodTxns.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
  const txnCount = periodTxns.length;

  // ── pie chart data (expense categories only) ─────────────────────────────
  const pieData = useMemo(
    () => aggregated
      .filter(r => r.total < 0)
      .map(r => ({ name: r.name, value: Math.abs(r.total), color: r.color }))
      .slice(0, 8),
    [aggregated],
  );

  // ── expanded rows ─────────────────────────────────────────────────────────
  const [expandedMains, setExpandedMains] = useState<Set<string>>(new Set());
  const [expandedSubs, setExpandedSubs]   = useState<Set<string>>(new Set());

  const toggleMain = (id: string) =>
    setExpandedMains(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSub = (id: string) =>
    setExpandedSubs(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // ── year options ──────────────────────────────────────────────────────────
  const years = useMemo(() => {
    const ys = new Set<number>();
    for (const t of transactions) {
      const d = parseLocalDate(t.date);
      if (!Number.isNaN(d.getTime())) ys.add(d.getFullYear());
    }
    return Array.from(ys).sort((a, b) => b - a);
  }, [transactions]);

  // ── reset sub filter when main changes ───────────────────────────────────
  const handleMainChange = (val: string) => {
    setSelectedMainId(val);
    setSelectedSubId("all");
  };

  return (
    <div className="pb-6 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="text-2xl font-black text-foreground tracking-tight">Categories</div>
        <div className="text-xs text-muted-foreground">Transaction-based breakdown</div>
      </div>

      {/* Period + filter controls */}
      <div className="px-4 pb-3 flex flex-wrap gap-2 items-center">
        {/* Year */}
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Month */}
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(Number(e.target.value))}
          className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>

        {/* Main Category filter */}
        <select
          value={selectedMainId}
          onChange={e => handleMainChange(e.target.value)}
          className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All Main Categories</option>
          {mainCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Sub Category filter — cascades from main */}
        <select
          value={selectedSubId}
          onChange={e => setSelectedSubId(e.target.value)}
          disabled={subCats.length === 0}
          className="text-xs bg-card border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40"
        >
          <option value="all">All Sub Categories</option>
          {subCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Bookkeeping toggle */}
        <button
          onClick={() => setExcludeBookkeeping(v => !v)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            excludeBookkeeping
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-card border-border text-muted-foreground"
          }`}
          title={excludeBookkeeping ? "Bookkeeping excluded — click to include" : "Click to exclude Bookkeeping"}
        >
          {excludeBookkeeping ? <EyeOff size={12} /> : <Eye size={12} />}
          Bookkeeping
        </button>
      </div>

      {/* Summary cards */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Income</div>
          <div className="text-lg font-black text-emerald-400 mt-0.5 tracking-tight">{fmt(totalIncome)}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{periodTxns.filter(t => t.amount > 0).length} txns</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Expenses</div>
          <div className="text-lg font-black text-rose-400 mt-0.5 tracking-tight">{fmt(Math.abs(totalExpense))}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{periodTxns.filter(t => t.amount < 0).length} txns</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3">
          <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Net</div>
          <div className={`text-lg font-black mt-0.5 tracking-tight ${totalAmount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {fmt(totalAmount)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{txnCount} total txns</div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-3 flex items-center justify-center">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={70}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={20} outerRadius={32} paddingAngle={2}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  formatter={(val: number) => fmt(val)}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-[10px] text-muted-foreground">No expense data</div>
          )}
        </div>
      </div>

      {/* Category rows */}
      <div className="px-4 space-y-2">
        {aggregated.length === 0 && (
          <div className="text-sm text-muted-foreground p-4 text-center">No transactions for this period.</div>
        )}

        {aggregated.map(main => {
          const isExpanded = expandedMains.has(main.id);
          const isNeg = main.total < 0;

          return (
            <div key={main.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Main row */}
              <button
                onClick={() => toggleMain(main.id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: main.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-foreground truncate">{main.name}</div>
                  <div className="text-[10px] text-muted-foreground">{main.count} txns · {main.subs.length} sub-categories</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-black ${isNeg ? "text-rose-400" : "text-emerald-400"}`}>
                    {fmt(main.total)}
                  </div>
                </div>
                {isExpanded ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
              </button>

              {/* Sub rows */}
              {isExpanded && main.subs.length > 0 && (
                <div className="border-t border-border/50">
                  {main.subs.map(sub => {
                    const subExpanded = expandedSubs.has(sub.id);
                    const subNeg = sub.total < 0;
                    const pct = main.total !== 0 ? Math.abs(sub.total / main.total) * 100 : 0;

                    return (
                      <div key={sub.id} className="border-b border-border/30 last:border-b-0">
                        <button
                          onClick={() => toggleSub(sub.id)}
                          className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/20 transition-colors text-left"
                        >
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sub.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground/90 truncate">{sub.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="h-1 flex-1 bg-border rounded-full max-w-[80px]">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.min(100, pct)}%`, background: sub.color }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% · {sub.count} txns</span>
                            </div>
                          </div>
                          <div className={`text-xs font-bold flex-shrink-0 ${subNeg ? "text-rose-400" : "text-emerald-400"}`}>
                            {fmt(sub.total)}
                          </div>
                          {sub.details.length > 0 && (
                            subExpanded
                              ? <ChevronDown size={12} className="text-muted-foreground flex-shrink-0" />
                              : <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
                          )}
                        </button>

                        {/* Detail rows */}
                        {subExpanded && sub.details.length > 0 && (
                          <div className="bg-accent/10 border-t border-border/20">
                            {sub.details.map(det => {
                              const detNeg = det.total < 0;
                              const detPct = sub.total !== 0 ? Math.abs(det.total / sub.total) * 100 : 0;
                              return (
                                <div key={det.id} className="flex items-center gap-3 px-7 py-2 border-b border-border/20 last:border-b-0">
                                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-70" style={{ background: det.color }} />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[11px] text-foreground/80 truncate">{det.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{det.count} txns · {detPct.toFixed(0)}% of sub</div>
                                  </div>
                                  <div className={`text-[11px] font-semibold flex-shrink-0 ${detNeg ? "text-rose-400" : "text-emerald-400"}`}>
                                    {fmt(det.total)}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
