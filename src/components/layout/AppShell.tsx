import { useState } from "react";
import { Home, ArrowLeftRight, Wallet, Tag } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { CurrencyPicker } from "@/components/shared/CurrencyPicker";
import DashboardPage from "@/pages/Dashboard";
import TransactionsPage from "@/pages/Transactions";
import AccountsPage from "@/pages/Accounts";
import CategoriesPage from "@/pages/Categories";

const TABS = [
  { id: "dashboard", label: "Home", Icon: Home },
  { id: "transactions", label: "Transactions", Icon: ArrowLeftRight },
  { id: "accounts", label: "Accounts", Icon: Wallet },
  { id: "categories", label: "Categories", Icon: Tag },
] as const;

type TabId = typeof TABS[number]["id"];

const pageMap: Record<TabId, React.ReactNode> = {
  dashboard: <DashboardPage />,
  transactions: <TransactionsPage />,
  accounts: <AccountsPage />,
  categories: <CategoriesPage />,
};

export default function AppShell() {
  const [active, setActive] = useState<TabId>("dashboard");
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside className="w-64 border-r border-border bg-sidebar flex flex-col fixed h-full z-50">
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-black text-foreground tracking-tight">FinTrack</h1>
            <p className="text-xs text-muted-foreground mt-1">Personal Finance</p>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                  active === id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon size={18} strokeWidth={active === id ? 2.5 : 1.8} />
                {label}
              </button>
            ))}
          </nav>
          <div className="p-4 border-t border-border">
            <CurrencyPicker />
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className={`flex-1 ${!isMobile ? "ml-64" : ""} ${isMobile ? "pb-20" : ""} overflow-y-auto min-h-screen`}>
        {isMobile && (
          <div className="flex items-center justify-between px-4 pt-4">
            <div />
            <CurrencyPicker />
          </div>
        )}
        {pageMap[active]}
      </main>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex px-2 pb-4 pt-2 gap-1 backdrop-blur-xl z-50">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                active === id ? "bg-primary/10" : ""
              }`}
            >
              <Icon size={20} className={active === id ? "text-primary" : "text-muted-foreground"} strokeWidth={active === id ? 2.5 : 1.8} />
              <span className={`text-[10px] font-medium ${active === id ? "text-primary font-bold" : "text-muted-foreground"}`}>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
