import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import { Transaction } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
}

export function TransactionDialog({ open, onOpenChange, transaction }: Props) {
  const { addTransaction, updateTransaction, categories, accounts } = useApp();
  const [form, setForm] = useState({ desc: "", amount: "", date: "", cat: "", acc: "", note: "" });

  const mainCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);

  const subCategoriesByParent = useMemo(() => {
    const map: Record<string, typeof categories> = {};
    categories.forEach(c => {
      if (c.parentId == null) return;
      if (!map[c.parentId]) map[c.parentId] = [];
      map[c.parentId].push(c);
    });
    return map;
  }, [categories]);

  useEffect(() => {
    if (transaction) {
      setForm({
        desc: transaction.desc,
        amount: String(transaction.amount),
        date: transaction.date,
        cat: transaction.cat || "",
        acc: transaction.acc,
        note: transaction.note,
      });
    } else {
      setForm({
        desc: "", amount: "",
        date: new Date().toISOString().split("T")[0],
        cat: "",
        acc: accounts[0]?.id || "",
        note: "",
      });
    }
  }, [transaction, open, accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      desc: form.desc,
      amount: parseFloat(form.amount),
      date: form.date,
      cat: form.cat || null,
      acc: form.acc,
      note: form.note,
    };
    if (transaction) {
      await updateTransaction({ ...data, id: transaction.id });
    } else {
      await addTransaction(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit" : "Add"} Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Description</Label>
            <Input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} required className="bg-background border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required className="bg-background border-border" placeholder="-124.30" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required className="bg-background border-border" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <select
                value={form.cat}
                onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="">Income (none)</option>
                {mainCategories.map(main => {
                  const subs = subCategoriesByParent[main.id] || [];
                  if (!subs.length) {
                    return <option key={main.id} value={main.id}>{main.name}</option>;
                  }
                  return (
                    <optgroup key={main.id} label={main.name}>
                      {subs.map(sub => (
                        <option key={sub.id} value={sub.id}>{`${main.name} · ${sub.name}`}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            </div>
            <div>
              <Label>Account</Label>
              <select value={form.acc} onChange={e => setForm(f => ({ ...f, acc: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Note</Label>
            <Input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="bg-background border-border" />
          </div>
          <Button type="submit" className="w-full">{transaction ? "Update" : "Add"} Transaction</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
