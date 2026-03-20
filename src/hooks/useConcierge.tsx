import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ConciergeRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ConciergeSubscription {
  id: string;
  user_id: string;
  subscription_status: string;
  trial_start_at: string | null;
  trial_end_at: string | null;
  max_active_requests: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "web_tool", label: "Custom Web Tool / Landing Page" },
  { value: "dashboard", label: "Marketing Dashboard / Reporting" },
  { value: "design", label: "Design & Template" },
  { value: "sales_assets", label: "Sales System / Coaching Asset" },
  { value: "process_automation", label: "Process & Automation Build" },
  { value: "other", label: "Other" },
] as const;

const STATUS_ORDER = ["queued", "in_progress", "needs_info", "completed", "archived"] as const;

export { CATEGORIES, STATUS_ORDER };

export function useConcierge() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ConciergeRequest[]>([]);
  const [subscription, setSubscription] = useState<ConciergeSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [reqRes, subRes] = await Promise.all([
      supabase.from("concierge_requests" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("concierge_subscriptions" as any).select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    setRequests((reqRes.data as any) ?? []);
    setSubscription((subRes.data as any) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activeCount = requests.filter(
    (r) => r.status === "queued" || r.status === "in_progress" || r.status === "needs_info"
  ).length;

  const maxActive = subscription?.max_active_requests ?? 2;

  const isTrialActive = subscription?.subscription_status === "trial_active" &&
    subscription.trial_end_at && new Date(subscription.trial_end_at) > new Date();

  const isPaid = subscription?.subscription_status === "active";
  const isLocked = !isTrialActive && !isPaid;

  const trialDaysLeft = subscription?.trial_end_at
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end_at).getTime() - Date.now()) / 86400000))
    : 0;

  const startTrial = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const trialEnd = new Date(Date.now() + 7 * 86400000).toISOString();
    const { error } = await (supabase.from("concierge_subscriptions" as any) as any).upsert({
      user_id: user.id,
      subscription_status: "trial_active",
      trial_start_at: now,
      trial_end_at: trialEnd,
      max_active_requests: 2,
    }, { onConflict: "user_id" });
    if (!error) await fetchAll();
    return error;
  }, [user, fetchAll]);

  const createRequest = useCallback(async (data: { title: string; description: string; category: string }) => {
    if (!user) return { error: "Not authenticated" };
    if (isLocked) return { error: "Concierge subscription required" };
    if (activeCount >= maxActive) return { error: `Maximum ${maxActive} active requests reached` };
    const { error } = await (supabase.from("concierge_requests" as any) as any).insert({
      user_id: user.id,
      ...data,
    });
    if (!error) await fetchAll();
    return { error: error?.message || null };
  }, [user, isLocked, activeCount, maxActive, fetchAll]);

  return {
    requests,
    subscription,
    loading,
    activeCount,
    maxActive,
    isTrialActive,
    isPaid,
    isLocked,
    trialDaysLeft,
    startTrial,
    createRequest,
    refresh: fetchAll,
  };
}
