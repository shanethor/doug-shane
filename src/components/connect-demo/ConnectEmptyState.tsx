import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Mail, Link2, Calendar, Network, TrendingUp } from "lucide-react";

interface ConnectEmptyStateProps {
  type: "email" | "pipeline" | "calendar" | "network";
}

const CONFIG = {
  email: {
    icon: Mail,
    title: "Connect your email",
    description: "Link your Gmail or Outlook account to see your real inbox here. AuRa will sync your emails and provide AI-powered insights.",
    settingsSection: "email",
    buttonLabel: "Connect Email Account",
  },
  pipeline: {
    icon: TrendingUp,
    title: "No leads yet",
    description: "Your pipeline is empty. Add leads from the main dashboard or create them here to start tracking your deals.",
    settingsSection: null,
    buttonLabel: "Go to Dashboard",
  },
  calendar: {
    icon: Calendar,
    title: "Set up your calendar",
    description: "You can use AuRa's native calendar right away, or connect Gmail/Outlook to sync your external events alongside AuRa events.",
    settingsSection: "calendar",
    buttonLabel: "Connect Calendar",
    secondaryNote: "You can also create events directly using the native calendar below.",
  },
  network: {
    icon: Network,
    title: "Build your network",
    description: "Connect your accounts (email, contacts, LinkedIn, phone) to populate your network graph with real relationship data.",
    settingsSection: "network",
    buttonLabel: "Connect Accounts",
  },
};

export function ConnectEmptyState({ type }: ConnectEmptyStateProps) {
  const cfg = CONFIG[type];
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(140 12% 42% / 0.1)" }}>
        <Icon className="h-8 w-8" style={{ color: "hsl(140 12% 58%)" }} />
      </div>
      <h3 className="text-lg font-semibold text-white/90 mb-2">{cfg.title}</h3>
      <p className="text-sm text-white/40 max-w-md mb-6">{cfg.description}</p>
      {cfg.settingsSection ? (
        <Link to={`/app/settings?section=${cfg.settingsSection}`}>
          <Button className="gap-2 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0">
            <Link2 className="h-4 w-4" />
            {cfg.buttonLabel}
          </Button>
        </Link>
      ) : (
        <Link to="/">
          <Button className="gap-2 bg-[hsl(140,12%,42%)] hover:bg-[hsl(140,12%,48%)] text-white border-0">
            {cfg.buttonLabel}
          </Button>
        </Link>
      )}
      {cfg.secondaryNote && (
        <p className="text-xs text-white/30 mt-4">{cfg.secondaryNote}</p>
      )}
    </div>
  );
}
