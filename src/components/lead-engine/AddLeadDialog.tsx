import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useCreateEngineLead, useLogEngineActivity } from "@/hooks/useLeadEngine";

export function AddLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const createLead = useCreateEngineLead();
  const logActivity = useLogEngineActivity();
  const [form, setForm] = useState({
    company: "", contact_name: "", email: "", phone: "", state: "",
    industry: "", est_premium: "", signal: "", source: "manual",
    score: "50", tier: "2", action: "",
  });

  const handleSubmit = async () => {
    if (!form.company.trim()) { toast.error("Company name is required"); return; }
    try {
      const lead = await createLead.mutateAsync({
        company: form.company,
        contact_name: form.contact_name || null,
        email: form.email || null,
        phone: form.phone || null,
        state: form.state || null,
        industry: form.industry || null,
        est_premium: parseFloat(form.est_premium) || 0,
        signal: form.signal || null,
        source: form.source,
        score: parseInt(form.score) || 50,
        tier: parseInt(form.tier) as 1 | 2 | 3,
        action: form.action || null,
        status: "new",
      });
      await logActivity.mutateAsync({
        engine_lead_id: lead.id,
        activity_type: "created",
        description: `Added ${form.company} as ${["", "Hot", "Warm", "Nurture"][parseInt(form.tier)]} lead`,
        source: form.source,
        metadata: {},
      });
      toast.success(`${form.company} added to Lead Engine`);
      onOpenChange(false);
      setForm({ company: "", contact_name: "", email: "", phone: "", state: "", industry: "", est_premium: "", signal: "", source: "manual", score: "50", tier: "2", action: "" });
    } catch {
      toast.error("Failed to add lead");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Intelligence Lead
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Company Name *</Label>
            <Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} placeholder="Bright Line Electric" />
          </div>
          <div>
            <Label className="text-xs">Contact Name</Label>
            <Input value={form.contact_name} onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">State</Label>
            <Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} placeholder="CT" />
          </div>
          <div>
            <Label className="text-xs">Industry</Label>
            <Input value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Est. Premium ($)</Label>
            <Input type="number" value={form.est_premium} onChange={(e) => setForm((p) => ({ ...p, est_premium: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Tier</Label>
            <Select value={form.tier} onValueChange={(v) => setForm((p) => ({ ...p, tier: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">🔥 Hot (Tier 1)</SelectItem>
                <SelectItem value="2">🌡️ Warm (Tier 2)</SelectItem>
                <SelectItem value="3">🌱 Nurture (Tier 3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Score (1-100)</Label>
            <Input type="number" min="1" max="100" value={form.score} onChange={(e) => setForm((p) => ({ ...p, score: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                <SelectItem value="Reddit">Reddit</SelectItem>
                <SelectItem value="Business Filings">Business Filings</SelectItem>
                <SelectItem value="Renewal Intercept">Renewal Intercept</SelectItem>
                <SelectItem value="Referral">Referral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Signal / Notes</Label>
            <Textarea value={form.signal} onChange={(e) => setForm((p) => ({ ...p, signal: e.target.value }))} placeholder="Quote request signal or note..." rows={2} />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Next Action</Label>
            <Input value={form.action} onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))} placeholder="Call by 3pm today" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createLead.isPending}>
            {createLead.isPending ? "Adding..." : "Add Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
