import { useState } from "react";
import { ProductLayout } from "@/components/ProductLayout";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, Loader2, ArrowRight, Calendar, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface BuildRequest {
  id: string;
  title: string;
  description: string;
  status: "submitted" | "in_review" | "building" | "delivered";
  estimatedDelivery: string;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  submitted: { label: "Submitted", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
  in_review: { label: "In Review", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Loader2 },
  building: { label: "Building", color: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: Wrench },
  delivered: { label: "Delivered", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
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
  const [requests, setRequests] = useState<BuildRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) { toast.error("Please add a title"); return; }
    const delivery = addBusinessDays(new Date(), 5);
    const req: BuildRequest = {
      id: `req-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      status: "submitted",
      estimatedDelivery: delivery.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
    setRequests(prev => [req, ...prev]);
    setTitle("");
    setDescription("");
    setShowForm(false);
    toast.success("Build request submitted! We'll get back to you within 24 hours.");
  };

  return (
    <ProductLayout product="studio">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-tight text-white/90">Aura Studio</h1>
            <p className="text-sm text-white/40 mt-1">Your AI-native build team — custom tools, dashboards & assets</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0"
          >
            <Plus className="h-4 w-4" /> New Request
          </Button>
        </div>

        {/* New request form */}
        {showForm && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
            <h3 className="text-sm font-medium text-white/80">What do you need built?</h3>
            <div className="space-y-2">
              <Label className="text-xs text-white/40">Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Custom CRM with pipeline tracking"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-white/40">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what you need in detail..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSubmit} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
                Submit Request
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)} className="text-white/40 hover:text-white">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Requests list */}
        <div>
          <h2 className="text-sm uppercase tracking-wider text-white/30 mb-4">Your Build Requests</h2>
          {requests.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-12 text-center">
              <Wrench className="h-10 w-10 text-white/10 mx-auto mb-4" />
              <p className="text-sm text-white/40 mb-2">No build requests yet</p>
              <p className="text-xs text-white/20">Click "New Request" to get started with your first build.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const cfg = STATUS_CONFIG[req.status];
                const StatusIcon = cfg.icon;
                return (
                  <div key={req.id} className="rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] p-5 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-medium text-white/80">{req.title}</h3>
                      <Badge variant="outline" className={cfg.color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>
                    {req.description && <p className="text-xs text-white/30 mb-3">{req.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-white/20">
                      <span>Submitted {req.createdAt}</span>
                      <span>Est. delivery: {req.estimatedDelivery}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Schedule a call */}
        <div className="rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent p-6">
          <h3 className="text-sm font-medium text-white/80 mb-2">Need to talk to a human?</h3>
          <p className="text-sm text-white/40 mb-4">Schedule a call with our team to discuss your project.</p>
          <Link to="/book/aura-studio">
            <Button size="sm" className="gap-2 bg-orange-500 hover:bg-orange-600 text-white border-0">
              <Calendar className="h-3.5 w-3.5" /> Schedule a Call
            </Button>
          </Link>
        </div>
      </div>
    </ProductLayout>
  );
}
