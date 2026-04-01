import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */
export type LeadPost = {
  id: string;
  owner_user_id: string;
  title: string;
  description: string;
  lead_type: string;
  estimated_value: number;
  referral_offer_type: string;
  referral_offer_value: number;
  status: string;
  elo_min: number | null;
  elo_max: number | null;
  preferred_industries: string[];
  preferred_states: string[];
  created_at: string;
  updated_at: string;
  owner_name?: string;
  owner_elo?: number;
};

export type LeadClaim = {
  id: string;
  lead_post_id: string;
  claimer_user_id: string;
  status: string;
  notes: string;
  created_at: string;
  claimer_name?: string;
  claimer_elo?: number;
};

export type UserElo = {
  user_id: string;
  elo_rating: number;
  reliability_score: number;
  deals_completed: number;
  positive_ratings: number;
  negative_ratings: number;
};

export type GeneratedLead = {
  id: string;
  user_id: string;
  source: string;
  company_name: string;
  website: string;
  location: string;
  firmographics: Record<string, any>;
  contacts: any[];
  fit_score: number;
  intent_score: number | null;
  raw_source_links: string[];
  status: string;
  vertical_tags: string[];
  created_at: string;
};

export type CompanyProfile = {
  id: string;
  user_id: string;
  company_name: string;
  industry: string;
  icp_description: string;
  target_geos: string[];
  typical_deal_size: string;
  revenue_range: string;
  target_buyer_titles: string[];
  website_urls: string[];
  extracted_profile: Record<string, any>;
  vertical_tags: string[];
};

/* ── Marketplace hooks ── */
export function useLeadPosts(status = "open") {
  return useQuery({
    queryKey: ["lead-posts", status],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_posts")
        .select("*")
        .eq("status", status)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LeadPost[];
    },
  });
}

export function useMyLeadPosts() {
  return useQuery({
    queryKey: ["my-lead-posts"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("lead_posts")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LeadPost[];
    },
  });
}

export function useCreateLeadPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (post: Partial<LeadPost>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("lead_posts")
        .insert({ ...post, owner_user_id: user.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-posts"] });
      qc.invalidateQueries({ queryKey: ["my-lead-posts"] });
    },
  });
}

export function useClaimLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lead_post_id, notes }: { lead_post_id: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("lead_claims")
        .insert({ lead_post_id, claimer_user_id: user.id, notes: notes || "" } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-claims"] });
    },
  });
}

export function useLeadClaims(leadPostId?: string) {
  return useQuery({
    queryKey: ["lead-claims", leadPostId],
    enabled: !!leadPostId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_claims")
        .select("*")
        .eq("lead_post_id", leadPostId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LeadClaim[];
    },
  });
}

export function useUpdateClaimStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ claimId, status }: { claimId: string; status: string }) => {
      const { error } = await supabase
        .from("lead_claims")
        .update({ status } as any)
        .eq("id", claimId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead-claims"] });
    },
  });
}

export function useMyElo() {
  return useQuery({
    queryKey: ["my-elo"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("user_elo")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as UserElo | null;
    },
  });
}

export function useEnsureElo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("user_elo")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!existing) {
        await supabase.from("user_elo").insert({ user_id: user.id } as any);
      }
      qc.invalidateQueries({ queryKey: ["my-elo"] });
    },
  });
}

/* ── Generator hooks ── */
export function useCompanyProfile() {
  return useQuery({
    queryKey: ["company-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyProfile | null;
    },
  });
}

export function useUpsertCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profile: Partial<CompanyProfile>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("company_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("company_profiles")
          .update(profile as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_profiles")
          .insert({ ...profile, user_id: user.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-profile"] });
    },
  });
}

export function useGeneratedLeads() {
  return useQuery({
    queryKey: ["generated-leads"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from("generated_leads")
        .select("*")
        .eq("user_id", user.id)
        .order("fit_score", { ascending: false });
      if (error) throw error;
      return (data || []) as GeneratedLead[];
    },
  });
}

export function useUpdateGeneratedLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("generated_leads")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generated-leads"] });
    },
  });
}

export function useDeleteGeneratedLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("generated_leads")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["generated-leads"] });
    },
  });
}

/* ── AURA Rating helpers (0-100 scale, start at 70) ── */
export function getEloBadge(rating: number): { label: string; color: string } {
  if (rating >= 95) return { label: "Elite", color: "text-cyan-400" };
  if (rating >= 85) return { label: "Trusted", color: "text-violet-400" };
  if (rating >= 75) return { label: "Proven", color: "text-amber-400" };
  if (rating >= 60) return { label: "Rising", color: "text-slate-300" };
  return { label: "New", color: "text-orange-400" };
}
