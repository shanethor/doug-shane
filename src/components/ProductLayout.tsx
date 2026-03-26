import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Network, Wrench, Settings, LogOut, LayoutDashboard, BarChart3, Mail, Users, Sparkles, Zap, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const CONNECT_NAV = [
  { to: "/connect", label: "Dashboard", icon: LayoutDashboard },
  { to: "/connect/pipeline", label: "Pipeline", icon: BarChart3 },
  { to: "/connect/email", label: "Email", icon: Mail },
  { to: "/connect/calendar", label: "Calendar", icon: Calendar },
  { to: "/connect/network", label: "Network", icon: Users },
  { to: "/connect/create", label: "Create", icon: Sparkles },
  { to: "/connect/sage", label: "Sage", icon: Zap },
];

const STUDIO_NAV = [
  { to: "/studio", label: "Dashboard", icon: LayoutDashboard },
  { to: "/studio/requests", label: "Build Requests", icon: Wrench },
];

export function ProductLayout({ children, product = "connect" }: { children: React.ReactNode; product?: "connect" | "studio" }) {
  const { signOut } = useAuth();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const nav = product === "studio" ? STUDIO_NAV : CONNECT_NAV;
  const title = product === "studio" ? "Studio" : "Connect";
  const accent = product === "studio" ? "hsl(25, 90%, 55%)" : "hsl(140, 12%, 50%)";

  const isActive = (to: string) => {
    if (to === "/connect" || to === "/studio") return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="flex h-screen bg-[#08080A] text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-white/5 bg-[#0c0c0e]">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
          <span className="text-lg font-bold tracking-tight">AURA</span>
          <span className="text-xs text-white/40 tracking-widest uppercase">{title}</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive(item.to)
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-white/5 px-3 py-3 space-y-1">
          {/* Switch product */}
          <Link
            to={product === "connect" ? "/studio" : "/connect"}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          >
            {product === "connect" ? <Wrench className="h-4 w-4" /> : <Network className="h-4 w-4" />}
            {product === "connect" ? "Aura Studio" : "AuRa Connect"}
          </Link>
          <Link
            to="/app/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              location.pathname === "/app/settings"
                ? "bg-white/10 text-white font-medium"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#0c0c0e]">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">AURA</span>
            <span className="text-xs text-white/40 tracking-widest uppercase">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/app/settings">
              <Button variant="ghost" size="icon" className="text-white/40 hover:text-white">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex items-stretch justify-around border-t border-white/5 bg-[#0c0c0e] safe-area-bottom">
          {nav.slice(0, 5).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[56px] min-h-[52px] transition-colors ${
                isActive(item.to) ? "text-white" : "text-white/30"
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
