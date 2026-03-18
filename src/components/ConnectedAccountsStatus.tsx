import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Mail, Users, Linkedin, Phone, Instagram,
  CheckCircle, Circle, Settings, Network,
} from "lucide-react";
import { getAuthHeaders } from "@/lib/auth-fetch";

export interface AccountStatus {
  id: string;
  label: string;
  icon: React.ReactNode;
  level: "Required" | "Recommended" | "Optional";
  connected: boolean;
  detail?: string;
}

interface ConnectedAccountsStatusProps {
  /** Compact = single row for AuraConnect, full = card for Settings */
  variant?: "compact" | "full";
  /** Override accounts if parent already has data */
  accounts?: AccountStatus[];
}

export function useConnectedAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<AccountStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      setLoading(true);
      let emailConnected = false;
      let emailDetail = "";

      try {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
          method: "POST",
          headers,
          body: JSON.stringify({ action: "list" }),
        });
        if (resp.ok) {
          const data = await resp.json();
          const conns = data.connections || [];
          emailConnected = conns.length > 0;
          if (emailConnected) {
            emailDetail = conns.map((c: any) => c.email_address).join(", ");
          }
        }
      } catch {}

      // For now, LinkedIn/Contacts/Phone/Social are not yet wired — stored locally
      const savedAccounts = localStorage.getItem(`aura-network-accounts-${user.id}`);
      const saved = savedAccounts ? JSON.parse(savedAccounts) : {};

      setAccounts([
        {
          id: "email",
          label: "Email (Gmail / Outlook)",
          icon: <Mail className="h-4 w-4" />,
          level: "Required",
          connected: emailConnected,
          detail: emailDetail || undefined,
        },
        {
          id: "contacts",
          label: "Contacts",
          icon: <Users className="h-4 w-4" />,
          level: "Required",
          connected: !!saved.contacts,
          detail: saved.contacts_detail,
        },
        {
          id: "linkedin",
          label: "LinkedIn",
          icon: <Linkedin className="h-4 w-4" />,
          level: "Required",
          connected: !!saved.linkedin,
          detail: saved.linkedin_detail,
        },
        {
          id: "phone",
          label: "Phone Contacts",
          icon: <Phone className="h-4 w-4" />,
          level: "Recommended",
          connected: !!saved.phone,
          detail: saved.phone_detail,
        },
        {
          id: "social",
          label: "Instagram / Facebook / X",
          icon: <Instagram className="h-4 w-4" />,
          level: "Optional",
          connected: !!saved.social,
          detail: saved.social_detail,
        },
      ]);
      setLoading(false);
    };

    check();
  }, [user]);

  return { accounts, loading };
}

export function ConnectedAccountsStatus({ variant = "compact", accounts: accountsProp }: ConnectedAccountsStatusProps) {
  const hook = useConnectedAccounts();
  const accounts = accountsProp ?? hook.accounts;
  const loading = accountsProp ? false : hook.loading;

  const requiredAccounts = accounts.filter(a => a.level === "Required");
  const allRequiredConnected = requiredAccounts.every(a => a.connected);
  const connectedCount = accounts.filter(a => a.connected).length;

  const levelColor = (level: string) => {
    if (level === "Required") return "text-destructive";
    if (level === "Recommended") return "text-warning";
    return "text-muted-foreground";
  };

  if (loading) return null;

  if (variant === "compact") {
    return (
      <Card className={`border ${allRequiredConnected ? "border-success/30 bg-success/5" : "border-warning/30 bg-warning/5"}`}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider">Connected Accounts</span>
              <Badge variant="outline" className="text-[10px]">
                {connectedCount}/{accounts.length}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" asChild>
              <Link to="/settings?section=network">
                <Settings className="h-3 w-3" />
                Manage
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${
                  a.connected
                    ? "border-success/30 bg-success/5 text-success"
                    : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                {a.connected ? (
                  <CheckCircle className="h-3 w-3 shrink-0" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0" />
                )}
                <span className="truncate">{a.label}</span>
                <Badge variant="outline" className={`text-[8px] px-1 py-0 ${levelColor(a.level)}`}>
                  {a.level}
                </Badge>
              </div>
            ))}
          </div>
          {!allRequiredConnected && (
            <p className="text-[10px] text-warning mt-2">
              All 3 required accounts connected = full brief with warm path. Any missing = research-only brief.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full variant for Settings
  return (
    <div className="space-y-3">
      {accounts.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between rounded-lg border p-3 sm:p-4 min-h-[56px]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              a.connected ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}>
              {a.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.label}</p>
              {a.connected && a.detail ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <CheckCircle className="h-3 w-3 text-success shrink-0" />
                  {a.detail}
                </p>
              ) : a.connected ? (
                <p className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 shrink-0" />
                  Connected
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Not connected</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] shrink-0 ${levelColor(a.level)}`}>
            {a.level}
          </Badge>
        </div>
      ))}
    </div>
  );
}
