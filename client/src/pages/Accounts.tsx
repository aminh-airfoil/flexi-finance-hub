import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Wallet, ChevronRight, Plus, Edit3, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatBadge } from "@/components/shared/StatBadge";
import { AccountDialog } from "@/components/dialogs/AccountDialog";
import { Account } from "@/lib/types";
import { SEOHead } from "@/components/shared/SEOHead";
import { parseLocalDate } from "@/lib/utils";

export default function AccountsPage() {
  return (
    <>
      <SEOHead title="Accounts" description="Manage your bank accounts, view balances, and track account activity in FinTrack." />
      <AccountsContent />
    </>
  );
}

function AccountsContent() {
  const { accounts, transactions, fmt, deleteAccount } = useApp();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  type AccountWithComputed = Account & { computedBalance: number };

  const accountsWithComputed: AccountWithComputed[] = useMemo(() => {
    if (!accounts.length) return [];

    const deltaByAccount = new Map<string, number>();
    transactions.forEach(t => {
      if (!t.acc) return;
      const current = deltaByAccount.get(t.acc) ?? 0;
      deltaByAccount.set(t.acc, current + t.amount);
    });

    return accounts.map(a => {
      const txDelta = deltaByAccount.get(a.id) ?? 0;
      return {
        ...a,
        // initial balance from account setup + net movement from transactions
        computedBalance: a.balance + txDelta,
      };
    });
  }, [accounts, transactions]);

  const totalNet = accountsWithComputed.reduce((s, a) => s + a.computedBalance, 0);
  const pieData = accountsWithComputed.map(a => ({ name: a.name, value: Math.abs(a.computedBalance), color: a.color }));

  const monthlyFlow = useMemo(() => {
    if (!transactions.length) return [];

    type FlowAgg = { m: string; i: number; e: number };
    const monthMap = new Map<string, FlowAgg>();

    transactions.forEach(t => {
      const d = parseLocalDate(t.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = new Date(d.getFullYear(), d.getMonth(), 1).toLocaleString("en-US", { month: "short" });
      const entry = monthMap.get(key) || { m: monthLabel, i: 0, e: 0 };
      if (t.amount > 0) entry.i += t.amount;
      else if (t.amount < 0) entry.e += Math.abs(t.amount);
      monthMap.set(key, entry);
    });

    const keys = Array.from(monthMap.keys()).sort();
    const lastKeys = keys.slice(-6); // last 6 months with data
    return lastKeys.map(k => monthMap.get(k)!);
  }, [transactions]);

  return (
    <div className="pb-6 animate-fade-in">
      <div className="px-4 pt-5 pb-4">
        <div className="text-2xl font-black text-foreground tracking-tight">Accounts</div>
        <div className="text-xs text-muted-foreground">Net worth overview</div>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-gradient-to-br from-primary/10 to-card border border-primary/20 rounded-2xl p-6 text-center">
          <div className="text-xs text-primary font-bold uppercase tracking-widest">Total Net Worth</div>
          <div className="text-4xl font-black text-foreground mt-2 tracking-tight">{fmt(totalNet)}</div>
          <div className="mt-2 flex justify-center"><StatBadge value={0} /></div>
          {pieData.length > 0 && (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [fmt(v)]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className={`px-4 ${isMobile ? "space-y-3" : "grid grid-cols-2 gap-3"}`}>
        {accountsWithComputed.length === 0 && <div className="text-sm text-muted-foreground p-4">No accounts yet. Add one to get started!</div>}
        {accountsWithComputed.map(acc => (
          <div key={acc.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-[14px] flex-shrink-0 flex items-center justify-center" style={{ background: `${acc.color}22` }}>
              <Wallet size={20} style={{ color: acc.color }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">{acc.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{acc.bank} · {acc.type}</div>
            </div>
            <div className="text-right">
              <div className={`text-base font-black ${acc.computedBalance < 0 ? "text-destructive" : "text-foreground"}`}>{fmt(acc.computedBalance)}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Available</div>
            </div>
            <div className="hidden group-hover:flex items-center gap-1">
              <button onClick={() => { setEditing(acc); setDialogOpen(true); }} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"><Edit3 size={13} /></button>
              <button onClick={() => deleteAccount(acc.id)} className="p-1.5 rounded-md hover:bg-destructive-dim text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
            </div>
            <ChevronRight size={14} className="text-muted-foreground" />
          </div>
        ))}
      </div>

      <div className="px-4 mt-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="text-sm font-bold text-foreground mb-4">Monthly Cash Flow</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={monthlyFlow} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(216,30%,18%)" vertical={false} />
              <XAxis dataKey="m" tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [fmt(v)]} />
              <Bar dataKey="i" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="e" name="Expenses" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <button onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 w-13 h-13 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform z-40">
        <Plus size={22} className="text-primary-foreground" />
      </button>

      <AccountDialog open={dialogOpen} onOpenChange={setDialogOpen} account={editing} />
    </div>
  );
}
