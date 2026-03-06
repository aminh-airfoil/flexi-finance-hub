import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { TxRow } from "@/components/shared/TxRow";
import { TransactionDialog } from "@/components/dialogs/TransactionDialog";
import { Transaction } from "@/lib/types";

export default function TransactionsPage() {
  const { transactions, deleteTransaction, categories } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [mainFilter, setMainFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const mainCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);

  const sorted = useMemo(() => {
    const byId = new Map(categories.map(c => [c.id, c]));

    return [...transactions]
      .filter(t => {
        const matchSearch = t.desc.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "all" ? true : filter === "income" ? t.amount > 0 : t.amount < 0;

        let matchMain = true;
        if (mainFilter !== "all") {
          const cat = t.cat != null ? byId.get(t.cat) : undefined;
          if (!cat) {
            matchMain = false;
          } else if (!cat.parentId) {
            matchMain = cat.id === mainFilter;
          } else {
            matchMain = cat.parentId === mainFilter;
          }
        }

        return matchSearch && matchFilter && matchMain;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, search, filter, mainFilter, categories]);

  return (
    <div className="pb-6 animate-fade-in">
      <div className="px-4 pt-5 pb-4">
        <div className="text-2xl font-black text-foreground tracking-tight">Transactions</div>
        <div className="text-xs text-muted-foreground">{sorted.length} records</div>
      </div>

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

      <div className="px-4 pb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          {["all", "income", "expense"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Main category:</span>
          <select value={mainFilter} onChange={e => setMainFilter(e.target.value)}
            className="ml-auto rounded-full border border-border bg-card px-3 py-1 text-[11px] text-foreground">
            <option value="all">All categories</option>
            {mainCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

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

      <button onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 w-13 h-13 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform z-40">
        <Plus size={22} className="text-primary-foreground" />
      </button>

      <TransactionDialog open={dialogOpen} onOpenChange={setDialogOpen} transaction={editing} />
    </div>
  );
}
