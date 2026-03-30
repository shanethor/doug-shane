import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, CheckCircle, Loader2, Users, Link2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConnectedAccounts } from "@/components/ConnectedAccountsStatus";
import { toast } from "sonner";

interface RewardTier {
  id: string;
  label: string;
  description: string;
  credit: string;
  threshold: number;
}

interface IntelligenceLevel {
  level: number;
  discount: string;
  multiProfileThreshold: number;
  singleProfileThreshold: number;
}

interface ConnectRewardsProps {
  variant?: "full" | "compact";
}

const ACCOUNT_REWARDS: RewardTier[] = [
  { id: "acct_5", label: "5+ Accounts", description: "Connect 5 or more accounts", credit: "$5", threshold: 5 },
  { id: "acct_10", label: "10+ Accounts", description: "Connect 10 or more accounts", credit: "$10", threshold: 10 },
  { id: "acct_all", label: "All Accounts", description: "Connect every available account", credit: "$15", threshold: 99 },
];

const INTELLIGENCE_LEVELS: IntelligenceLevel[] = [
  { level: 1, discount: "$10/mo", multiProfileThreshold: 25, singleProfileThreshold: 100 },
  { level: 2, discount: "$25/mo", multiProfileThreshold: 50, singleProfileThreshold: 200 },
  { level: 3, discount: "$50/mo", multiProfileThreshold: 100, singleProfileThreshold: 350 },
  { level: 4, discount: "$100/mo", multiProfileThreshold: 200, singleProfileThreshold: 500 },
];

function hasMultipleProfiles(contact: any): boolean {
  const fields = [contact.primary_email, contact.primary_phone, contact.linkedin_url].filter(Boolean).length;
  const hasName = !!(contact.display_name && contact.display_name.trim().includes(" "));
  return hasName && fields >= 2;
}

function hasSingleProfile(contact: any): boolean {
  const fields = [contact.primary_email, contact.primary_phone, contact.linkedin_url].filter(Boolean).length;
  const hasName = !!(contact.display_name && contact.display_name.trim().includes(" "));
  return hasName && fields >= 1;
}

export function ConnectRewards({ variant = "full" }: ConnectRewardsProps) {
  const { user } = useAuth();
  const { accounts } = useConnectedAccounts();
  const [contactCount, setContactCount] = useState(0);
  const [multiProfileCount, setMultiProfileCount] = useState(0);
  const [singleProfileCount, setSingleProfileCount] = useState(0);
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const connectedCount = accounts.filter(a => a.connected).length;
  const totalAccounts = accounts.length;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: contacts } = await supabase
        .from("canonical_persons")
        .select("display_name, primary_email, primary_phone, linkedin_url")
        .eq("owner_user_id", user.id);

      const contactRows = contacts || [];
      const multi = contactRows.filter(hasMultipleProfiles).length;
      const single = contactRows.filter(c => hasSingleProfile(c) && !hasMultipleProfiles(c)).length;

      setContactCount(contactRows.length);
      setMultiProfileCount(multi);
      setSingleProfileCount(single + multi);

      const { data: profile } = await supabase
        .from("profiles")
        .select("metadata")
        .eq("user_id", user.id)
        .maybeSingle();

      const meta = (profile as any)?.metadata || {};
      setClaimedRewards(meta.claimed_rewards || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const claimReward = async (reward: RewardTier) => {
    if (!user) return;
    setClaiming(reward.id);
    try {
      const { data, error } = await supabase.functions.invoke("claim-connect-reward", {
        body: { reward_id: reward.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setClaimedRewards(prev => [...prev, reward.id]);
      toast.success(`${reward.credit} credit applied to your subscription!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to claim reward");
    } finally {
      setClaiming(null);
    }
  };

  const isAccountUnlocked = (reward: RewardTier) => {
    if (reward.threshold === 99) return connectedCount >= totalAccounts && totalAccounts > 0;
    return connectedCount >= reward.threshold;
  };

  const isClaimed = (id: string) => claimedRewards.includes(id);

  const currentLevel = INTELLIGENCE_LEVELS.slice().reverse().find(
    (level) => multiProfileCount >= level.multiProfileThreshold || singleProfileCount >= level.singleProfileThreshold,
  );

  if (loading) return null;

  if (variant === "compact") {
    return (
      <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-3 space-y-2 transition-colors hover:bg-sidebar-accent/60">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
            <Gift className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/55">Rewards</p>
            <p className="text-sm font-medium text-sidebar-foreground">Account rewards + Intelligence discounts</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground/70">{connectedCount}/{totalAccounts} accounts</Badge>
          <Badge variant="outline" className="border-sidebar-border text-sidebar-foreground/70">{contactCount.toLocaleString()} contacts</Badge>
          <Badge className="border-0 bg-sidebar-primary/10 text-sidebar-primary">
            {currentLevel ? `Level ${currentLevel.level} active` : "No level yet"}
          </Badge>
        </div>
        <p className="text-[11px] leading-relaxed text-sidebar-foreground/55">
          Manage one-time account rewards and next-month discounts from synced contacts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Gift className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">Rewards</h3>
          <p className="text-[11px] text-muted-foreground">One-time account rewards + ongoing Intelligence discounts</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Link2 className="h-3 w-3" /> Account Rewards
          <Badge variant="outline" className="ml-auto text-[9px]">{connectedCount}/{totalAccounts}</Badge>
        </p>
        {ACCOUNT_REWARDS.map((reward) => {
          const unlocked = isAccountUnlocked(reward);
          const claimed = isClaimed(reward.id);
          return (
            <div
              key={reward.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                claimed ? "border-primary/20 bg-primary/5" : unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-card/40 opacity-70"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${claimed || unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {claimed ? <CheckCircle className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{reward.label}</p>
                  <p className="text-[11px] text-muted-foreground">{reward.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{reward.credit}</Badge>
                {claimed ? (
                  <Badge className="border-0 bg-primary/10 text-primary">Claimed</Badge>
                ) : unlocked ? (
                  <Button size="sm" className="h-7 text-xs" onClick={() => claimReward(reward)} disabled={claiming === reward.id}>
                    {claiming === reward.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">Locked</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-1.5">
        <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Zap className="h-3 w-3" /> Intelligence Discount Levels
          <Badge variant="outline" className="ml-auto text-[9px]">{multiProfileCount} multi / {singleProfileCount} qualifying</Badge>
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Discounts reset at month-end and apply to the following month when you add qualifying contacts with complete profiles.
        </p>
        {INTELLIGENCE_LEVELS.map((level) => {
          const unlocked = multiProfileCount >= level.multiProfileThreshold || singleProfileCount >= level.singleProfileThreshold;
          const active = currentLevel?.level === level.level;
          return (
            <div
              key={level.level}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                active ? "border-primary/30 bg-primary/5" : unlocked ? "border-primary/20 bg-primary/[0.03]" : "border-border bg-card/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <span className="text-xs font-bold">L{level.level}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Level {level.level} Intelligence</p>
                  <p className="text-[11px] text-muted-foreground">
                    {level.multiProfileThreshold} multi-profile or {level.singleProfileThreshold} single-profile contacts
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">-{level.discount}</Badge>
                <Badge className={`border-0 ${active || unlocked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {active ? "Active" : unlocked ? "Unlocked" : "Locked"}
                </Badge>
              </div>
            </div>
          );
        })}
        <p className="text-[11px] text-muted-foreground">
          A profile means first + last name plus email, phone, or LinkedIn; multi-profile requires at least two of those fields.
        </p>
      </div>
    </div>
  );
}
