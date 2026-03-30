import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserBranch } from "@/hooks/useUserBranch";
import {
  Network, Wrench, Settings, LogOut, BarChart3, Mail,
  Sparkles, Zap, Calendar, PanelLeftClose, PanelLeft, Lock, Brain,
  MoreHorizontal, Target, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConnectNavConfig, ALL_CONNECT_TABS } from "@/hooks/useConnectNavConfig";
import { SageFloatingChat } from "@/components/SageFloatingChat";
import { ConnectRewards } from "@/components/ConnectRewards";

const CONNECT_NAV = [
  { to: "/connect", label: "Connect", icon: Network, exact: true },
  { to: "/connect/intelligence", label: "Intelligence", icon: Brain },
  { to: "/connect/pipeline", label: "Pipeline", icon: BarChart3 },
  { to: "/connect/email", label: "Email", icon: Mail },
  { to: "/connect/calendar", label: "Calendar", icon: Calendar },
  { to: "/connect/create", label: "Create", icon: Sparkles },
  { to: "/connect/leads", label: "Leads", icon: Target },
  { to: "/connect/sage", label: "Sage", icon: Zap },
];

const ICON_MAP: Record<string, any> = {
  connect: Network,
  intelligence: Brain,
  pipeline: BarChart3,
  email: Mail,
  calendar: Calendar,
  create: Sparkles,
  leads: Target,
  sage: Zap,
};

function MobileConnectNav({ isActive }: { isActive: (to: string, exact?: boolean) => boolean }) {
  const { config } = useConnectNavConfig();
  const [moreOpen, setMoreOpen] = useState(false);

  const visibleTabs = config.visibleTabIds
    .map(id => ALL_CONNECT_TABS.find(t => t.id === id))
    .filter(Boolean) as typeof ALL_CONNECT_TABS;

  const hiddenTabs = ALL_CONNECT_TABS.filter(t => !config.visibleTabIds.includes(t.id));
  const moreActive = hiddenTabs.some(t => isActive(t.to, t.id === "connect")) || moreOpen;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch justify-around border-t border-sidebar-border bg-sidebar/95 backdrop-blur-md safe-area-bottom">
        {visibleTabs.map(tab => {
          const Icon = ICON_MAP[tab.id] || Network;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[48px] min-h-[52px] transition-colors ${
                isActive(tab.to, tab.id === "connect") ? "text-sidebar-foreground" : "text-sidebar-foreground/30"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
        {hiddenTabs.length > 0 && (
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[48px] min-h-[52px] transition-colors ${
              moreActive ? "text-sidebar-foreground" : "text-sidebar-foreground/30"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        )}
      </nav>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 bg-sidebar border-sidebar-border text-sidebar-foreground">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left text-base text-sidebar-foreground">More</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {hiddenTabs.map(tab => {
              const Icon = ICON_MAP[tab.id] || Network;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                    isActive(tab.to, tab.id === "connect")
                      ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </Link>
              );
            })}
            <div className="border-t border-sidebar-border my-2" />
            <Link
              to="/app/settings"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ProductLayout({
  children,
  onStudioClick,
  studioUnlocked = false,
}: {
  children: React.ReactNode;
  onStudioClick?: () => void;
  studioUnlocked?: boolean;
}) {
  const { signOut } = useAuth();
  const { branch } = useUserBranch();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  // Apply branch theme class to <html> (mirrors AppLayout behavior)
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("theme-risk", "theme-property", "theme-wealth");
    if (branch) html.classList.add(`theme-${branch}`);
    return () => { html.classList.remove("theme-risk", "theme-property", "theme-wealth"); };
  }, [branch]);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(collapsed));
  }, [collapsed]);

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return location.pathname === to;
    return location.pathname.startsWith(to);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200 ${
          collapsed ? "w-[52px]" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2 py-4 border-b border-sidebar-border ${collapsed ? "px-3 justify-center" : "px-5"}`}>
          <svg width={collapsed ? 24 : 28} height={collapsed ? 24 : 28} viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
            <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
            <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
          </svg>
          {!collapsed && (
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight">AURA</span>
              <span className="text-[10px] text-sidebar-foreground/40 tracking-widest uppercase">Connect</span>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className={`flex-1 py-4 space-y-1 ${collapsed ? "px-1" : "px-3"}`}>
          {CONNECT_NAV.map((item) => {
            const active = isActive(item.to, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg text-sm transition-colors ${
                  collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
                } ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                    : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && item.label}
              </Link>
            );
          })}

          {/* Studio add-on */}
          <button
            onClick={studioUnlocked ? undefined : onStudioClick}
            title={collapsed ? "AURA Studio" : undefined}
            className={`w-full flex items-center gap-3 rounded-lg text-sm transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            } ${
              studioUnlocked
                ? "text-orange-400/80 hover:text-orange-300 hover:bg-sidebar-accent/50"
                : "text-sidebar-foreground/20 hover:text-sidebar-foreground/40 hover:bg-sidebar-accent/50"
            }`}
          >
            {studioUnlocked ? (
              <Wrench className="h-4 w-4 shrink-0" />
            ) : (
              <Lock className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && (
              <span className="flex items-center gap-2">
                Studio
                {!studioUnlocked && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    Add-on
                  </span>
                )}
              </span>
            )}
          </button>
        </nav>

        {/* Bottom */}
        <div className={`border-t border-sidebar-border py-3 space-y-2 ${collapsed ? "px-1" : "px-3"}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground/30 hover:text-sidebar-foreground/60 hover:bg-sidebar-accent/50 transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            }`}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            {!collapsed && (collapsed ? "Expand" : "Collapse")}
          </button>

          {collapsed ? (
            <Link
              to="/app/settings#network-connections-section"
              title="Rewards"
              className="flex items-center justify-center rounded-lg py-2.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50 transition-colors"
            >
              <Gift className="h-4 w-4" />
            </Link>
          ) : (
            <Link to="/app/settings#network-connections-section" className="block">
              <ConnectRewards variant="compact" />
            </Link>
          )}

          <Link
            to="/app/settings"
            className={`flex items-center gap-3 rounded-lg text-sm transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            } ${
              location.pathname === "/app/settings"
                ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && "Settings"}
          </Link>
          <button
            onClick={signOut}
            className={`w-full flex items-center gap-3 rounded-lg text-sm text-sidebar-foreground/30 hover:text-red-400 hover:bg-sidebar-accent/50 transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Sign Out"}
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar">
          <div className="flex items-center gap-2">
            <svg width={24} height={24} viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
              <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
              <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
            </svg>
            <span className="text-lg font-bold tracking-tight">AURA</span>
          </div>
          <Link to="/app/settings">
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/40 hover:text-sidebar-foreground">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <MobileConnectNav isActive={isActive} />
      </div>

      {/* Sage floating chat */}
      <SageFloatingChat />
    </div>
  );
}
