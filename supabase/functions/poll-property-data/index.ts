import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATE_FIPS: Record<string, string> = {
  CT: "09", NY: "36", MA: "25", NJ: "34", RI: "44",
};

const BOROUGH_NAMES: Record<string, string> = {
  "1": "Manhattan", "2": "Bronx", "3": "Brooklyn", "4": "Queens", "5": "Staten Island",
};

async function pollCT(limit = 200): Promise<any[]> {
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const url = `https://data.ct.gov/resource/5mzw-sjtu.json?$where=date_recorded>'${yesterday}'&$limit=${limit}&$order=date_recorded DESC`;
  const res = await fetch(url);
  if (!res.ok) { console.error("[poll-ct] fetch failed:", res.status); return []; }
  const sales = await res.json();
  return sales.map((s: any) => ({
    source: "CT Property Transfers",
    state: "CT",
    company: `${s.address || "Property"}, ${s.town || "CT"}`,
    contact_name: null,
    industry: "Home Insurance",
    signal: `New property transfer in ${s.town || "CT"} — sale amount $${Number(s.sale_amount || 0).toLocaleString()}`,
    est_premium: Math.round(Math.max(1200, (Number(s.sale_amount) || 250000) * 0.005)),
    trigger_type: "new_purchase",
  }));
}

async function pollNYCACRIS(limit = 50): Promise<any[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const masterUrl = `https://data.cityofnewyork.us/resource/8h5j-fqxa.json?$where=doc_type='DEED' AND document_date>'${sevenDaysAgo}'&$limit=${limit}&$order=document_date DESC`;
  const masters = await (await fetch(masterUrl)).json();
  if (!Array.isArray(masters)) return [];

  const leads: any[] = [];
  for (const m of masters.slice(0, Math.min(limit, 30))) {
    try {
      const legalUrl = `https://data.cityofnewyork.us/resource/uqqa-hyyf.json?document_id=${m.document_id}&$limit=1`;
      const legals = await (await fetch(legalUrl)).json();
      const legal = Array.isArray(legals) ? legals[0] : null;
      const borough = BOROUGH_NAMES[String(legal?.borough || m.recorded_borough)] || "NYC";
      leads.push({
        source: "NYC ACRIS",
        state: "NY",
        company: legal?.address ? `${legal.address}, ${borough}` : `BBL ${legal?.block || ""}/${legal?.lot || ""}, ${borough}`,
        contact_name: null,
        industry: "Home Insurance",
        signal: `New deed recorded in ${borough} on ${m.document_date?.split("T")[0] || "recent"}`,
        est_premium: Math.round(2000 + Math.random() * 3000),
        trigger_type: "new_purchase",
      });
    } catch (e) {
      console.warn("[poll-nyc] Error joining legal:", e);
    }
  }
  return leads;
}

async function pollMassGIS(towns: string[] = ["BOSTON", "CAMBRIDGE"], limit = 100): Promise<any[]> {
  const leads: any[] = [];
  for (const town of towns.slice(0, 3)) {
    try {
      const url = `https://gis.massgis.state.ma.us/arcgis/rest/services/MASSGIS_DATA_PARCELS/MapServer/0/query?where=TOWN='${town}'&outFields=OWNER1,LOC,TOTAL_VAL,YEAR_BUILT,USE_CODE&f=json&resultRecordCount=${limit}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const f of (data.features || []).slice(0, 20)) {
        const a = f.attributes || {};
        if (!["1010", "1020", "1040"].includes(String(a.USE_CODE))) continue;
        leads.push({
          source: "MassGIS Parcels",
          state: "MA",
          company: `${a.LOC || "Property"}, ${town}`,
          contact_name: a.OWNER1 || null,
          industry: "Home Insurance",
          signal: `MA property — ${town}, valued at $${Number(a.TOTAL_VAL || 0).toLocaleString()}, built ${a.YEAR_BUILT || "N/A"}`,
          est_premium: Math.round(Math.max(1500, (Number(a.TOTAL_VAL) || 400000) * 0.004)),
          trigger_type: "ownership_data",
        });
      }
    } catch (e) {
      console.warn(`[poll-massgis] Error for ${town}:`, e);
    }
  }
  return leads;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Get active data sources from config table
    const { data: sources } = await adminClient
      .from("lead_data_sources")
      .select("*")
      .eq("active", true);

    const activeStates = new Set((sources || []).map((s: any) => s.state));
    console.log(`[poll-property-data] Active states: ${[...activeStates].join(", ")}`);

    const results: { state: string; source: string; count: number }[] = [];

    // Poll each active state
    const polls = [];
    if (activeStates.has("CT")) polls.push(pollCT().then(leads => ({ state: "CT", source: "CT Property Transfers", leads })));
    if (activeStates.has("NY")) polls.push(pollNYCACRIS().then(leads => ({ state: "NY", source: "NYC ACRIS", leads })));
    if (activeStates.has("MA")) {
      const maTowns = (sources || []).find((s: any) => s.state === "MA" && s.source_name === "massgis_parcels");
      polls.push(pollMassGIS(maTowns?.notes?.includes("towns:") ? [] : ["BOSTON", "CAMBRIDGE"]).then(leads => ({ state: "MA", source: "MassGIS Parcels", leads })));
    }

    const pollResults = await Promise.allSettled(polls);
    const allLeads: any[] = [];

    for (const result of pollResults) {
      if (result.status === "fulfilled") {
        const { state, source, leads } = result.value;
        allLeads.push(...leads);
        results.push({ state, source, count: leads.length });
        console.log(`[poll-property-data] ${source}: ${leads.length} leads`);
      } else {
        console.error("[poll-property-data] Poll failed:", result.reason);
      }
    }

    // Insert leads — find a user to attribute to (first admin or first user with lead engine configs)
    if (allLeads.length > 0) {
      const { data: configs } = await adminClient
        .from("lead_source_configs")
        .select("user_id")
        .eq("is_active", true)
        .limit(1);

      const userId = configs?.[0]?.user_id;
      if (userId) {
        const leadsToInsert = allLeads.map(l => ({
          owner_user_id: userId,
          company: l.company,
          contact_name: l.contact_name,
          industry: l.industry,
          state: l.state,
          est_premium: l.est_premium,
          signal: l.signal,
          source: l.source,
          score: Math.floor(65 + Math.random() * 25),
          tier: 1,
          status: "new",
          trigger_type: l.trigger_type,
        }));

        const { error: insertErr } = await adminClient
          .from("engine_leads")
          .insert(leadsToInsert);

        if (insertErr) console.error("[poll-property-data] Insert error:", insertErr);
        else console.log(`[poll-property-data] Inserted ${leadsToInsert.length} leads`);

        // Update last_sync_at on source configs
        for (const r of results) {
          await adminClient.from("lead_source_configs")
            .update({ last_sync_at: new Date().toISOString() })
            .eq("source", r.source)
            .eq("user_id", userId);
        }
      } else {
        console.warn("[poll-property-data] No active user found for lead attribution");
      }
    }

    return new Response(JSON.stringify({
      success: true,
      results,
      total_leads: allLeads.length,
      message: `Polled ${results.length} state sources, found ${allLeads.length} leads`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[poll-property-data] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
