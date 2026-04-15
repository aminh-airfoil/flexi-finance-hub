import { TrendingUp, TrendingDown, Edit3, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Transaction } from "@/lib/types";

interface TxRowProps {
  tx: Transaction;
  compact?: boolean;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
}

export function TxRow({ tx, compact, onEdit, onDelete }: TxRowProps) {
  const { fmt, getCat } = useApp();
  const cat = getCat(tx.cat);
  const Icon = cat?.icon || (tx.amount > 0 ? TrendingUp : TrendingDown);
  const color = cat?.color || (tx.amount > 0 ? "#10B981" : "#64748B");

  let categoryLabel = "Income";
  if (cat) {
    if (!cat.parentId) {
      categoryLabel = cat.name;
    } else {
      const parent = getCat(cat.parentId);
      categoryLabel = parent ? `${parent.name} · ${cat.name}` : cat.name;
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border group">
      <div
        className="w-9 h-9 rounded-[10px] flex-shrink-0 flex items-center justify-center"
        style={{ background: `${color}22` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold text-foreground truncate">{tx.desc}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {categoryLabel} · {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>
      <div className={`text-sm font-bold flex-shrink-0 ${tx.amount > 0 ? "text-success" : "text-foreground"}`}>
        {tx.amount > 0 ? "+" : ""}{fmt(tx.amount)}
      </div>
      {(onEdit || onDelete) && (
        <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button onClick={() => onEdit(tx)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Edit3 size={13} />
            </button>
          )}
          {onDelete && (
            <button onClick={() => onDelete(tx.id)} className="p-1.5 rounded-md hover:bg-destructive-dim text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
