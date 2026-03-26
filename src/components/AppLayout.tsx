import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserFeatures } from "@/hooks/useUserFeatures";
import { useUserBranch } from "@/hooks/useUserBranch";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useLossRunReminders } from "@/hooks/useLossRunReminders";
import { LogOut, ShieldCheck, MessageCircle, HelpCircle, GitBranch, Settings, Mail, HeartPulse, FileSearch, Network, UserPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTrainingMode } from "@/hooks/useTrainingMode";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { NavScoreboard } from "@/components/NavScoreboard";
import { AILogPanel } from "@/components/AILogPanel";
import { SageFloatingChat } from "@/components/SageFloatingChat";
import { useEffect } from "react";

export function AppLayout({ children, onLogoClick }: { children: React.ReactNode; onLogoClick?: () => void }) {
  const { signOut } = useAuth();
  const { canSeeProducerHub, canSeeAdmin, canSeeChat, canSeeEmail, canSeePulse, canSeeLossRuns, canSeeClientSubmission } = useUserRole();
  const { hasConnect, hasConcierge } = useUserFeatures();
  const { branch } = useUserBranch();
  const location = useLocation();
  const { trainingMode, setTrainingMode } = useTrainingMode();
  const { emailCount, pulseCount } = useUnreadCount();
  const { count: lossRunReminderCount } = useLossRunReminders();

  // Apply branch theme class to <html>
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("theme-risk", "theme-property", "theme-wealth");
    if (branch) html.classList.add(`theme-${branch}`);
    return () => { html.classList.remove("theme-risk", "theme-property", "theme-wealth"); };
  }, [branch]);

  // For property/wealth branches, restrict nav to Connect + Settings + Admin only
  const isBranchRestricted = branch === "property" || branch === "wealth";

  const navItems = isBranchRestricted ? [
    ...(hasConnect ? [{ to: "/insurance/connect", label: "Connect", icon: Network, key: "connect" }] : []),
    ...(hasConcierge ? [{ to: "/insurance/concierge", label: "Concierge", icon: Sparkles, key: "concierge" }] : []),
    ...(canSeeAdmin ? [{ to: "/insurance/admin", label: "Admin", icon: ShieldCheck, key: "admin" }] : []),
    { to: "/insurance/settings", label: "Settings", icon: Settings, key: "settings" },
  ] : [
    ...(canSeeChat ? [{ to: "/insurance/hub", label: "AURA", icon: MessageCircle, key: "aura" }] : []),
    ...(canSeeEmail ? [{ to: "/insurance/email", label: "Email", icon: Mail, key: "email" }] : []),
    ...(canSeePulse ? [{ to: "/insurance/pulse", label: "Pulse", icon: HeartPulse, key: "pulse" }] : []),
    ...(canSeeProducerHub ? [{ to: "/insurance/command", label: "Command Center", icon: GitBranch, key: "command" }] : []),
    ...(canSeeLossRuns ? [{ to: "/insurance/loss-runs", label: "Loss Runs", icon: FileSearch, key: "lossruns" }] : []),
    ...(hasConnect ? [{ to: "/insurance/connect", label: "Connect", icon: Network, key: "connect" }] : []),
    ...(hasConcierge ? [{ to: "/insurance/concierge", label: "Concierge", icon: Sparkles, key: "concierge" }] : []),
    ...(canSeeClientSubmission ? [{ to: "/insurance/submit-client", label: "Submit Client", icon: UserPlus, key: "submit" }] : []),
    ...(canSeeAdmin ? [{ to: "/insurance/admin", label: "Admin", icon: ShieldCheck, key: "admin" }] : []),
    { to: "/insurance/settings", label: "Settings", icon: Settings, key: "settings" },
  ];

  return (
    <div className="h-screen flex flex-col aura-subtle-mesh animate-page-fade overflow-hidden">
      <header className="border-b aura-glass sticky top-0 z-40 shrink-0">
        <div className="mx-auto flex h-14 md:h-14 max-w-6xl items-center justify-between px-4">
          {onLogoClick ? (
            <button onClick={onLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-base md:text-lg font-bold tracking-tight">AURA</span>
              <span className="text-[9px] md:text-[11px] text-muted-foreground tracking-widest uppercase">Risk Group</span>
            </button>
          ) : (
            <Link to="/insurance/hub" className="flex items-center gap-2">
              <span className="text-base md:text-lg font-bold tracking-tight">AURA</span>
              <span className="text-[9px] md:text-[11px] text-muted-foreground tracking-widest uppercase">Risk Group</span>
            </Link>
          )}

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.key} to={item.to}>
                <Button
                  variant={location.pathname === item.to ? "secondary" : "ghost"}
                  size="sm"
                  className={`gap-2 text-xs relative ${location.pathname === item.to ? "aura-glow-shadow" : ""}`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                  {item.to === "/insurance/email" && emailCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {emailCount > 99 ? "99+" : emailCount}
                    </span>
                  )}
                  {item.to === "/insurance/pulse" && pulseCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                      {pulseCount > 99 ? "99+" : pulseCount}
                    </span>
                  )}
                  {item.to === "/insurance/loss-runs" && lossRunReminderCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive" />
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

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8 pb-24 md:pb-8">
          {children}
          
          {/* Legal links at bottom of content */}
          <div className="mt-8 pt-6 border-t flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <span className="text-border">|</span>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />
      <AILogPanel />
    </div>
  );
}
