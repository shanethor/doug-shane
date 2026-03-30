import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, CheckCircle, Loader2, Users, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConnectedAccounts } from "@/components/ConnectedAccountsStatus";
import { toast } from "sonner";

interface RewardTier {
  id: string;
  label: string;
  description: string;
  credit: string;
  type: "accounts" | "contacts";
  threshold: number;
}

const ACCOUNT_REWARDS: RewardTier[] = [
  { id: "acct_5", label: "5+ Accounts", description: "Connect 5 or more accounts", credit: "$5", type: "accounts", threshold: 5 },
  { id: "acct_10", label: "10+ Accounts", description: "Connect 10 or more accounts", credit: "$10", type: "accounts", threshold: 10 },
  { id: "acct_all", label: "All Accounts", description: "Connect every available account", credit: "$15", type: "accounts", threshold: 99 }, // 99 = sentinel for "all"
];


export function ConnectRewards() {
  const { user } = useAuth();
  const { accounts } = useConnectedAccounts();
  const [contactCount, setContactCount] = useState(0);
  const [claimedRewards, setClaimedRewards] = useState<string[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const connectedCount = accounts.filter(a => a.connected).length;
  const totalAccounts = accounts.length;

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get contact count
      const { count } = await supabase
        .from("canonical_persons")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", user.id);
      setContactCount(count || 0);

      // Get claimed rewards from profile metadata
      const { data: profile } = await supabase
        .from("profiles")
        .select("metadata")
        .eq("user_id", user.id)
        .maybeSingle();
      const meta = (profile as any)?.metadata || {};
      setClaimedRewards(meta.claimed_rewards || []);
    } catch {} finally { setLoading(false); }
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
    } finally { setClaiming(null); }
  };

  const isUnlocked = (reward: RewardTier) => {
    if (reward.type === "accounts") {
      if (reward.threshold === 99) return connectedCount >= totalAccounts && totalAccounts > 0;
      return connectedCount >= reward.threshold;
    }
    return contactCount >= reward.threshold;
  };

  const isClaimed = (id: string) => claimedRewards.includes(id);

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Gift className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-white/80">Connect Rewards</h3>
          <p className="text-[11px] text-white/40">Earn subscription credits by connecting accounts & importing contacts</p>
        </div>
      </div>

      {/* Account Rewards */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium flex items-center gap-1.5">
          <Link2 className="h-3 w-3" /> Account Rewards
          <Badge variant="outline" className="text-[9px] ml-auto border-white/10 text-white/30">{connectedCount}/{totalAccounts}</Badge>
        </p>
        {ACCOUNT_REWARDS.map(r => {
          const unlocked = isUnlocked(r);
          const claimed = isClaimed(r.id);
          return (
            <div key={r.id} className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
              claimed ? "border-green-500/20 bg-green-500/5" :
              unlocked ? "border-primary/30 bg-primary/5" :
              "border-white/5 bg-white/[0.02] opacity-60"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  claimed ? "bg-green-500/10 text-green-400" : unlocked ? "bg-primary/10 text-primary" : "bg-white/5 text-white/20"
                }`}>
                  {claimed ? <CheckCircle className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white/70">{r.label}</p>
                  <p className="text-[11px] text-white/30">{r.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-white/10 text-white/50">{r.credit}</Badge>
                {claimed ? (
                  <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">Claimed</Badge>
                ) : unlocked ? (
                  <Button size="sm" className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30 border-0" onClick={() => claimReward(r)} disabled={claiming === r.id}>
                    {claiming === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-white/10 text-white/20">Locked</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact Rewards */}
      <div className="space-y-1.5">
        <p className="text-[11px] text-white/30 uppercase tracking-wider font-medium flex items-center gap-1.5">
          <Users className="h-3 w-3" /> Contact Rewards
          <Badge variant="outline" className="text-[9px] ml-auto border-white/10 text-white/30">{contactCount.toLocaleString()} imported</Badge>
        </p>
        {CONTACT_REWARDS.map(r => {
          const unlocked = isUnlocked(r);
          const claimed = isClaimed(r.id);
          return (
            <div key={r.id} className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
              claimed ? "border-green-500/20 bg-green-500/5" :
              unlocked ? "border-primary/30 bg-primary/5" :
              "border-white/5 bg-white/[0.02] opacity-60"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                  claimed ? "bg-green-500/10 text-green-400" : unlocked ? "bg-primary/10 text-primary" : "bg-white/5 text-white/20"
                }`}>
                  {claimed ? <CheckCircle className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-sm font-medium text-white/70">{r.label}</p>
                  <p className="text-[11px] text-white/30">{r.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-white/10 text-white/50">{r.credit}</Badge>
                {claimed ? (
                  <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">Claimed</Badge>
                ) : unlocked ? (
                  <Button size="sm" className="h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30 border-0" onClick={() => claimReward(r)} disabled={claiming === r.id}>
                    {claiming === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
                  </Button>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-white/10 text-white/20">Locked</Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
