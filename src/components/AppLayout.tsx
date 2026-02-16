import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { LayoutDashboard, FilePlus, LogOut, ShieldCheck, MessageCircle, FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const location = useLocation();

  const navItems = [
    { to: "/", label: "Chat", icon: MessageCircle },
    { to: "/clients", label: "Clients", icon: LayoutDashboard },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card animate-page-fade">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-lg font-bold tracking-tight text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>AURA</span>
            <span className="text-[11px] text-muted-foreground font-sans hidden sm:inline">Risk Group</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={location.pathname === item.to ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2 text-xs"
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
