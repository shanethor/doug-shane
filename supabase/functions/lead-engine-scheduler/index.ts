import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Per-source scan intervals in minutes
const SCAN_INTERVALS: Record<string, number> = {
  Reddit: 60,
  LinkedIn: 120,
  "Business Filings": 1440,
  "Permit Database": 1440,
  "FEMA Flood Zones": 1440,
  "NOAA Storm Events": 720,
  "Census / ACS Data": 10080,
  "NHTSA Vehicles": 1440,
  "OpenFEMA NFIP": 1440,
  "HUD Housing Data": 10080,
  "Property Records": 1440,
  "Building Permits": 1440,
  "Tax Delinquency": 10080,
  "Google Trends": 360,
  "ATTOM Data": 1440,
  "RentCast": 1440,
  "Regrid Parcels": 1440,
  "BatchData": 1440,
  "FL Citizens Non-Renewal": 10080,
  "State Socrata Portals": 1440,
  "County ArcGIS": 1440,
  "CT Property Transfers": 1440,
  "NYC ACRIS": 1440,
  "MassGIS Parcels": 10080,
  "NJ MOD-IV / Sales": 10080,
  "RI Coastal (FEMA)": 10080,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // This function can be called:
    // 1. By a cron job (no auth needed, uses service role)
    // 2. By a user to trigger a check (auth required)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Find all active source configs that are due for scanning
    const { data: configs, error: cfgErr } = await adminClient
      .from("lead_source_configs")
      .select("*")
      .eq("is_active", true);

    if (cfgErr) {
      console.error("[scheduler] Error fetching configs:", cfgErr);
      throw cfgErr;
    }

    if (!configs || configs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active sources to scan", scanned: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = Date.now();
    const scanned: string[] = [];
    const skipped: string[] = [];

    for (const cfg of configs) {
      const interval = SCAN_INTERVALS[cfg.source] || 1440;
      const lastSync = cfg.last_sync_at ? new Date(cfg.last_sync_at).getTime() : 0;
      const minutesSinceLast = (now - lastSync) / 60000;

      if (minutesSinceLast < interval) {
        skipped.push(`${cfg.source} (${Math.round(interval - minutesSinceLast)}m remaining)`);
        continue;
      }

      console.log(`[scheduler] Scanning ${cfg.source} for user ${cfg.user_id}`);

      // Call the scan function internally
      try {
        // Get a valid token for this user by using service role to invoke the scan
        const scanResp = await fetch(`${SUPABASE_URL}/functions/v1/lead-engine-scan`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: cfg.source,
            settings: cfg.settings || {},
            // Pass user_id so scan function can attribute leads
            _scheduler_user_id: cfg.user_id,
          }),
        });

        const result = await scanResp.json();
        if (result.success) {
          scanned.push(`${cfg.source}: ${result.leads_found} leads`);
        } else {
          console.error(`[scheduler] Scan failed for ${cfg.source}:`, result.error);
          scanned.push(`${cfg.source}: error - ${result.error}`);
        }
      } catch (e) {
        console.error(`[scheduler] Error scanning ${cfg.source}:`, e);
        scanned.push(`${cfg.source}: error`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      scanned,
      skipped,
      message: `Processed ${scanned.length} sources, skipped ${skipped.length}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[scheduler] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
