import { useState } from "react";
import { PhoneMissed, Phone, Building2, MapPin, Target, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useEngineLeads, useUpdateEngineLead, type EngineLead } from "@/hooks/useLeadEngine";

export default function NoEmailLeads() {
  const { data: allLeads, isLoading } = useEngineLeads();
  const updateLead = useUpdateEngineLead();
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  // Leads that have no email (phone-only or completely uncontacted)
  const noEmailLeads = (allLeads || []).filter(
    (l: EngineLead) => !l.email && l.status !== "converted"
  );

  const handleEnrichContact = async (lead: EngineLead) => {
    setEnrichingId(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-lead", {
        body: {
          company: lead.company,
          contact_name: lead.contact_name,
          email: lead.email,
          state: lead.state,
          industry: lead.industry,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const updates: Partial<EngineLead> = {};
      if (data?.contact_name && !lead.contact_name) updates.contact_name = data.contact_name;
      if (data?.email) updates.email = data.email;
      if (data?.phone && !lead.phone) updates.phone = data.phone;

      if (Object.keys(updates).length > 0) {
        await updateLead.mutateAsync({ id: lead.id, ...updates } as any);
        const found = Object.keys(updates).join(", ");
        toast.success(`Found ${found} for ${lead.company}`);
      } else {
        toast.info(`No email found for ${lead.company} — try adding manually`);
      }
    } catch (err: any) {
      toast.error(err.message || "Research failed");
    } finally {
      setEnrichingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!noEmailLeads.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
        <PhoneMissed className="h-10 w-10 text-muted-foreground/40" />
        <h3 className="text-base font-semibold text-muted-foreground">No leads missing email</h3>
        <p className="text-sm text-muted-foreground/70 max-w-xs">
          All your leads have email addresses. When leads come in without one, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Leads Without Email</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {noEmailLeads.length} lead{noEmailLeads.length !== 1 ? "s" : ""} — phone only or uncontacted.
            Use Research Contact to find an email so you can send the verification questionnaire.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        {noEmailLeads.map((lead: EngineLead, idx: number) => (
          <div
            key={lead.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
            style={{ borderTop: idx > 0 ? "1px solid hsl(var(--border))" : "none" }}
          >
            {/* Company + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium truncate">{lead.company}</span>
                <Badge variant="outline" className="text-[10px] gap-0.5 shrink-0">
                  <Target className="h-2.5 w-2.5" />{lead.score}
                </Badge>
                {(lead as any).verified && (
                  <Badge className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30 shrink-0">
                    Verified
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                {lead.industry && (
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />{lead.industry}
                  </span>
                )}
                {lead.state && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{lead.state}
                  </span>
                )}
                {lead.phone && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Phone className="h-3 w-3" />{lead.phone}
                  </span>
                )}
                {!lead.phone && (
                  <span className="text-muted-foreground/50">No phone either</span>
                )}
              </div>
            </div>

            {/* Research button */}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 shrink-0"
              onClick={() => handleEnrichContact(lead)}
              disabled={enrichingId === lead.id}
            >
              {enrichingId === lead.id
                ? <><Loader2 className="h-3 w-3 animate-spin" /> Researching…</>
                : <><Sparkles className="h-3 w-3" /> Find Email</>
              }
            </Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center pb-2">
        Once an email is found, the lead moves back to Lead Generator and you can send the verification questionnaire.
      </p>
    </div>
  );
}
