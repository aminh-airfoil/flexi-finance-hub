import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function StatBadge({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-2 py-0.5 rounded-full ${
      up ? "bg-success-dim text-success" : "bg-destructive-dim text-destructive"
    }`}>
      {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}
