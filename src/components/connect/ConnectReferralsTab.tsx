import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Handshake, Plus, ArrowRight, Check, Clock, X,
  Loader2, TrendingUp, Send, Users, BarChart3,
} from "lucide-react";

interface Referral {
  id: string;
  recipient_name: string;
  recipient_company: string | null;
  referred_contact_name: string;
  referred_contact_company: string | null;
  status: string;
  outcome: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  sent: { label: "Sent", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Send },
  meeting_set: { label: "Meeting Set", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  converted: { label: "Converted", color: "bg-success/10 text-success border-success/20", icon: Check },
  lost: { label: "Lost", color: "bg-destructive/10 text-destructive border-destructive/20", icon: X },
};

export default function ConnectReferralsTab() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [recipientName, setRecipientName] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactCompany, setContactCompany] = useState("");
  const [posting, setPosting] = useState(false);

  const loadReferrals = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("connect_referrals")
        .select("*")
        .eq("sender_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReferrals(data || []);
    } catch {
      toast.error("Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadReferrals(); }, [loadReferrals]);

  const handleAddReferral = async () => {
    if (!recipientName.trim() || !contactName.trim() || !user) return;
    setPosting(true);
    try {
      const { error } = await supabase.from("connect_referrals").insert({
        sender_user_id: user.id,
        recipient_name: recipientName.trim(),
        recipient_company: recipientCompany.trim() || null,
        referred_contact_name: contactName.trim(),
        referred_contact_company: contactCompany.trim() || null,
      });
      if (error) throw error;
      toast.success("Referral tracked!");
      setRecipientName("");
      setRecipientCompany("");
      setContactName("");
      setContactCompany("");
      setShowForm(false);
      loadReferrals();
    } catch {
      toast.error("Failed to add referral");
    } finally {
      setPosting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("connect_referrals")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(`Status updated to ${STATUS_CONFIG[status]?.label || status}`);
      loadReferrals();
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Stats
  const totalSent = referrals.length;
  const totalConverted = referrals.filter(r => r.status === "converted").length;
  const totalMeetings = referrals.filter(r => r.status === "meeting_set").length;
  const conversionRate = totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0;
  const reciprocityScore = totalSent > 0 ? Math.min(100, totalSent * 8) : 0; // Simplified scoring

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Send className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Referrals Sent</span>
          </div>
          <p className="text-2xl font-bold">{totalSent}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">Meetings Set</span>
          </div>
          <p className="text-2xl font-bold">{totalMeetings}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <Check className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">Converted</span>
          </div>
          <p className="text-2xl font-bold">{totalConverted}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">Reciprocity Score</span>
          </div>
          <p className="text-2xl font-bold">{reciprocityScore}</p>
        </Card>
      </div>

      {/* Conversion Rate Banner */}
      {totalSent > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            <span className="text-sm">
              <span className="font-semibold">{conversionRate}%</span> conversion rate across {totalSent} referrals
            </span>
          </div>
          <Badge variant={reciprocityScore >= 80 ? "default" : "outline"} className="gap-1 text-xs">
            <Handshake className="h-3 w-3" />
            {reciprocityScore >= 80 ? "Active Connector" : reciprocityScore >= 40 ? "Building" : "Getting Started"}
          </Badge>
        </div>
      )}

      {/* Add Referral Button */}
      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
        <Plus className="h-3.5 w-3.5" />
        Track a Referral
      </Button>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardContent className="pt-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Sent To (Name)</label>
                <Input placeholder="Sarah Johnson" value={recipientName} onChange={e => setRecipientName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Their Company</label>
                <Input placeholder="Smith & Associates CPA" value={recipientCompany} onChange={e => setRecipientCompany(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Referred Contact</label>
                <Input placeholder="Mike Davis" value={contactName} onChange={e => setContactName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Their Company</label>
                <Input placeholder="Davis Construction LLC" value={contactCompany} onChange={e => setContactCompany(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="gap-1.5" onClick={handleAddReferral} disabled={posting || !recipientName.trim() || !contactName.trim()}>
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Track Referral
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Handshake className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No referrals tracked yet. Start tracking to see your reciprocity score grow.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {referrals.map(ref => {
            const statusConfig = STATUS_CONFIG[ref.status] || STATUS_CONFIG.sent;
            const StatusIcon = statusConfig.icon;
            return (
              <Card key={ref.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 shrink-0 mt-0.5 ${statusConfig.color}`}>
                      <StatusIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">
                          {ref.referred_contact_name}
                          {ref.referred_contact_company && <span className="text-muted-foreground font-normal"> at {ref.referred_contact_company}</span>}
                        </p>
                        <Badge variant="outline" className={`text-[9px] ${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ArrowRight className="h-3 w-3" />
                        Referred to {ref.recipient_name}
                        {ref.recipient_company && ` (${ref.recipient_company})`}
                      </div>
                      <div className="flex items-center gap-3 pt-1">
                        <span className="text-[10px] text-muted-foreground">{timeAgo(ref.created_at)}</span>
                        <div className="flex-1" />
                        {ref.status === "sent" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => handleUpdateStatus(ref.id, "meeting_set")}>
                              <Clock className="h-3 w-3" /> Meeting Set
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => handleUpdateStatus(ref.id, "converted")}>
                              <Check className="h-3 w-3" /> Converted
                            </Button>
                          </div>
                        )}
                        {ref.status === "meeting_set" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-success" onClick={() => handleUpdateStatus(ref.id, "converted")}>
                              <Check className="h-3 w-3" /> Won
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 text-destructive" onClick={() => handleUpdateStatus(ref.id, "lost")}>
                              <X className="h-3 w-3" /> Lost
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
