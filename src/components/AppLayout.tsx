import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { LayoutDashboard, LogOut, ShieldCheck, MessageCircle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import auraLogo from "@/assets/aura-logo.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Chat", icon: MessageCircle },
    { to: "/clients", label: "Clients", icon: LayoutDashboard },
    { to: "/forms", label: "Forms", icon: FlaskConical },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen aura-subtle-mesh">
      <header className="border-b aura-glass animate-page-fade sticky top-0 z-40">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">AURA</span>
            <span className="text-[11px] text-muted-foreground tracking-widest uppercase">Risk Group</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={location.pathname === item.to ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 text-xs ${location.pathname === item.to ? "aura-glow-shadow" : ""}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Button>
              </Link>
            ))}
            <div className="ml-2 h-4 w-px bg-border" />
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-xs text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 animate-page-enter">
        {children}
      </main>
    </div>
  );
}
