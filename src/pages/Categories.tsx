import { useState, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Plus, Edit3, Trash2 } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { CategoryDialog } from "@/components/dialogs/CategoryDialog";
import { Category } from "@/lib/types";

export default function CategoriesPage() {
  const { categories, transactions, fmt, deleteCategory } = useApp();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const withSpend = useMemo(
    () => categories.map(cat => ({
      ...cat,
      spent: transactions.filter(t => t.cat === cat.id && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0),
    })),
    [categories, transactions],
  );

  const mainCategories = useMemo(() => withSpend.filter(c => !c.parentId), [withSpend]);
  const subCategoriesFor = (parentId: string) => withSpend.filter(c => c.parentId === parentId);
  const totalSpent = mainCategories.reduce((s, c) => s + c.spent, 0);

  return (
    <div className="pb-6 animate-fade-in">
      <div className="px-4 pt-5 pb-4">
        <div className="text-2xl font-black text-foreground tracking-tight">Categories</div>
        <div className="text-xs text-muted-foreground">Budget tracking</div>
      </div>

      <div className="px-4 pb-4">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground font-semibold">Total Spent This Month</div>
            <div className="text-3xl font-black text-foreground mt-1 tracking-tight">{fmt(totalSpent)}</div>
          </div>
          <div className="w-[70px] h-[70px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={withSpend.filter(c => c.spent > 0)} dataKey="spent" cx="50%" cy="50%" innerRadius={22} outerRadius={35} paddingAngle={2}>
                  {withSpend.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {mainCategories.length === 0 && <div className="text-sm text-muted-foreground p-4">No categories yet. Add one to get started!</div>}
        {mainCategories.map(main => {
          const Icon = main.icon;
          const pctUsedMain = main.budget > 0 ? Math.min(100, (main.spent / main.budget) * 100) : 0;
          const overMain = main.spent > main.budget;
          const remainingMain = main.budget - main.spent;
          const subs = subCategoriesFor(main.id);

          return (
            <div key={main.id} className={`bg-card border rounded-2xl p-4 group ${overMain ? "border-destructive/30" : "border-border"}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: `${main.color}22` }}>
                  <Icon size={18} style={{ color: main.color }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground">{main.name}</div>
                  <div className="text-[11px] text-muted-foreground">Budget: {fmt(main.budget)}</div>
                </div>
                <div className="text-right">
                  <div className={`text-base font-black ${overMain ? "text-destructive" : "text-foreground"}`}>{fmt(main.spent)}</div>
                  {overMain ? (
                    <div className="text-[10px] text-destructive mt-0.5">+{fmt(Math.abs(remainingMain))} over</div>
                  ) : (
                    <div className="text-[10px] text-success mt-0.5">{fmt(remainingMain)} left</div>
                  )}
                </div>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button onClick={() => { setEditing(main); setDialogOpen(true); }} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"><Edit3 size={13} /></button>
                  <button onClick={() => deleteCategory(main.id)} className="p-1.5 rounded-md hover:bg-destructive-dim text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="h-1.5 bg-border rounded-full">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pctUsedMain}%`, background: overMain ? "#F43F5E" : pctUsedMain > 80 ? "#F59E0B" : main.color }} />
              </div>
              <div className="flex justify-between mt-1.5 mb-2">
                <span className="text-[10px] text-muted-foreground">{pctUsedMain.toFixed(0)}% used</span>
                {overMain && <span className="text-[10px] text-destructive font-semibold">Over budget!</span>}
              </div>

              {subs.length > 0 && (
                <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                  {subs.map(sub => {
                    const pctUsedSub = sub.budget > 0 ? Math.min(100, (sub.spent / sub.budget) * 100) : 0;
                    const overSub = sub.spent > sub.budget;
                    return (
                      <div key={sub.id} className="flex items-center gap-2 text-[11px] text-muted-foreground group/sub">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: sub.color }} />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-medium text-foreground/80">{sub.name}</span>
                            <span className={overSub ? "text-destructive" : "text-foreground"}>{fmt(sub.spent)}</span>
                          </div>
                          <div className="h-1 bg-border rounded-full mt-0.5">
                            <div className="h-full rounded-full" style={{ width: `${pctUsedSub}%`, background: overSub ? "#F43F5E" : pctUsedSub > 80 ? "#F59E0B" : sub.color }} />
                          </div>
                          <div className="flex justify-between mt-0.5">
                            <span className="text-[10px]">{pctUsedSub.toFixed(0)}% used · Budget {fmt(sub.budget)}</span>
                            {overSub && <span className="text-[10px] text-destructive font-semibold">Over</span>}
                          </div>
                        </div>
                        <div className="hidden group-hover/sub:flex flex-col gap-1 ml-1">
                          <button onClick={() => { setEditing(sub); setDialogOpen(true); }} className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"><Edit3 size={11} /></button>
                          <button onClick={() => deleteCategory(sub.id)} className="p-1 rounded-md hover:bg-destructive-dim text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
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

      <button onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 w-13 h-13 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-105 transition-transform z-40">
        <Plus size={22} className="text-primary-foreground" />
      </button>

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />
    </div>
  );
}
