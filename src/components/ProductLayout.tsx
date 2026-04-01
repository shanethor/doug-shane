import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserBranch } from "@/hooks/useUserBranch";
import { useEarlyAccessWhitelist } from "@/hooks/useEarlyAccessWhitelist";
import {
  Network, Wrench, Settings, LogOut, BarChart3, Mail,
  Sparkles, Zap, Calendar, PanelLeftClose, PanelLeft, Lock, Brain,
  MoreHorizontal, Target, Gift, Home, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useConnectNavConfig, ALL_CONNECT_TABS } from "@/hooks/useConnectNavConfig";
import { SageFloatingChat } from "@/components/SageFloatingChat";


const CONNECT_NAV = [
  { to: "/connect", label: "Connect", icon: Network, exact: true, premium: false },
  { to: "/connect/intelligence", label: "Intelligence", icon: Brain, premium: false },
  { to: "/connect/pipeline", label: "Pipeline", icon: BarChart3, premium: false },
  { to: "/connect/email", label: "Email", icon: Mail, premium: false },
  { to: "/connect/calendar", label: "Calendar", icon: Calendar, premium: false },
  { to: "/connect/create", label: "Create", icon: Sparkles, premium: false },
  { to: "/connect/leads", label: "Leads", icon: Target, premium: false },
  { to: "/connect/property", label: "Property", icon: Home, premium: true },
  { to: "/connect/sage", label: "Sage", icon: Zap, premium: false },
];

const ICON_MAP: Record<string, any> = {
  connect: Network,
  intelligence: Brain,
  pipeline: BarChart3,
  email: Mail,
  calendar: Calendar,
  create: Sparkles,
  leads: Target,
  property: Home,
  sage: Zap,
};

function MobileConnectNav({ isActive, signOut }: { isActive: (to: string, exact?: boolean) => boolean; signOut: () => void }) {
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
              to="/connect/rewards"
              onClick={() => setMoreOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                isActive("/connect/rewards")
                  ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
              }`}
            >
              <Gift className="h-5 w-5" />
              Rewards
            </Link>
            <Link
              to="/app/settings"
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/50"
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>
            <div className="border-t border-sidebar-border my-2" />
            <button
              onClick={() => { setMoreOpen(false); signOut(); }}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
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
  const { isPageGated } = useEarlyAccessWhitelist();
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
             const pageKey = item.to === "/connect" ? "connect" : item.to.replace("/connect/", "");
             const gated = isPageGated(pageKey);
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
                     : gated
                       ? "text-sidebar-foreground/20 hover:text-sidebar-foreground/30 hover:bg-sidebar-accent/30"
                       : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                 }`}
               >
                 {gated ? <Lock className="h-4 w-4 shrink-0 opacity-40" /> : <item.icon className="h-4 w-4 shrink-0" />}
                  {!collapsed && (
                    <span className="flex items-center gap-2">
                      {item.label}
                      {gated && <span className="text-[8px] px-1 py-0.5 rounded bg-muted text-muted-foreground">Soon</span>}
                      {!gated && (item as any).premium && <Crown className="h-3 w-3 text-amber-400" />}
                    </span>
                  )}
               </Link>
             );
           })}

           {/* Studio add-on — hidden from nav, dripped via qualification popups */}
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

          <Link
            to="/connect/rewards"
            title={collapsed ? "Rewards" : undefined}
            className={`flex items-center gap-3 rounded-lg text-sm transition-colors ${
              collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
            } ${
              location.pathname === "/connect/rewards"
                ? "bg-sidebar-accent text-sidebar-foreground font-medium"
                : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
            }`}
          >
            <Gift className="h-4 w-4 shrink-0" />
            {!collapsed && "Rewards"}
          </Link>

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
        <MobileConnectNav isActive={isActive} signOut={signOut} />
      </div>

      {/* Sage floating chat */}
      <SageFloatingChat />
    </div>
  );
}
