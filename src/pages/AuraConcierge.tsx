import { useState } from "react";
import { useUserFeatures } from "@/hooks/useUserFeatures";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { useConcierge, CATEGORIES, STATUS_ORDER } from "@/hooks/useConcierge";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  Loader2, Plus, Clock, CheckCircle, AlertCircle, Archive,
  Wrench, BarChart3, Palette, TrendingUp, Cog, HelpCircle,
  Lock, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

const categoryIcons: Record<string, any> = {
  web_tool: Wrench,
  dashboard: BarChart3,
  design: Palette,
  sales_assets: TrendingUp,
  process_automation: Cog,
  other: HelpCircle,
};

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  queued: { label: "Queued", color: "bg-muted text-muted-foreground", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-primary/10 text-primary", icon: Loader2 },
  needs_info: { label: "Needs Info", color: "bg-warning/20 text-warning", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-success/20 text-success", icon: CheckCircle },
  archived: { label: "Archived", color: "bg-muted text-muted-foreground", icon: Archive },
};

function ConciergePaywall({ onStartTrial }: { onStartTrial: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-6 max-w-lg mx-auto">
      <div className="rounded-full bg-[#F59E0B]/10 p-4">
        <Lock className="h-8 w-8 text-[#F59E0B]" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">AURA Concierge</h2>
      <p className="text-muted-foreground leading-relaxed">
        Your on-call build team for systems, tools, and assets that make your business easier to run — and easier to sell.
      </p>
      <div className="bg-card border rounded-xl p-5 w-full text-left space-y-2">
        <div className="text-sm text-muted-foreground"><strong className="text-foreground">$1,000</strong>/month subscription</div>
        <div className="text-sm text-[#F59E0B] font-medium">Launch offer: first 3 months at $500/month</div>
        <div className="text-xs text-muted-foreground">1-week free trial · card on file required</div>
      </div>
      <Button onClick={onStartTrial} className="bg-[#F59E0B] hover:bg-[#FBBF24] text-[#08080A] font-semibold px-8">
        <Sparkles className="h-4 w-4 mr-2" />
        Start Free Trial
      </Button>
    </div>
  );
}

export default function AuraConcierge() {
  const { hasConcierge, loading: featuresLoading } = useUserFeatures();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    requests, loading, activeCount, maxActive,
    isTrialActive, isPaid, isLocked, trialDaysLeft,
    startTrial, createRequest, refresh,
  } = useConcierge();

  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!featuresLoading && !roleLoading && !hasConcierge && !isAdmin) {
      navigate("/", { replace: true });
    }
  }, [featuresLoading, roleLoading, hasConcierge, isAdmin, navigate]);

  const handleStartTrial = async () => {
    const error = await startTrial();
    if (error) toast.error("Failed to start trial");
    else toast.success("Trial started! You have 7 days to explore Concierge.");
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSubmitting(true);
    const { error } = await createRequest({ title: title.trim(), description: description.trim(), category });
    setSubmitting(false);
    if (error) { toast.error(error); return; }
    toast.success("Request submitted!");
    setShowNew(false);
    setTitle("");
    setDescription("");
    setCategory("other");
  };

  if (featuresLoading || roleLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AURA Concierge</h1>
            <p className="text-sm text-muted-foreground mt-1">Your on-call build team</p>
          </div>
          {(!isLocked || hasConcierge || isAdmin) && (
            <div className="flex items-center gap-3">
              {isTrialActive && (
                <Badge variant="outline" className="border-[#F59E0B] text-[#F59E0B]">
                  Trial · {trialDaysLeft}d left
                </Badge>
              )}
              {isPaid && (
                <Badge variant="outline" className="border-success text-success">Active</Badge>
              )}
              <Badge variant="secondary">{activeCount}/{maxActive} active</Badge>
            </div>
          )}
        </div>

        {/* Paywall — skip if admin or feature-flag granted */}
        {isLocked && !hasConcierge && !isAdmin && <ConciergePaywall onStartTrial={handleStartTrial} />}

        {/* Active user view */}
        {(!isLocked || hasConcierge || isAdmin) && (
          <>
            {/* New request button */}
            <Button
              onClick={() => setShowNew(true)}
              disabled={activeCount >= maxActive}
              className="bg-[#F59E0B] hover:bg-[#FBBF24] text-[#08080A]"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Request
              {activeCount >= maxActive && <span className="ml-2 text-xs opacity-70">(limit reached)</span>}
            </Button>

            {/* Requests list */}
            {requests.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No requests yet. Submit your first build request!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {requests.map((r) => {
                  const sc = statusConfig[r.status] || statusConfig.queued;
                  const CatIcon = categoryIcons[r.category] || HelpCircle;
                  const StatusIcon = sc.icon;
                  return (
                    <Card key={r.id} className="hover:border-border/80 transition-colors">
                      <CardContent className="py-4 flex items-start gap-4">
                        <div className="rounded-lg bg-muted p-2 shrink-0">
                          <CatIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{r.title}</span>
                            <Badge className={`text-[10px] ${sc.color}`}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {sc.label}
                            </Badge>
                          </div>
                          {r.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                            <span>{CATEGORIES.find(c => c.value === r.category)?.label || r.category}</span>
                            <span>·</span>
                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                            {r.completed_at && (
                              <>
                                <span>·</span>
                                <span className="text-success">Completed {new Date(r.completed_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* New request dialog */}
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Concierge Request</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Build a client intake landing page" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Category</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you need built, any tools involved, and any deadlines..."
                  rows={5}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-[#F59E0B] hover:bg-[#FBBF24] text-[#08080A]"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
