import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import { Account } from "@/lib/types";

const COLOR_OPTIONS = ["#0EA5E9", "#10B981", "#F43F5E", "#8B5CF6", "#F59E0B", "#EC4899"];
const TYPE_OPTIONS = ["Checking", "Savings", "Credit", "Invest"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account | null;
}

export function AccountDialog({ open, onOpenChange, account }: Props) {
  const { addAccount, updateAccount } = useApp();
  const [form, setForm] = useState({ name: "", bank: "", balance: "", type: "Checking", colorIdx: 0 });

  useEffect(() => {
    if (account) {
      const colorIdx = COLOR_OPTIONS.indexOf(account.color);
      setForm({ name: account.name, bank: account.bank, balance: String(account.balance), type: account.type, colorIdx: colorIdx >= 0 ? colorIdx : 0 });
    } else {
      setForm({ name: "", bank: "", balance: "", type: "Checking", colorIdx: 0 });
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: form.name, bank: form.bank, balance: parseFloat(form.balance), type: form.type, color: COLOR_OPTIONS[form.colorIdx] };
    if (account) {
      await updateAccount({ ...data, id: account.id });
    } else {
      await addAccount(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{account ? "Edit" : "Add"} Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Account Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="bg-background border-border" />
          </div>
          <div>
            <Label>Bank / Institution</Label>
            <Input value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))} required className="bg-background border-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Balance</Label>
              <Input type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} required className="bg-background border-border" />
            </div>
            <div>
              <Label>Type</Label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex gap-2 mt-1">
              {COLOR_OPTIONS.map((c, i) => (
                <button key={i} type="button" onClick={() => setForm(f => ({ ...f, colorIdx: i }))}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.colorIdx === i ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full">{account ? "Update" : "Add"} Account</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
