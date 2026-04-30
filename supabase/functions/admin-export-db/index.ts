import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

const TABLES = ["sage_conversations","unreached_leads","marketplace_access_requests","purchased_leads","social_profiles","social_posts","contact_merge_queue","relationship_health_checks","studio_requests","clark_profiles","clark_submissions","marketing_flyers","user_consent_records","manager_producer_assignments","enrichment_api_logs","branding_packages","insurance_applications","engine_activity","contact_sharing_settings","intro_email_drafts","policy_documents","feeder_list_prospects","leads","privacy_requests","acord_field_corrections","company_profiles","network_contacts","email_drafts","customer_submissions","acord_extraction_runs","ai_error_logs","email_connections","concierge_requests","intake_links","lead_ratings","touch_history","design_creations","prospect_profiles","beta_todos","beta_messages","booking_links","connect_referrals","network_connections","two_factor_codes","personal_intake_submissions","loss_run_requests","generated_leads","agencies","connect_proposals","lead_claims","audit_log","carriers","quote_documents","client_service_assignments","feeder_lists","producer_goals","field_overrides","lead_notes","agency_network_overlaps","touch_cadence_contacts","canonical_persons","consent_versions","design_templates","outreach_feedback","partner_requests","industry_requests","feature_suggestions","profiles","email_discovered_contacts","loss_run_policy_items","relationship_edges","policies","engine_leads","loss_run_attachments","client_service_clients","concierge_files","user_elo","synced_emails","business_submissions","customer_links","data_visibility_settings","support_tickets","contact_social_profiles","booked_meetings","concierge_subscriptions","client_documents","notifications","generated_forms","user_roles","icloud_connections","intake_submissions","lead_data_sources","extraction_corrections","user_features","calendar_events","user_log_access","external_calendars","property_partner_links","contact_relationships","email_attachments","custom_form_templates","trusted_devices","email_signature_contacts","partner_tracker_tokens","lead_source_configs","lead_posts","connect_community_posts","support_ticket_messages","quote_requests","connect_post_likes","signal_items","signal_feedback","signal_preferences","signal_ingest_runs","signal_source_health","signal_image_queue"];

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const header = cols.join(",");
  const body = rows.map(r => cols.map(c => csvEscape(r[c])).join(",")).join("\n");
  return header + "\n" + body + "\n";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const table = url.searchParams.get("table");
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "5000", 10);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (table === "__list__") {
    return new Response(JSON.stringify({ tables: TABLES }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!table || !TABLES.includes(table)) {
    return new Response(JSON.stringify({ error: "invalid table" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const select = url.searchParams.get("select") ?? "*";
  const order = url.searchParams.get("order") ?? "";
  const noCount = url.searchParams.get("nocount") === "1";
  let q = noCount
    ? admin.from(table).select(select)
    : admin.from(table).select(select, { count: "exact" });
  if (order) q = q.order(order, { ascending: true });
  const { data, error, count } = await q.range(offset, offset + limit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const csv = toCsv(data ?? []);
  return new Response(JSON.stringify({
    table, offset, limit, returned: data?.length ?? 0, total: count ?? 0, csv,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});