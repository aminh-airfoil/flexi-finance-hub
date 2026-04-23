import { useMemo } from "react";
import { useFinOpsFilters } from "@/hooks/useFinOpsFilters";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Calendar, Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { SEOHead } from "@/components/shared/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseLocalDate } from "@/lib/utils";
import { PieChartCard, type PieSlice } from "@/components/shared/PieChartCard";



export default function ReportsPage() {
  return (
    <>
      <SEOHead title="Reports" description="Generate monthly and yearly financial reports with FinTrack." />
      <ReportsContent />
    </>
  );
}

function ReportsContent() {
  const { fmt, transactions, categories, accounts, getCat, getAcc } = useApp();
  const isMobile = useIsMobile();
  const {
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
    selectedView: mode, setSelectedView: setMode,
  } = useFinOpsFilters();

  // Available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      const d = parseLocalDate(t.date);
      if (!isNaN(d.getTime())) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const currentYear = new Date().getFullYear();

  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Filter transactions for selected period
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const d = parseLocalDate(t.date);
      if (isNaN(d.getTime())) return false;
      if (d.getFullYear() !== selectedYear) return false;
      if (mode === "monthly" && d.getMonth() !== selectedMonth) return false;
      return true;
    });
  }, [transactions, selectedYear, selectedMonth, mode]);

  // Summary stats
  const summary = useMemo(() => {
    let inflow = 0, outflow = 0;
    filtered.forEach(t => {
      if (t.amount > 0) inflow += t.amount;
      else outflow += Math.abs(t.amount);
    });
    return { inflow, outflow, net: inflow - outflow, count: filtered.length };
  }, [filtered]);

  // Walk up the category hierarchy to find the root main category
  const toMainCat = (catId: string | undefined): ReturnType<typeof getCat> => {
    if (!catId) return undefined;
    let cat = getCat(catId);
    while (cat && cat.parentId) {
      const parent = getCat(cat.parentId);
      if (!parent) break;
      cat = parent;
    }
    return cat;
  };

  // Category breakdown — grouped by MAIN category (hierarchy traversal)
  const categoryBreakdown = useMemo(() => {
    const PALETTE = [
      "#3B82F6","#EF4444","#10B981","#F59E0B","#8B5CF6",
      "#EC4899","#06B6D4","#84CC16","#F97316","#6366F1",
      "#14B8A6","#E11D48",
    ];
    const map = new Map<string, { name: string; amount: number }>();
    filtered.forEach(t => {
      if (t.amount >= 0) return;
      const main = toMainCat(t.cat ?? undefined);
      const key = main?.id || "uncategorized";
      const name = main?.name || "Uncategorized";
      const prev = map.get(key) || { name, amount: 0 };
      map.set(key, { name, amount: prev.amount + Math.abs(t.amount) });
    });
    return Array.from(map.entries())
      .map(([, { name, amount }], i): PieSlice => ({
        name,
        value: amount,
        rawTotal: -amount,   // negative = expense
        color: PALETTE[i % PALETTE.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered, getCat]);

  // Account breakdown
  const accountBreakdown = useMemo(() => {
    const map = new Map<string, { inflow: number; outflow: number }>();
    filtered.forEach(t => {
      const entry = map.get(t.acc) || { inflow: 0, outflow: 0 };
      if (t.amount > 0) entry.inflow += t.amount;
      else entry.outflow += Math.abs(t.amount);
      map.set(t.acc, entry);
    });
    return Array.from(map.entries()).map(([id, data]) => {
      const acc = getAcc(id);
      return { id, name: acc?.name || "Unknown", ...data };
    });
  }, [filtered, getAcc]);

  // Monthly chart data (for yearly view)
  const monthlyChartData = useMemo(() => {
    if (mode !== "yearly") return [];
    return MONTHS.map((name, i) => {
      let inflow = 0, outflow = 0;
      transactions.forEach(t => {
        const d = parseLocalDate(t.date);
        if (isNaN(d.getTime()) || d.getFullYear() !== selectedYear || d.getMonth() !== i) return;
        if (t.amount > 0) inflow += t.amount;
        else outflow += Math.abs(t.amount);
      });
      return { month: name.slice(0, 3), inflow, outflow };
    });
  }, [transactions, selectedYear, mode]);

  // Daily chart data (for monthly view)
  const dailyChartData = useMemo(() => {
    if (mode !== "monthly") return [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      inflow: 0,
      outflow: 0,
    }));
    filtered.forEach(t => {
      const d = parseLocalDate(t.date);
      const day = d.getDate();
      if (day >= 1 && day <= daysInMonth) {
        if (t.amount > 0) data[day - 1].inflow += t.amount;
        else data[day - 1].outflow += Math.abs(t.amount);
      }
    });
    return data;
  }, [filtered, selectedYear, selectedMonth, mode]);

  // Export CSV
  const exportCSV = () => {
    const header = "Date,Description,Category,Account,Amount,Note\n";
    const rows = filtered.map(t => {
      const cat = getCat(t.cat);
      const acc = getAcc(t.acc);
      return `${t.date},"${t.desc}","${cat?.name || ""}","${acc?.name || ""}",${t.amount},"${t.note}"`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "monthly"
      ? `fintrack-report-${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}.csv`
      : `fintrack-report-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodLabel = mode === "monthly"
    ? `${MONTHS[selectedMonth]} ${selectedYear}`
    : `${selectedYear}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs">
        <div className="text-muted-foreground mb-1">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color }} className="font-bold">{p.name}: {fmt(p.value)}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-6 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-5 pb-4">
        <div className="text-xs text-muted-foreground font-medium">Financial Reports</div>
        <div className="text-2xl font-black text-foreground tracking-tight">Reports</div>
      </div>

      {/* Controls */}
      <div className="px-4 mb-4">
        <div className={`flex ${isMobile ? "flex-col gap-3" : "items-center gap-3"}`}>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "monthly" | "yearly")} className="w-auto">
            <TabsList>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(availableYears.length ? availableYears : [currentYear]).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {mode === "monthly" && (
              <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
            <Download size={14} />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={`px-4 grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-success" />
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Income</span>
            </div>
            <div className="text-lg font-black text-foreground">{fmt(summary.inflow)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={14} className="text-destructive" />
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Expenses</span>
            </div>
            <div className="text-lg font-black text-foreground">{fmt(summary.outflow)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Minus size={14} className="text-primary" />
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Net</span>
            </div>
            <div className={`text-lg font-black ${summary.net >= 0 ? "text-success" : "text-destructive"}`}>{fmt(summary.net)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} className="text-primary" />
              <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Transactions</span>
            </div>
            <div className="text-lg font-black text-foreground">{summary.count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className={`px-4 mt-4 ${isMobile ? "space-y-4" : "grid grid-cols-2 gap-4"}`}>
        {/* Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">
              {mode === "monthly" ? "Daily Breakdown" : "Monthly Breakdown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mode === "monthly" ? dailyChartData : monthlyChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 30%, 18%)" vertical={false} />
                <XAxis
                  dataKey={mode === "monthly" ? "day" : "month"}
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={false}
                  interval={mode === "monthly" ? 4 : 0}
                />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="inflow" name="Income" fill="hsl(160, 64%, 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outflow" name="Expenses" fill="hsl(350, 89%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Category Breakdown */}
        <PieChartCard
          title="Expenses by Category"
          data={categoryBreakdown}
          fmt={fmt}
        />
      </div>

      {/* Account Summary */}
      {accountBreakdown.length > 0 && (
        <div className="px-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold">Account Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {accountBreakdown.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{acc.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-success font-bold">+{fmt(acc.inflow)}</span>
                      <span className="text-xs text-destructive font-bold">-{fmt(acc.outflow)}</span>
                      <span className={`text-xs font-black ${acc.inflow - acc.outflow >= 0 ? "text-success" : "text-destructive"}`}>
                        {fmt(acc.inflow - acc.outflow)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction List */}
      <div className="px-4 mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold">{periodLabel} Transactions ({filtered.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">No transactions for this period</div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {filtered.slice(0, 50).map(tx => {
                  const cat = getCat(tx.cat);
                  const acc = getAcc(tx.acc);
                  return (
                    <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div className="flex items-center gap-3 min-w-0">
                        {cat && (
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}22` }}>
                            <cat.icon size={13} style={{ color: cat.color }} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground truncate">{tx.desc}</div>
                          <div className="text-[11px] text-muted-foreground">{tx.date} · {acc?.name || ""}</div>
                        </div>
                      </div>
                      <span className={`text-sm font-bold flex-shrink-0 ${tx.amount >= 0 ? "text-success" : "text-destructive"}`}>
                        {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                      </span>
                    </div>
                  );
                })}
                {filtered.length > 50 && (
                  <div className="py-2 text-center text-xs text-muted-foreground">Showing 50 of {filtered.length} transactions</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
