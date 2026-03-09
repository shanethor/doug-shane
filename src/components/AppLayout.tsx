import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { LogOut, ShieldCheck, MessageCircle, HelpCircle, GitBranch, Settings, Mail, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTrainingMode } from "@/hooks/useTrainingMode";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NavScoreboard } from "@/components/NavScoreboard";

export function AppLayout({ children, onLogoClick }: { children: React.ReactNode; onLogoClick?: () => void }) {
  const { signOut } = useAuth();
  const { canSeeProducerHub, canSeeAdmin } = useUserRole();
  const location = useLocation();
  const { trainingMode, setTrainingMode } = useTrainingMode();
  const { emailCount, pulseCount } = useUnreadCount();

  const navItems = [
    { to: "/", label: "AURA", icon: MessageCircle },
    { to: "/email", label: "Email", icon: Mail },
    { to: "/pulse", label: "Pulse", icon: HeartPulse },
    ...(canSeeProducerHub ? [{ to: "/hub", label: "Command Center", icon: GitBranch }] : []),
    ...(canSeeAdmin ? [{ to: "/admin", label: "Admin", icon: ShieldCheck }] : []),
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen aura-subtle-mesh animate-page-fade">
      <header className="border-b aura-glass sticky top-0 z-40">
        <div className="mx-auto flex h-14 md:h-14 max-w-6xl items-center justify-between px-4">
          {onLogoClick ? (
            <button onClick={onLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-base md:text-lg font-bold tracking-tight">AURA</span>
              <span className="text-[9px] md:text-[11px] text-muted-foreground tracking-widest uppercase">Risk Group</span>
            </button>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <span className="text-base md:text-lg font-bold tracking-tight">AURA</span>
              <span className="text-[9px] md:text-[11px] text-muted-foreground tracking-widest uppercase">Risk Group</span>
            </Link>
          )}

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to}>
                <Button
                  variant={location.pathname === item.to ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 text-xs relative ${location.pathname === item.to ? "aura-glow-shadow" : ""}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                  {item.to === "/email" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
            <div className="ml-2 h-4 w-px bg-border" />

            {/* Help toggle */}
            <div className="flex items-center gap-1.5 ml-1 px-2 py-1 rounded-md hover:bg-muted/60 transition-colors cursor-default">
              <HelpCircle className={`h-3.5 w-3.5 transition-colors ${trainingMode ? "text-accent" : "text-muted-foreground"}`} />
              <span className={`text-[11px] font-medium transition-colors ${trainingMode ? "text-foreground" : "text-muted-foreground"}`}>
                Help
              </span>
              <Switch
                checked={trainingMode}
                onCheckedChange={setTrainingMode}
                className="scale-75 origin-right"
              />
            </div>

            <div className="ml-1 h-4 w-px bg-border" />
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 text-xs text-muted-foreground">
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </nav>
        </div>
      </header>

      <NavScoreboard />

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />
    </div>
  );
}
