import { useState } from "react";
import {
  Home, ArrowLeftRight, Wallet, Tag, FileBarChart,
  LogOut, MessageCircle, X, Users, Crown, ShieldCheck, Eye, KeyRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import DashboardPage from "@/pages/Dashboard";
import TransactionsPage from "@/pages/Transactions";
import AccountsPage from "@/pages/Accounts";
import CategoriesPage from "@/pages/Categories";
import ReportsPage from "@/pages/Reports";
import TeamSettings from "@/pages/TeamSettings";
import ChatPanel from "@/components/chat/ChatPanel";
import { Badge } from "@/components/ui/badge";

// ─── Role badge ───────────────────────────────────────────────────────────────
const ROLE_ICON: Record<UserRole, React.ElementType> = {
  owner: Crown,
  admin: ShieldCheck,
  member: Eye,
};
const ROLE_COLOR: Record<UserRole, string> = {
  owner: "text-amber-500",
  admin: "text-blue-500",
  member: "text-emerald-500",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const BASE_TABS = [
  { id: "dashboard", label: "Home", Icon: Home },
  { id: "transactions", label: "Transactions", Icon: ArrowLeftRight },
  { id: "accounts", label: "Accounts", Icon: Wallet },
  { id: "categories", label: "Categories", Icon: Tag },
  { id: "reports", label: "Reports", Icon: FileBarChart },
] as const;

const TEAM_TAB = { id: "team", label: "Team", Icon: Users } as const;

type BaseTabId = typeof BASE_TABS[number]["id"];
type TabId = BaseTabId | "team";

export default function AppShell() {
  const [active, setActive] = useState<TabId>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, profile, role, isOwner, isAdmin, canWrite, canDelete, signOut } = useAuth();
  const { loading } = useApp();
  const navigate = useNavigate();

  const initials = (profile?.name ?? user?.email ?? "??").substring(0, 2).toUpperCase();

  // Tabs visible to this user
  const visibleTabs: Array<{ id: TabId; label: string; Icon: React.ElementType }> = [
    ...BASE_TABS,
    // Team Settings visible to owner and admin
    ...(isOwner || isAdmin ? [TEAM_TAB] : []),
  ];

  const pageMap: Record<TabId, React.ReactNode> = {
    dashboard: <DashboardPage />,
    transactions: <TransactionsPage />,
    accounts: <AccountsPage />,
    categories: <CategoriesPage />,
    reports: <ReportsPage />,
    team: <TeamSettings />,
  };

  // No full-page loading gate — data loads in background, pages handle their own empty states

  const RoleIcon = role ? ROLE_ICON[role] : Eye;
  const roleColor = role ? ROLE_COLOR[role] : "text-muted-foreground";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <aside
          className="w-64 border-r border-border bg-sidebar flex flex-col fixed h-full z-50"
          role="complementary"
          aria-label="Sidebar navigation"
        >
          <div className="p-6 border-b border-border">
            <h1 className="text-xl font-black text-foreground tracking-tight">
              Airfoil <span className="text-primary">FinOps</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Shared Finance Hub</p>
          </div>

          <nav className="flex-1 p-3 space-y-1" aria-label="Main navigation">
            {visibleTabs.map(({ id, label, Icon }) => (
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

          {/* AI Assistant + User Profile — bottom of sidebar */}
          {/* AI Assistant button — directly above user profile */}
          <div className="px-3 pt-2">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                chatOpen
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <MessageCircle size={18} strokeWidth={chatOpen ? 2.5 : 1.8} />
              AI Assistant
            </button>
          </div>

          {/* User info with role badge */}
          <div className="p-4 border-t border-border mt-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-foreground truncate">
                  {profile?.name ?? user?.email}
                </div>
                {role && (
                  <div className={`flex items-center gap-1 text-[10px] font-medium mt-0.5 ${roleColor}`}>
                    <RoleIcon size={10} />
                    <span className="capitalize">{role}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate("/account-settings")}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Account settings / Change password"
                >
                  <KeyRound size={14} />
                </button>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 ${!isMobile ? "ml-64" : ""} ${isMobile ? "pb-20" : ""} ${
          chatOpen && !isMobile ? "mr-[360px]" : ""
        } overflow-y-auto min-h-screen transition-all`}
        role="main"
      >
        {isMobile && (
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-[10px] font-bold text-primary">{initials}</span>
              </div>
              {role && (
                <span className={`text-[10px] font-medium capitalize ${roleColor}`}>{role}</span>
              )}
              <button
                onClick={() => navigate("/account-settings")}
                className="text-xs text-muted-foreground hover:text-foreground"
                title="Account settings / Change password"
              >
                <KeyRound size={14} />
              </button>
              <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground" title="Sign out">
                <LogOut size={14} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  chatOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Role restriction banner for members */}
        {role === "member" && (
          <div className="mx-4 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
            <Eye className="w-3.5 h-3.5 shrink-0" />
            You have read-only access. Contact your team owner to request write permissions.
          </div>
        )}

        {pageMap[active]}
      </main>

      {/* Chat Panel */}
      {chatOpen && (
        <div
          className={`fixed top-0 right-0 h-full bg-card border-l border-border z-50 flex flex-col ${
            isMobile ? "w-full" : "w-[360px]"
          }`}
        >
          <button
            onClick={() => setChatOpen(false)}
            className="absolute top-3 right-3 p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground z-10"
          >
            <X size={16} />
          </button>
          <ChatPanel />
        </div>
      )}

      {/* Mobile Bottom Nav */}
      {isMobile && !chatOpen && (
        <nav
          className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex px-2 pb-4 pt-2 gap-1 backdrop-blur-xl z-50"
          aria-label="Mobile navigation"
        >
          {visibleTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl transition-all ${
                active === id ? "bg-primary/10" : ""
              }`}
            >
              <Icon
                size={20}
                className={active === id ? "text-primary" : "text-muted-foreground"}
                strokeWidth={active === id ? 2.5 : 1.8}
              />
              <span
                className={`text-[10px] font-medium ${
                  active === id ? "text-primary font-bold" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
