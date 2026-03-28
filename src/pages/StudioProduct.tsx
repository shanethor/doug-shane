import { useState, useEffect } from "react";
import { ProductLayout } from "@/components/ProductLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Clock, CheckCircle, Loader2, ArrowRight, Calendar,
  Wrench, Send, Edit3, Phone, Sparkles, CalendarDays,
  MessageSquare, Building2, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

type StudioRequest = {
  id: string;
  user_id: string;
  request_type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  estimated_delivery: string | null;
  admin_notes: string | null;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Loader2 },
  building: { label: "Building", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Wrench },
  delivered: { label: "Delivered", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  scheduled: { label: "Scheduled", color: "bg-primary/10 text-primary border-primary/20", icon: CalendarDays },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive/20", icon: Clock },
};

const TYPE_LABELS: Record<string, { label: string; icon: any }> = {
  new_build: { label: "New Build", icon: Wrench },
  edit: { label: "Edit Request", icon: Edit3 },
  call_schedule: { label: "Call Scheduled", icon: Phone },
};

function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

export default function StudioProduct() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<StudioRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<"new_build" | "edit" | "call_schedule">("new_build");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [callDate, setCallDate] = useState("");
  const [callTime, setCallTime] = useState("10:00");

  // "How it works" toggle
  const [showHow, setShowHow] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadRequests();

    // Realtime subscription
    const channel = supabase
      .channel("studio-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "studio_requests", filter: `user_id=eq.${user.id}` }, () => {
        loadRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadRequests = async () => {
    const { data } = await supabase
      .from("studio_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setRequests(data as any);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !title.trim()) { toast.error("Please add a title"); return; }
    setSubmitting(true);

    const estimatedDelivery = formType === "call_schedule"
      ? null
      : addBusinessDays(new Date(), formType === "edit" ? 2 : 5)
          .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const scheduledDate = formType === "call_schedule" && callDate
      ? new Date(`${callDate}T${callTime}`).toISOString()
      : null;

    const { error } = await supabase.from("studio_requests").insert({
      user_id: user.id,
      request_type: formType,
      title: title.trim(),
      description: description.trim(),
      status: formType === "call_schedule" ? "scheduled" : "submitted",
      priority,
      estimated_delivery: estimatedDelivery,
      scheduled_date: scheduledDate,
    } as any);

    if (error) {
      toast.error("Failed to submit request");
      setSubmitting(false);
      return;
    }

    const messages: Record<string, string> = {
      new_build: "Build request submitted! We'll scope it within 24 hours.",
      edit: "Edit request submitted! We'll review and start shortly.",
      call_schedule: "Call scheduled! You'll receive a calendar invite shortly.",
    };
    toast.success(messages[formType]);
    resetForm();
    await loadRequests();
    setSubmitting(false);
  };

  const resetForm = () => {
    setShowForm(false);
    setTitle("");
    setDescription("");
    setPriority("normal");
    setCallDate("");
    setCallTime("10:00");
    setFormType("new_build");
  };

  const filteredRequests = activeTab === "all"
    ? requests
    : requests.filter(r => r.request_type === activeTab);

  const activeCount = requests.filter(r => !["delivered", "completed", "cancelled"].includes(r.status)).length;

  return (
    <ProductLayout studioUnlocked>
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-white/90">AURA Studio</h1>
            <p className="text-sm text-white/40 mt-1">
              Your AI-native build team — custom tools, dashboards & assets
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/book/aura-studio">
              <Button variant="outline" size="sm" className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10">
                <CalendarDays className="h-3.5 w-3.5" /> Schedule Call
              </Button>
            </Link>
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0" size="sm">
              <Plus className="h-4 w-4" /> New Request
            </Button>
          </div>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { type: "new_build" as const, icon: Wrench, label: "New Service", desc: "Custom CRM, AI agent, dashboard…", color: "text-orange-400 bg-orange-500/10" },
            { type: "edit" as const, icon: Edit3, label: "Request Edit", desc: "Change an existing build or tool", color: "text-blue-400 bg-blue-500/10" },
            { type: "call_schedule" as const, icon: Phone, label: "Schedule Call", desc: "Talk to our team about your project", color: "text-emerald-400 bg-emerald-500/10" },
          ].map(item => (
            <button
              key={item.type}
              onClick={() => { setFormType(item.type); setShowForm(true); }}
              className="text-left p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
            >
              <div className={`h-9 w-9 rounded-lg ${item.color} flex items-center justify-center mb-3`}>
                <item.icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-white/80 group-hover:text-white">{item.label}</p>
              <p className="text-xs text-white/30 mt-0.5">{item.desc}</p>
            </button>
          ))}
        </div>

        {/* Requests list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider text-white/30">
              Your Requests
              {activeCount > 0 && <Badge variant="outline" className="ml-2 text-[10px] border-orange-500/20 text-orange-400">{activeCount} active</Badge>}
            </h2>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white/5 h-7">
                <TabsTrigger value="all" className="text-[10px] h-5 px-2">All</TabsTrigger>
                <TabsTrigger value="new_build" className="text-[10px] h-5 px-2">Builds</TabsTrigger>
                <TabsTrigger value="edit" className="text-[10px] h-5 px-2">Edits</TabsTrigger>
                <TabsTrigger value="call_schedule" className="text-[10px] h-5 px-2">Calls</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-white/20" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
              <Wrench className="h-10 w-10 text-white/10 mx-auto mb-4" />
              <p className="text-sm text-white/40 mb-2">No requests yet</p>
              <p className="text-xs text-white/20">Submit a new build, edit request, or schedule a call above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRequests.map(req => {
                const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.submitted;
                const typeInfo = TYPE_LABELS[req.request_type] || TYPE_LABELS.new_build;
                const StatusIcon = cfg.icon;
                const TypeIcon = typeInfo.icon;
                return (
                  <div key={req.id} className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] p-5 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TypeIcon className="h-3.5 w-3.5 text-white/30" />
                        <h3 className="text-sm font-medium text-white/80">{req.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[9px] border-white/10 text-white/40">{typeInfo.label}</Badge>
                        <Badge variant="outline" className={`text-[9px] ${cfg.color}`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-1" />
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>
                    {req.description && <p className="text-xs text-white/30 mb-3">{req.description}</p>}
                    {req.admin_notes && (
                      <div className="rounded-lg bg-orange-500/5 border border-orange-500/10 p-2.5 mb-3">
                        <p className="text-[11px] text-orange-300/70"><span className="font-medium text-orange-300">Team note:</span> {req.admin_notes}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-white/20">
                      <span>Submitted {new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      {req.estimated_delivery && <span>Est. delivery: {req.estimated_delivery}</span>}
                      {req.scheduled_date && <span>Call: {new Date(req.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
                      {req.priority !== "normal" && (
                        <Badge variant="outline" className={`text-[9px] ${req.priority === "urgent" ? "text-destructive border-destructive/30" : req.priority === "high" ? "text-amber-400 border-amber-500/20" : "text-white/30 border-white/10"}`}>
                          {req.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="border border-white/[0.06] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowHow(!showHow)}
            className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-orange-500/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">How AURA Studio Works</h3>
                <p className="text-xs text-white/30">End-to-end AI automation, custom-built for your firm</p>
              </div>
            </div>
            {showHow ? <ChevronUp className="h-5 w-5 text-white/20" /> : <ChevronDown className="h-5 w-5 text-white/20" />}
          </button>
          {showHow && (
            <div className="px-5 pb-6 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="h-px bg-white/[0.06]" />
              <div className="grid sm:grid-cols-3 gap-5">
                {[
                  { icon: <Send className="h-5 w-5" />, title: "1. Tell Us What You Need", desc: "Submit a build request for custom CRMs, AI agents, marketing automation, dashboards, or any tool." },
                  { icon: <Sparkles className="h-5 w-5" />, title: "2. We Scope, Design & Build", desc: "Our team scopes your project, designs the solution, and builds it using AI-powered tools — delivering in days." },
                  { icon: <CheckCircle className="h-5 w-5" />, title: "3. Launch & Iterate", desc: "We deploy, train your team, and continue iterating. Request edits anytime from this dashboard." },
                ].map((step, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">{step.icon}</div>
                    <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                    <p className="text-xs text-white/40 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Request Dialog */}
        <Dialog open={showForm} onOpenChange={(o) => !o && resetForm()}>
          <DialogContent className="sm:max-w-md bg-[#0c0c0e] border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                {formType === "new_build" && <><Wrench className="h-4 w-4 text-orange-400" /> New Build Request</>}
                {formType === "edit" && <><Edit3 className="h-4 w-4 text-blue-400" /> Request Edit</>}
                {formType === "call_schedule" && <><Phone className="h-4 w-4 text-emerald-400" /> Schedule a Call</>}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Type selector */}
              <div className="flex gap-2">
                {(["new_build", "edit", "call_schedule"] as const).map(t => {
                  const info = TYPE_LABELS[t];
                  const Icon = info.icon;
                  return (
                    <button
                      key={t}
                      onClick={() => setFormType(t)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${formType === t ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" : "bg-white/5 text-white/40 border border-white/5 hover:bg-white/10"}`}
                    >
                      <Icon className="h-3 w-3" />
                      {info.label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white/40">
                  {formType === "call_schedule" ? "What would you like to discuss?" : "Title"} *
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={formType === "new_build" ? "e.g. Custom CRM with pipeline tracking" : formType === "edit" ? "e.g. Update dashboard layout" : "e.g. Discuss AI agent integration"}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-white/40">Details</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you need in detail..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[80px]"
                />
              </div>

              {formType === "call_schedule" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-white/40">Preferred Date</Label>
                    <Input
                      type="date"
                      value={callDate}
                      onChange={(e) => setCallDate(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-white/40">Preferred Time</Label>
                    <Input
                      type="time"
                      value={callTime}
                      onChange={(e) => setCallTime(e.target.value)}
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>
              )}

              {formType !== "call_schedule" && (
                <div className="space-y-2">
                  <Label className="text-xs text-white/40">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!title.trim() || submitting}
                className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0 h-11"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    {formType === "call_schedule" ? "Schedule Call" : "Submit Request"}
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProductLayout>
  );
}
