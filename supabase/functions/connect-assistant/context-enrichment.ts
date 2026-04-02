import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export async function enrichContext(authHeader: string): Promise<any> {
  const enrichedContext: any = {};

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return enrichedContext;

    // Fetch pipeline
    const { data: leads } = await supabase
      .from("leads")
      .select("id, account_name, contact_name, email, stage, target_premium, lead_source, updated_at")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    const byStage: Record<string, number> = {};
    let totalValue = 0;
    (leads || []).forEach((l: any) => {
      byStage[l.stage] = (byStage[l.stage] || 0) + 1;
      totalValue += l.target_premium || 0;
    });

    enrichedContext.pipeline = {
      total: (leads || []).length,
      byStage,
      totalValue,
      leads: (leads || []).slice(0, 20),
    };

    // Fetch contacts
    const { data: contacts } = await supabase
      .from("canonical_persons")
      .select("id, display_name, primary_email, company, title, tier")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);

    enrichedContext.contacts = {
      total: (contacts || []).length,
      list: contacts || [],
    };

    // Fetch calendar events
    const { data: events } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, end_time, attendees, location, event_type")
      .eq("user_id", user.id)
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(20);

    enrichedContext.calendar = {
      total: (events || []).length,
      events: events || [],
    };

    // Fetch email stats
    const { data: emails, count } = await supabase
      .from("synced_emails")
      .select("id, subject, from_name, from_address, is_read, received_at", { count: "exact" })
      .eq("user_id", user.id)
      .order("received_at", { ascending: false })
      .limit(10);

    const unreadCount = (emails || []).filter((e: any) => !e.is_read).length;
    enrichedContext.email = {
      total: count || 0,
      unread: unreadCount,
      recent: (emails || []).slice(0, 5),
    };

    // Fetch branding packages
    const { data: branding } = await supabase
      .from("branding_packages")
      .select("id, name, brand_name, brand_colors, tagline, tone, industry")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .limit(5);

    enrichedContext.branding = {
      list: branding || [],
    };

    // Fetch user's connect vertical
    const { data: profile } = await supabase
      .from("profiles")
      .select("connect_vertical, industry, specializations")
      .eq("user_id", user.id)
      .single();

    enrichedContext.userVertical = {
      connectVertical: (profile as any)?.connect_vertical || null,
      industry: profile?.industry || null,
      specializations: (profile as any)?.specializations || [],
    };
  } catch (e) {
    console.error("Context enrichment failed (non-fatal):", e);
  }

  return enrichedContext;
}
