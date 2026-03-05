import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApp } from "@/contexts/AppContext";
import { Category } from "@/lib/types";
import { Utensils, ShoppingCart, Car, Zap, Heart, Monitor, Plane, Coffee } from "lucide-react";

const ICON_OPTIONS = [
  { icon: Utensils, name: "Utensils" },
  { icon: ShoppingCart, name: "ShoppingCart" },
  { icon: Car, name: "Car" },
  { icon: Zap, name: "Zap" },
  { icon: Heart, name: "Heart" },
  { icon: Monitor, name: "Monitor" },
  { icon: Plane, name: "Plane" },
  { icon: Coffee, name: "Coffee" },
];

const COLOR_OPTIONS = ["#F59E0B", "#8B5CF6", "#0EA5E9", "#10B981", "#F43F5E", "#EC4899", "#14B8A6", "#D97706"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
}

export function CategoryDialog({ open, onOpenChange, category }: Props) {
  const { addCategory, updateCategory } = useApp();
  const [form, setForm] = useState({ name: "", budget: "", iconIdx: 0, colorIdx: 0 });

  useEffect(() => {
    if (category) {
      const iconIdx = ICON_OPTIONS.findIndex(o => o.icon === category.icon);
      const colorIdx = COLOR_OPTIONS.indexOf(category.color);
      setForm({ name: category.name, budget: String(category.budget), iconIdx: iconIdx >= 0 ? iconIdx : 0, colorIdx: colorIdx >= 0 ? colorIdx : 0 });
    } else {
      setForm({ name: "", budget: "", iconIdx: 0, colorIdx: 0 });
    }
  }, [category, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: form.name,
      budget: parseFloat(form.budget),
      icon: ICON_OPTIONS[form.iconIdx].icon,
      color: COLOR_OPTIONS[form.colorIdx],
    };
    if (category) {
      updateCategory({ ...data, id: category.id });
    } else {
      addCategory(data);
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
