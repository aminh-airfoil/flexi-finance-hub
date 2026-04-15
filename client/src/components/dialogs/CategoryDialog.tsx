import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import { Category } from "@/lib/types";
import { ICON_OPTIONS } from "@/lib/icons";

const COLOR_OPTIONS = ["#F59E0B", "#8B5CF6", "#0EA5E9", "#10B981", "#F43F5E", "#EC4899", "#14B8A6", "#D97706"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

export function CategoryDialog({ open, onOpenChange, category }: Props) {
  const { addCategory, updateCategory, categories } = useApp();
  const [form, setForm] = useState({ name: "", budget: "", iconIdx: 0, colorIdx: 0, parentId: "" });

  const mainCategories = useMemo(() => categories.filter(c => !c.parentId), [categories]);

  useEffect(() => {
    if (category) {
      const iconIdx = ICON_OPTIONS.findIndex(o => o.name === category.iconName);
      const colorIdx = COLOR_OPTIONS.indexOf(category.color);
      setForm({
        name: category.name,
        budget: String(category.budget),
        iconIdx: iconIdx >= 0 ? iconIdx : 0,
        colorIdx: colorIdx >= 0 ? colorIdx : 0,
        parentId: category.parentId || "",
      });
    } else {
      setForm({ name: "", budget: "", iconIdx: 0, colorIdx: 0, parentId: "" });
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      budget: parseFloat(form.budget),
      icon: ICON_OPTIONS[form.iconIdx].icon,
      iconName: ICON_OPTIONS[form.iconIdx].name,
      color: COLOR_OPTIONS[form.colorIdx],
      parentId: form.parentId || null,
    };
    if (category) {
      await updateCategory({ ...data, id: category.id });
    } else {
      await addCategory(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>{category ? "Edit" : "Add"} Category</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="bg-background border-border" />
          </div>
          <div>
            <Label>Parent category</Label>
            <select
              value={form.parentId}
              onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground mt-1"
            >
              <option value="">None (main category)</option>
              {mainCategories
                .filter(c => !category || c.id !== category.id)
                .map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Monthly Budget</Label>
            <Input type="number" step="0.01" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} required className="bg-background border-border" />
          </div>
          <div>
            <Label>Icon</Label>
            <div className="flex gap-2 mt-1">
              {ICON_OPTIONS.map((opt, i) => {
                const I = opt.icon;
                return (
                  <button key={i} type="button" onClick={() => setForm(f => ({ ...f, iconIdx: i }))}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${form.iconIdx === i ? "border-primary bg-primary/20" : "border-border bg-background"}`}>
                    <I size={16} className={form.iconIdx === i ? "text-primary" : "text-muted-foreground"} />
                  </button>
                );
              })}
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
          <Button type="submit" className="w-full">{category ? "Update" : "Add"} Category</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
