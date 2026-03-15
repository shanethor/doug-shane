import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface LossRunReminder {
  id: string;
  submissionId: string;
  name: string;
  expirationDate: string;
  daysUntil: number;
}

const DISMISSED_KEY = "loss_run_reminders_dismissed";

export function useLossRunReminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<LossRunReminder[]>([]);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === "true");

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const today = new Date();
      const in90 = new Date(today);
      in90.setDate(today.getDate() + 90);

      // Get all insurance applications for this user
      const { data: apps } = await supabase
        .from("insurance_applications")
        .select("id, submission_id, form_data")
        .eq("user_id", user.id);

      if (!apps || apps.length === 0) return;

      const expiring: { id: string; submissionId: string; name: string; expDate: Date }[] = [];

      for (const app of apps) {
        const fd = (app.form_data || {}) as Record<string, any>;
        const expDateStr = fd.proposedexpdate || fd.expirationdate;
        if (!expDateStr) continue;
        const d = new Date(expDateStr);
        if (isNaN(d.getTime())) continue;
        if (d >= today && d <= in90) {
          expiring.push({
            id: app.id,
            submissionId: app.submission_id || app.id,
            name: fd.applicantname || fd.insuredname || "Unknown Client",
            expDate: d,
          });
        }
      }

      if (expiring.length === 0) {
        setReminders([]);
        return;
      }

      // Check which ones have NO loss run request
      const subIds = expiring.map((e) => e.submissionId).filter(Boolean);
      const { data: existing } = await supabase
        .from("loss_run_requests")
        .select("submission_id")
        .in("submission_id", subIds)
        .neq("status", "cancelled" as any);

      const coveredIds = new Set((existing || []).map((r: any) => r.submission_id));

      const needs = expiring
        .filter((e) => !coveredIds.has(e.submissionId))
        .map((e) => ({
          id: e.id,
          submissionId: e.submissionId,
          name: e.name,
          expirationDate: e.expDate.toLocaleDateString(),
          daysUntil: Math.ceil((e.expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        }));

      setReminders(needs);
    };

    check();
  }, [user]);

  const dismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(DISMISSED_KEY, "true");
  };

  return { reminders, dismissed, dismiss, count: reminders.length };
}
