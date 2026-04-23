import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, ArrowLeftRight, Bell } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatBadge } from "@/components/shared/StatBadge";
import { TxRow } from "@/components/shared/TxRow";
import { SEOHead } from "@/components/shared/SEOHead";
import { parseLocalDate } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <>
      <SEOHead title="Dashboard" description="View your financial overview, spending trends, and recent transactions on FinTrack." />
      <DashboardContent />
    </>
  );
}

function DashboardContent() {
  const { fmt, categories, transactions, getCat } = useApp();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const initials = user?.email ? user.email.substring(0, 2).toUpperCase() : "??";

  const { prevMonth, currMonth, currentLabel, currYear, currMonthNum } = useMemo(() => {
    if (!transactions.length) {
      const empty = { inflow: 0, outflow: 0, transactions: 0 };
      return { prevMonth: empty, currMonth: empty, currentLabel: "", currYear: null as number | null, currMonthNum: null as number | null };
    }

    type MonthAgg = { inflow: number; outflow: number; transactions: number };
    const monthMap = new Map<string, MonthAgg>();

    transactions.forEach(t => {
      const d = parseLocalDate(t.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const entry = monthMap.get(key) || { inflow: 0, outflow: 0, transactions: 0 };
      if (t.amount > 0) entry.inflow += t.amount;
      else if (t.amount < 0) entry.outflow += Math.abs(t.amount);
      entry.transactions += 1;
      monthMap.set(key, entry);
    });

    const keys = Array.from(monthMap.keys()).sort();
    const currKey = keys[keys.length - 1];
    const prevKey = keys.length > 1 ? keys[keys.length - 2] : undefined;
    const curr = monthMap.get(currKey)!;
    const prev = prevKey ? monthMap.get(prevKey)! : curr;
    const [year, month] = currKey.split("-");
    const yearNum = Number(year);
    const monthNum = Number(month); // 1-12
    const monthName = new Date(yearNum, monthNum - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

    return { prevMonth: prev, currMonth: curr, currentLabel: monthName, currYear: yearNum, currMonthNum: monthNum };
  }, [transactions]);

  const dailyTrend = useMemo(() => {
    if (!transactions.length || !currYear || !currMonthNum) return [];

    const daysInMonth = new Date(currYear, currMonthNum, 0).getDate();
    const data = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      expenses: 0,
    }));

    transactions.forEach(t => {
      if (t.amount >= 0) return;
      const d = parseLocalDate(t.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() === currYear && d.getMonth() + 1 === currMonthNum) {
        const day = d.getDate();
        if (day >= 1 && day <= daysInMonth) {
          data[day - 1].expenses += Math.abs(t.amount);
        }
      }
    });

    return data;
  }, [transactions, currYear, currMonthNum]);

  const spendByCat = useMemo(() => {
    if (!transactions.length || !currYear || !currMonthNum) return [];

    const monthIdx = currMonthNum - 1; // currMonthNum is 1-12

    // Build a map from any category id → its main category id.
    // Transactions point to sub/detail categories (not main), so we need to
    // walk up the hierarchy to attribute each transaction to its main category.
    const catById = new Map(categories.map(c => [c.id, c]));
    const toMainId = (catId: string | null | undefined): string | null => {
      if (!catId) return null;
      let c = catById.get(catId);
      while (c?.parentId) c = catById.get(c.parentId);
      return c?.id ?? null;
    };

    // Aggregate expense amounts per main category for the current month
    const spendMap = new Map<string, number>();
    transactions.forEach(t => {
      if (t.amount >= 0) return; // expenses only
      const d = parseLocalDate(t.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getFullYear() !== currYear || d.getMonth() !== monthIdx) return;
      const mainId = toMainId(t.cat);
      if (!mainId) return;
      spendMap.set(mainId, (spendMap.get(mainId) ?? 0) + Math.abs(t.amount));
    });

    return categories
      .filter(c => !c.parentId && (spendMap.get(c.id) ?? 0) > 0)
      .map(c => ({ ...c, spentWithSubs: spendMap.get(c.id) ?? 0 }))
      .sort((a, b) => b.spentWithSubs - a.spentWithSubs);
  }, [categories, transactions, currYear, currMonthNum]);

  const recentTx = useMemo(() =>
    [...transactions].sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime()).slice(0, 8),
    [transactions]
  );

  const inflow = currMonth.inflow;
  const outflow = currMonth.outflow;
  const net = inflow - outflow;
  const totalTransactions = transactions.length;

  const bento = [
    { label: "Total Inflow", value: inflow, prev: prevMonth.inflow, color: "text-success", icon: TrendingUp },
    { label: "Total Outflow", value: outflow, prev: prevMonth.outflow, color: "text-destructive", icon: TrendingDown },
    { label: "Net Flow", value: net, prev: prevMonth.inflow - prevMonth.outflow, color: net > 0 ? "text-success" : "text-destructive", icon: net > 0 ? TrendingUp : TrendingDown },
    { label: "Transactions", value: totalTransactions, prev: totalTransactions, isCnt: true, color: "text-primary", icon: ArrowLeftRight },
  ];

  const pct = (curr: number, prev: number) => prev === 0 ? 0 : ((curr - prev) / prev) * 100;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs">
        <div className="text-muted-foreground mb-1">Day {label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color }} className="font-bold">{p.name}: {fmt(p.value)}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-6 animate-fade-in">
      <div className="px-4 pt-5 pb-4 flex justify-between items-center">
        <div>
          <div className="text-xs text-muted-foreground font-medium">{currentLabel || "No data yet"}</div>
          <div className="text-2xl font-black text-foreground tracking-tight">Overview</div>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-[10px] bg-card border border-border flex items-center justify-center">
            <Bell size={16} className="text-muted-foreground" />
          </button>
          <div className="w-9 h-9 rounded-[10px] bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-black text-primary">{initials}</span>
          </div>
        </div>
      </div>

      <div className={`px-4 grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
        {bento.map((b, i) => {
          const Icon = b.icon;
          const change = pct(b.value, b.prev);
          return (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <div className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">{b.label}</div>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${b.color} bg-current/10`}>
                  <Icon size={13} />
                </div>
              </div>
              <div className={`text-lg font-black text-foreground mt-2 tracking-tight ${b.isCnt ? "text-2xl" : ""}`}>
                {b.isCnt ? b.value : fmt(b.value)}
              </div>
              <div className="mt-1.5"><StatBadge value={change} /></div>
            </div>
          );
        })}
      </div>

      <div className={`px-4 mt-4 ${isMobile ? "space-y-3" : "grid grid-cols-2 gap-4"}`}>
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-bold text-foreground">Expense Trend</div>
            <div className="text-[11px] text-muted-foreground bg-subtle px-3 py-1 rounded-full">
              {dailyTrend.length ? "This month" : "No data yet"}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dailyTrend} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216, 30%, 18%)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#0EA5E9" strokeWidth={2} fill="url(#gradExp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-sm font-bold text-foreground mb-4">Spending by Category</div>
          <div className="space-y-3">
            {spendByCat.length === 0 && <div className="text-sm text-muted-foreground">No spending data yet</div>}
            {spendByCat.map(cat => {
              const Icon = cat.icon;
              const pctVal = Math.min(100, (cat.spentWithSubs / cat.budget) * 100);
              return (
                <div key={cat.id}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-[7px] flex items-center justify-center" style={{ background: `${cat.color}22` }}>
                        <Icon size={12} style={{ color: cat.color }} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                    </div>
                    <span className={`text-xs font-bold ${cat.spentWithSubs > cat.budget ? "text-destructive" : "text-foreground"}`}>{fmt(cat.spentWithSubs)}</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctVal}%`, background: cat.spentWithSubs > cat.budget ? "#F43F5E" : cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 mt-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-bold text-foreground">Recent Transactions</div>
            <span className="text-[11px] text-primary font-semibold">See all</span>
          </div>
          {recentTx.length === 0 && <div className="p-4 text-sm text-muted-foreground">No transactions yet</div>}
          {recentTx.map(tx => <TxRow key={tx.id} tx={tx} compact />)}
        </div>
      </div>
    </div>
  );
}
