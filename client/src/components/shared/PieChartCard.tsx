/**
 * PieChartCard — reusable compact donut chart with integrated legend.
 *
 * Layout: [40% donut] [60% legend]
 * Legend rows: ● Name  $value  (name + value on same line, close together)
 * Colors: assigned by caller via `color` field — legend color === slice color guaranteed.
 */

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export type PieSlice = {
  name: string;
  /** Absolute (positive) value used for slice sizing */
  value: number;
  /** Raw signed total for display color (negative = expense, positive = income) */
  rawTotal: number;
  color: string;
};

type Props = {
  title: string;
  data: PieSlice[];
  /** Currency formatter, e.g. (n) => "$1,234.56" */
  fmt: (n: number) => string;
};

export function PieChartCard({ title, data, fmt }: Props) {
  if (data.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      {/* Card title */}
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        {title}
      </div>

      {/* Body: chart (40%) + legend (60%) */}
      <div className="flex items-start gap-3">
        {/* ── Donut ── 40% */}
        <div className="flex-shrink-0" style={{ width: "40%", maxWidth: 180 }}>
          <ResponsiveContainer width="100%" aspect={1}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="82%"
                paddingAngle={2}
                strokeWidth={2}
                stroke="hsl(var(--card))"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number, _name: string, props: { payload?: PieSlice }) => [
                  fmt(Math.abs(val)),
                  props.payload?.name ?? "",
                ]}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "#ffffff",
                  padding: "6px 10px",
                }}
                labelStyle={{ display: "none" }}
                itemStyle={{ color: "#ffffff" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ── Legend ── 60% */}
        <div
          className="flex-1 min-w-0 overflow-y-auto"
          style={{ maxHeight: 180 }}
        >
          {data.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 py-0.5"
            >
              {/* Colored dot — same color as slice */}
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: entry.color }}
              />
              {/* Name */}
              <span
                className="text-[11px] font-medium text-white truncate"
                style={{ maxWidth: "55%" }}
              >
                {entry.name}
              </span>
              {/* Value — immediately after name, no spacer */}
              <span
                className={`text-[11px] font-semibold ml-1.5 flex-shrink-0 ${
                  entry.rawTotal < 0 ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {fmt(entry.rawTotal)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
