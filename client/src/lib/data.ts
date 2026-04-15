export const dailyTrend = Array.from({ length: 31 }, (_, i) => ({
  day: i + 1,
  expenses: Math.round(50 + Math.random() * 200 + (i % 7 === 0 ? 150 : 0)),
  income: Math.round(i === 1 || i === 15 ? 5200 : (Math.random() > 0.9 ? 300 + Math.random() * 800 : 0)),
}));

export const monthlyFlow = [
  { m: "Oct", i: 5100, e: 3200 },
  { m: "Nov", i: 6200, e: 3800 },
  { m: "Dec", i: 7400, e: 4900 },
  { m: "Jan", i: 5800, e: 3100 },
  { m: "Feb", i: 6890, e: 3210 },
  { m: "Mar", i: 6740, e: 3890 },
];

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  MYR: 4.47,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  MYR: "RM",
};
