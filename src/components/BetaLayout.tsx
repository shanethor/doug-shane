import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { getCurrentBetaUser, clearBetaUser, type BetaUser } from "@/lib/beta-users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ListTodo, Mic, Video, ArrowLeftRight, FlaskConical } from "lucide-react";

const NAV_LINKS = [
  { to: "/beta/chat", label: "Chat", icon: MessageSquare },
  { to: "/beta/todos", label: "To‑dos", icon: ListTodo },
  { to: "/beta/voice", label: "Voice", icon: Mic },
  { to: "/beta/video", label: "Video", icon: Video },
];

export default function BetaLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<BetaUser | null>(null);

  useEffect(() => {
    const u = getCurrentBetaUser();
    if (!u) {
      navigate("/beta", { replace: true });
      return;
    }
    setUser(u);
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Beta banner */}
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-1.5 text-center">
        <p className="text-[10px] text-primary font-medium tracking-wide flex items-center justify-center gap-1.5">
          <FlaskConical className="h-3 w-3" />
          Aura Beta: demo features for Jane Smith and Douglas Wenz only.
        </p>
      </div>

      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`h-7 w-7 rounded-full ${user.avatarColor} flex items-center justify-center`}>
              <span className="text-[10px] font-bold text-white">{user.initials}</span>
            </div>
            <span className="text-sm font-medium">{user.name}</span>
          </div>

          <nav className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const active = location.pathname === link.to;
              return (
                <Button
                  key={link.to}
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => navigate(link.to)}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5 ml-2"
              onClick={() => { clearBetaUser(); navigate("/beta"); }}
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Switch</span>
            </Button>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
