import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { TxRow } from "@/components/shared/TxRow";
import { TransactionDialog } from "@/components/dialogs/TransactionDialog";
import { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const { transactions, deleteTransaction } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const sorted = useMemo(() =>
    [...transactions]
      .filter(t => {
        const matchSearch = t.desc.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" ? true : filter === "income" ? t.amount > 0 : t.amount < 0;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions, search, filter]
  );

  return (
    <div className="pb-6 animate-fade-in">
      <div className="px-4 pt-5 pb-4">
        <div className="text-2xl font-black text-foreground tracking-tight">Transactions</div>
        <div className="text-xs text-muted-foreground">March 2025 · {sorted.length} records</div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full py-2.5 pl-9 pr-3 bg-card border border-border rounded-xl text-foreground text-sm outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Filter pills */}
      <div className="px-4 pb-4 flex gap-2">
        {["all", "income", "expense"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >{f}</button>
        ))}
      </div>

      {/* List */}
      <div className="px-4">
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {sorted.map(tx => (
            <TxRow key={tx.id} tx={tx}
              onEdit={(t) => { setEditing(t); setDialogOpen(true); }}
              onDelete={deleteTransaction}
            />
          ))}
          {sorted.length === 0 && (
            <div className="p-8 text-center text-muted-foreground text-sm">No transactions found</div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 w-13 h-13 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform z-40">
        <Plus size={22} className="text-primary-foreground" />
      </button>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} />
    </div>
  );
}
