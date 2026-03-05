import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, ArrowLeftRight, Bell } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatBadge } from "@/components/shared/StatBadge";
import { TxRow } from "@/components/shared/TxRow";
import { dailyTrend } from "@/lib/data";

const prevMonth = { inflow: 6890, outflow: 3210, transactions: 32 };
const currMonth = { inflow: 6740, outflow: 3890, transactions: 20 };

export default function DashboardPage() {
  const { fmt, categories, transactions, getCat } = useApp();
  const isMobile = useIsMobile();

  const spendByCat = useMemo(() =>
    categories.map(cat => ({
      ...cat,
      spent: transactions.filter(t => t.cat === cat.id && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    })).filter(c => c.spent > 0).sort((a, b) => b.spent - a.spent),
    [categories, transactions]
  );

  const recentTx = useMemo(() =>
    [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8),
    [transactions]
  );

  const inflow = currMonth.inflow;
  const outflow = currMonth.outflow;
  const net = inflow - outflow;

  const bento = [
    { label: "Total Inflow", value: inflow, prev: prevMonth.inflow, color: "text-success", icon: TrendingUp },
    { label: "Total Outflow", value: outflow, prev: prevMonth.outflow, color: "text-destructive", icon: TrendingDown },
    { label: "Net Flow", value: net, prev: prevMonth.inflow - prevMonth.outflow, color: net > 0 ? "text-success" : "text-destructive", icon: net > 0 ? TrendingUp : TrendingDown },
    { label: "Transactions", value: currMonth.transactions, prev: prevMonth.transactions, isCnt: true, color: "text-primary", icon: ArrowLeftRight },
  ];

  const pct = (curr: number, prev: number) => ((curr - prev) / prev) * 100;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-xl p-3 text-xs">
        <div className="text-muted-foreground mb-1">Mar {label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color }} className="font-bold">{p.name}: {fmt(p.value)}</div>
        ))}
      </div>
    );
  };

  return (
    <div className="pb-6 animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 flex justify-between items-center">
        <div>
          <div className="text-xs text-muted-foreground font-medium">March 2025</div>
          <div className="text-2xl font-black text-foreground tracking-tight">Overview</div>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 rounded-[10px] bg-card border border-border flex items-center justify-center">
            <Bell size={16} className="text-muted-foreground" />
          </button>
          <div className="w-9 h-9 rounded-[10px] bg-primary-dim flex items-center justify-center">
            <span className="text-xs font-black text-primary">JD</span>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
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
        {/* Chart */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-bold text-foreground">Expense Trend</div>
            <div className="text-[11px] text-muted-foreground bg-subtle px-3 py-1 rounded-full">Mar 2025</div>
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

        {/* Spending by Category */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-sm font-bold text-foreground mb-4">Spending by Category</div>
          <div className="space-y-3">
            {spendByCat.map(cat => {
              const Icon = cat.icon;
              const pctVal = Math.min(100, (cat.spent / cat.budget) * 100);
              return (
                <div key={cat.id}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-[7px] flex items-center justify-center" style={{ background: `${cat.color}22` }}>
                        <Icon size={12} style={{ color: cat.color }} />
                      </div>
                      <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                    </div>
                    <span className={`text-xs font-bold ${cat.spent > cat.budget ? "text-destructive" : "text-foreground"}`}>{fmt(cat.spent)}</span>
                  </div>
                  <div className="h-1.5 bg-border rounded-full">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctVal}%`, background: cat.spent > cat.budget ? "#F43F5E" : cat.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="px-4 mt-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-bold text-foreground">Recent Transactions</div>
            <span className="text-[11px] text-primary font-semibold">See all</span>
          </div>
          {recentTx.map(tx => <TxRow key={tx.id} tx={tx} compact />)}
        </div>
      </div>
    </div>
  );
}
