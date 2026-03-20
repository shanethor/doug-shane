import { Link, useLocation } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserFeatures } from "@/hooks/useUserFeatures";
import { useUserBranch } from "@/hooks/useUserBranch";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { useNavConfig, ALL_NAV_TABS } from "@/hooks/useNavConfig";
import {
  Mail,
  GitBranch,
  MoreHorizontal,
  MessageCircle,
  ShieldCheck,
  Settings,
  HelpCircle,
  LogOut,
  HeartPulse,
  Network,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useTrainingMode } from "@/hooks/useTrainingMode";
import { Switch } from "@/components/ui/switch";

const ICON_MAP: Record<string, any> = {
  aura: MessageCircle,
  email: Mail,
  pulse: HeartPulse,
  hub: GitBranch,
};

export function MobileBottomNav() {
  const location = useLocation();
  const { canSeeProducerHub, canSeeAdmin, canSeeChat, canSeeEmail, canSeePulse } = useUserRole();
  const { hasConnect } = useUserFeatures();
  const { branch } = useUserBranch();
  const { signOut } = useAuth();
  const { trainingMode, setTrainingMode } = useTrainingMode();
  const { emailCount, pulseCount } = useUnreadCount();
  const { config } = useNavConfig();
  const [moreOpen, setMoreOpen] = useState(false);

  const isBranchRestricted = branch === "property" || branch === "wealth";

  // Filter tabs based on role and branch
  const allowedTabs = isBranchRestricted ? [] : ALL_NAV_TABS.filter((t) => {
    if (t.id === "hub" && !canSeeProducerHub) return false;
    if (t.id === "aura" && !canSeeChat) return false;
    if (t.id === "email" && !canSeeEmail) return false;
    if (t.id === "pulse" && !canSeePulse) return false;
    return true;
  });

  const visibleTabs = config.selectedTabIds
    .slice(0, config.tabCount)
    .map((id) => allowedTabs.find((t) => t.id === id))
    .filter(Boolean) as typeof ALL_NAV_TABS;

  const hiddenTabIds = new Set(allowedTabs.map((t) => t.id));
  visibleTabs.forEach((t) => hiddenTabIds.delete(t.id));
  const hiddenTabs = allowedTabs.filter((t) => hiddenTabIds.has(t.id));

  const isActive = (to: string) => location.pathname === to;
  const moreRoutes = ["/admin", "/settings", ...hiddenTabs.map((t) => t.to)];
  const moreActive = moreRoutes.some((p) => location.pathname === p);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-md md:hidden safe-area-bottom">
        <div className="flex items-stretch justify-around">
          {visibleTabs.map((tab) => {
            const Icon = ICON_MAP[tab.id] || MessageCircle;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[56px] min-h-[52px] transition-colors ${
                  isActive(tab.to)
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight">
                  {tab.label}
                </span>
                {tab.id === "email" && emailCount > 0 && (
                  <span className="absolute top-1 right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {emailCount > 99 ? "99+" : emailCount}
                  </span>
                )}
                {tab.id === "pulse" && pulseCount > 0 && (
                  <span className="absolute top-1 right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
                    {pulseCount > 99 ? "99+" : pulseCount}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[56px] min-h-[52px] transition-colors ${
              moreActive
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left text-base">More</SheetTitle>
          </SheetHeader>
          <div className="space-y-1">
            {hiddenTabs.map((tab) => {
              const Icon = ICON_MAP[tab.id] || MessageCircle;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={() => setMoreOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                    isActive(tab.to)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {tab.label}
                </Link>
              );
            })}

            {hasConnect && (
              <Link
                to="/connect"
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                  isActive("/connect")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Network className="h-5 w-5" />
                Connect
              </Link>
            )}

            {(hiddenTabs.length > 0 || hasConnect) && <div className="border-t my-2" />}

            {canSeeAdmin && (
              <Link
                to="/admin"
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                  isActive("/admin")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
                Admin
              </Link>
            )}
            <Link
              to="/settings"
              onClick={() => setMoreOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                isActive("/settings")
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              <Settings className="h-5 w-5" />
              Settings
            </Link>

            <div className="border-t my-2" />

            <div className="flex items-center justify-between px-3 py-3">
              <div className="flex items-center gap-3">
                <HelpCircle
                  className={`h-5 w-5 ${
                    trainingMode ? "text-accent" : "text-muted-foreground"
                  }`}
                />
                <span className="text-sm">Help</span>
              </div>
              <Switch
                checked={trainingMode}
                onCheckedChange={setTrainingMode}
              />
            </div>

            <div className="border-t my-2" />

            <button
              onClick={() => {
                setMoreOpen(false);
                signOut();
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors w-full"
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
