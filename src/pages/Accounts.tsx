import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Wallet, ChevronRight, Plus, Edit3, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatBadge } from "@/components/shared/StatBadge";
import { AccountDialog } from "@/components/dialogs/AccountDialog";
import { Account } from "@/lib/types";
import { monthlyFlow } from "@/lib/data";

export default function AccountsPage() {
  const { accounts, fmt, deleteAccount } = useApp();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  const totalNet = accounts.reduce((s, a) => s + a.balance, 0);
  const pieData = accounts.map(a => ({ name: a.name, value: Math.abs(a.balance), color: a.color }));

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
        {accounts.length === 0 && <div className="text-sm text-muted-foreground p-4">No accounts yet. Add one to get started!</div>}
        {accounts.map(acc => (
          <div key={acc.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3.5 group">
            <div className="w-11 h-11 rounded-[14px] flex-shrink-0 flex items-center justify-center" style={{ background: `${acc.color}22` }}>
              <Wallet size={20} style={{ color: acc.color }} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-foreground">{acc.name}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{acc.bank} · {acc.type}</div>
            </div>
            <div className="text-right">
              <div className={`text-base font-black ${acc.balance < 0 ? "text-destructive" : "text-foreground"}`}>{fmt(acc.balance)}</div>
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
