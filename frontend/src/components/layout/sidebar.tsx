import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  Sigma,
  ShieldAlert,
  FlaskConical,
  Bot,
  LogOut,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Market Overview", icon: LayoutDashboard, end: true },
  { to: "/stocks", label: "Stock Analysis", icon: TrendingUp },
  { to: "/portfolio", label: "Portfolio", icon: Briefcase },
  { to: "/derivatives", label: "Derivatives", icon: Sigma },
  { to: "/risk", label: "Risk Dashboard", icon: ShieldAlert },
  { to: "/backtester", label: "Backtester", icon: FlaskConical },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
];

export function Sidebar() {
  const { username, logout } = useAuth();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo size={24} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-ink-muted border border-transparent hover:bg-surface-hover hover:text-ink"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-2 w-2 shrink-0 rounded-full bg-primary shadow-glow-primary" />
            <span className="truncate text-sm font-mono text-ink-muted">{username}</span>
          </div>
          <button
            onClick={logout}
            className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
