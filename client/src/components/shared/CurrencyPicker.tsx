import { useApp } from "@/contexts/AppContext";
import { Currency } from "@/lib/types";

const currencies: { value: Currency; label: string }[] = [
  { value: "USD", label: "🇺🇸 USD" },
  { value: "MYR", label: "🇲🇾 MYR" },
];

export function CurrencyPicker() {
  const { currency, setCurrency } = useApp();

  return (
    <div className="flex bg-card rounded-lg border border-border p-0.5">
      {currencies.map((c) => (
        <button
          key={c.value}
          onClick={() => setCurrency(c.value)}
          className={`flex-1 text-xs font-semibold py-1.5 px-3 rounded-md transition-all ${
            currency === c.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
