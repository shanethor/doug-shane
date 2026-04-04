import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/* ── Types ── */
export type EngineLead = {
  id: string;
  owner_user_id: string;
  company: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  industry: string | null;
  est_premium: number;
  signal: string | null;
  source: string;
  source_url: string | null;
  score: number;
  tier: number;
  status: string;
  assigned_to: string | null;
  action: string | null;
  lead_id: string | null;
  batch_id: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
};

export type EngineActivity = {
  id: string;
  user_id: string;
  engine_lead_id: string | null;
  activity_type: string;
  description: string;
  source: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LeadSourceConfig = {
  id: string;
  user_id: string;
  source: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

/* ── Tier Summary ── */
export function useEngineTierSummary() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["engine-tier-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engine_leads")
        .select("tier")
        .eq("owner_user_id", user!.id);
      if (error) throw error;
      const counts = { 1: 0, 2: 0, 3: 0 };
      (data || []).forEach((r: { tier: number }) => {
        if (r.tier in counts) counts[r.tier as 1 | 2 | 3]++;
      });
      return counts;
    },
  });
}

/* ── Hot Leads (Tier 1) ── */
export function useEngineLeads(tier?: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["engine-leads", user?.id, tier],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("engine_leads")
        .select("*")
        .order("detected_at", { ascending: false });
      if (tier) q = q.eq("tier", tier);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as EngineLead[];
    },
  });
}

/* ── Recent Activity ── */
export function useEngineActivity(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["engine-activity", user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("engine_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as EngineActivity[];
    },
  });
}

/* ── Source Configs (Monitoring) ── */
export function useLeadSourceConfigs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["lead-source-configs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_source_configs")
        .select("*")
        .order("source");
      if (error) throw error;
      return (data || []) as LeadSourceConfig[];
    },
  });
}

/* ── KPIs (computed from engine_leads + leads/policies) ── */
export function useEngineKpis() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["engine-kpis", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const { count: totalLeads } = await supabase
        .from("engine_leads")
        .select("*", { count: "exact", head: true })
        .gte("detected_at", thirtyDaysAgo);

      const { data: bySource } = await supabase
        .from("engine_leads")
        .select("source, tier")
        .gte("detected_at", thirtyDaysAgo);

      // Source breakdown
      const sourceMap: Record<string, { leads: number; tier1: number }> = {};
      (bySource || []).forEach((r: { source: string; tier: number }) => {
        if (!sourceMap[r.source]) sourceMap[r.source] = { leads: 0, tier1: 0 };
        sourceMap[r.source].leads++;
        if (r.tier === 1) sourceMap[r.source].tier1++;
      });

      // Converted = status is 'converted' or has a lead_id
      const { count: converted } = await supabase
        .from("engine_leads")
        .select("*", { count: "exact", head: true })
        .gte("detected_at", thirtyDaysAgo)
        .eq("status", "converted");

      return {
        totalLeads: totalLeads || 0,
        converted: converted || 0,
        sourceBreakdown: Object.entries(sourceMap).map(([source, v]) => ({
          source,
          leads: v.leads,
          tier1: v.tier1,
        })),
      };
    },
  });
}

/* ── Mutations ── */
export function useCreateEngineLead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (lead: Partial<EngineLead>) => {
      const { data, error } = await supabase
        .from("engine_leads")
        .insert({ ...lead, owner_user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-leads"] });
      qc.invalidateQueries({ queryKey: ["engine-tier-summary"] });
      qc.invalidateQueries({ queryKey: ["engine-kpis"] });
    },
  });
}

export function useUpdateEngineLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EngineLead> & { id: string }) => {
      const { data, error } = await supabase
        .from("engine_leads")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-leads"] });
      qc.invalidateQueries({ queryKey: ["engine-tier-summary"] });
      qc.invalidateQueries({ queryKey: ["engine-kpis"] });
    },
  });
}

export function useLogEngineActivity() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (activity: Omit<EngineActivity, "id" | "user_id" | "created_at">) => {
      const { data, error } = await supabase
        .from("engine_activity")
        .insert({ ...activity, user_id: user!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-activity"] });
    },
  });
}

export function useUpsertSourceConfig() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (config: { source: string; is_active: boolean; settings?: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("lead_source_configs")
        .upsert(
          { ...config, user_id: user!.id, updated_at: new Date().toISOString() } as any,
          { onConflict: "user_id,source" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-source-configs"] });
    },
  });
}

/* ── Convert to Pipeline Lead ── */
export function useConvertToPipeline() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (engineLead: EngineLead) => {
      // Create a real pipeline lead
      const { data: newLead, error: leadErr } = await supabase
        .from("leads")
        .insert({
          account_name: engineLead.company,
          contact_name: engineLead.contact_name,
          email: engineLead.email,
          phone: engineLead.phone,
          state: engineLead.state,
          business_type: engineLead.industry,
          target_premium: engineLead.est_premium || null,
          lead_source: `Lead Engine – ${engineLead.source}`,
          owner_user_id: user!.id,
          stage: "prospect" as const,
          line_type: "commercial",
        })
        .select()
        .single();
      if (leadErr) throw leadErr;

      // Link the engine lead
      const { error: updateErr } = await supabase
        .from("engine_leads")
        .update({ status: "converted", lead_id: newLead.id } as any)
        .eq("id", engineLead.id);
      if (updateErr) throw updateErr;

      return newLead;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-leads"] });
      qc.invalidateQueries({ queryKey: ["engine-tier-summary"] });
      qc.invalidateQueries({ queryKey: ["engine-kpis"] });
    },
  });
}

/* ── Delete / Dismiss engine lead ── */
export function useDeleteEngineLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("engine_leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-leads"] });
      qc.invalidateQueries({ queryKey: ["engine-tier-summary"] });
      qc.invalidateQueries({ queryKey: ["engine-kpis"] });
    },
  });
}

/* ── Scan a source (Reddit / Business Filings) ── */
export function useScanSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ source, settings }: { source: string; settings: Record<string, unknown> }) => {
      const { data, error } = await supabase.functions.invoke("lead-engine-scan", {
        body: { source, settings },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { success: boolean; leads_found: number; message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["engine-leads"] });
      qc.invalidateQueries({ queryKey: ["engine-tier-summary"] });
      qc.invalidateQueries({ queryKey: ["engine-kpis"] });
      qc.invalidateQueries({ queryKey: ["engine-activity"] });
      qc.invalidateQueries({ queryKey: ["lead-source-configs"] });
    },
  });
}
