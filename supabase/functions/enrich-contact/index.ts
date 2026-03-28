import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Waterfall: Serper → Apollo → PDL → Anymail/Findymail → The Org ───

async function serperLinkedInLookup(name: string, company: string): Promise<string | null> {
  const key = Deno.env.get("SERPER_API_KEY");
  if (!key) return null;
  try {
    const resp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${name} ${company} site:linkedin.com/in`, num: 3 }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const organic = data.organic || [];
    for (const r of organic) {
      const link = r.link || "";
      if (link.includes("linkedin.com/in/")) return link;
    }
    return null;
  } catch (e) {
    console.error("Serper lookup error:", e);
    return null;
  }
}

async function apolloEnrich(email: string, linkedinUrl: string | null, adminClient: any, userId: string) {
  const key = Deno.env.get("APOLLO_API_KEY");
  if (!key) return null;
  try {
    const body: any = { email, reveal_phone_number: true, reveal_personal_emails: true };
    if (linkedinUrl) body.linkedin_url = linkedinUrl;

    const resp = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    const p = d.person;
    if (!p) return null;

    await adminClient.from("enrichment_api_logs").insert({
      user_id: userId, provider: "apollo", endpoint: "people/match",
      credits_consumed: 1, response_status: 200,
    }).catch(() => {});

    return {
      source: "apollo",
      apollo_data: p,
      hunter_position: p.title || null,
      hunter_company: p.organization?.name || null,
      hunter_linkedin_url: p.linkedin_url || null,
      profile_photo_url: p.photo_url || null,
      location: [p.city, p.state, p.country].filter(Boolean).join(", ") || null,
      hunter_phone: p.phone_numbers?.[0]?.sanitized_number || p.phone_numbers?.[0]?.raw_number || null,
      twitter_url: p.twitter_url || null,
      employment_history: p.employment_history?.slice(0, 3) || null,
      first_name: p.first_name || null,
      last_name: p.last_name || null,
      display_name: p.name || null,
    };
  } catch (e) {
    console.error("Apollo error:", e);
    return null;
  }
}

async function pdlEnrich(email: string, adminClient: any, userId: string) {
  const key = Deno.env.get("PDL_API_KEY");
  if (!key) return null;
  try {
    const url = new URL("https://api.peopledatalabs.com/v5/person/enrich");
    url.searchParams.set("email", email);
    url.searchParams.set("min_likelihood", "5");

    const resp = await fetch(url.toString(), { headers: { "X-Api-Key": key } });
    if (!resp.ok) return null;
    const d = await resp.json();
    const p = d.data || d;
    if (!p?.full_name) return null;

    await adminClient.from("enrichment_api_logs").insert({
      user_id: userId, provider: "pdl", endpoint: "person/enrich",
      credits_consumed: 1, response_status: 200,
    }).catch(() => {});

    return {
      source: "pdl",
      enrichment_data: p,
      hunter_position: p.job_title || null,
      hunter_company: p.job_company_name || null,
      hunter_linkedin_url: p.linkedin_url || null,
      twitter_url: p.twitter_url || null,
      location: [p.location_locality, p.location_region, p.location_country].filter(Boolean).join(", ") || null,
      hunter_phone: p.phone_numbers?.[0] || null,
      employment_history: p.experience?.slice(0, 3) || null,
      first_name: p.first_name || null,
      last_name: p.last_name || null,
      display_name: p.full_name || null,
    };
  } catch (e) {
    console.error("PDL error:", e);
    return null;
  }
}

async function anymailFindEmail(name: string, domain: string): Promise<string | null> {
  const key = Deno.env.get("ANYMAIL_API_KEY");
  if (!key || !domain) return null;
  try {
    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.join(" ");
    const url = `https://api.anymailfinder.com/v5.0/search/person.json`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, domain }),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    return d.email || null;
  } catch { return null; }
}

async function findymailFindEmail(name: string, domain: string): Promise<string | null> {
  const key = Deno.env.get("FINDYMAIL_API_KEY");
  if (!key || !domain) return null;
  try {
    const [firstName, ...rest] = name.split(" ");
    const lastName = rest.join(" ");
    const resp = await fetch("https://app.findymail.com/api/search/mail", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, domain }),
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    return d.email || d.contact?.email || null;
  } catch { return null; }
}

async function theOrgLookup(company: string): Promise<any | null> {
  const key = Deno.env.get("THEORG_API_KEY");
  if (!key || !company) return null;
  try {
    const resp = await fetch(`https://api.theorg.com/v1/companies/search?q=${encodeURIComponent(company)}&limit=1`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!resp.ok) return null;
    const d = await resp.json();
    const co = d.data?.[0] || d.results?.[0];
    if (!co) return null;
    // Fetch org chart if company found
    const chartResp = await fetch(`https://api.theorg.com/v1/companies/${co.slug || co.id}/chart`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!chartResp.ok) return { company_name: co.name, org_chart: null };
    const chart = await chartResp.json();
    return { company_name: co.name, headcount: co.headcount, org_chart: chart.data?.slice(0, 10) || null };
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { contact_id } = await req.json();
    if (!contact_id) {
      return new Response(JSON.stringify({ error: "contact_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try email_discovered_contacts first, then network_contacts
    let contact: any = null;
    let contactTable = "email_discovered_contacts";

    const { data: emailContact } = await adminClient
      .from("email_discovered_contacts")
      .select("*")
      .eq("id", contact_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (emailContact) {
      contact = emailContact;
    } else {
      // Fallback: check network_contacts
      const { data: netContact } = await adminClient
        .from("network_contacts")
        .select("id, full_name, email, phone, company, title, linkedin_url")
        .eq("id", contact_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (netContact) {
        contactTable = "network_contacts";
        contact = {
          email_address: netContact.email || "",
          display_name: netContact.full_name || "",
          domain: netContact.email ? netContact.email.split("@")[1] : "",
          hunter_company: netContact.company || null,
        };
      }
    }

    if (!contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = contact.email_address;
    const displayName = contact.display_name || "";
    const domain = contact.domain || email.split("@")[1] || "";
    const updates: any = { last_enriched_at: new Date().toISOString() };
    let enriched = false;
    const sources: string[] = [];

    // ── Step 1: Serper pre-enrichment (find LinkedIn URL cheaply) ──
    let linkedinUrl: string | null = null;
    if (displayName && domain) {
      linkedinUrl = await serperLinkedInLookup(displayName, domain);
      if (linkedinUrl) {
        updates.hunter_linkedin_url = linkedinUrl;
        sources.push("serper");
      }
    }

    // ── Step 2: Apollo (primary enrichment, with pre-resolved LinkedIn) ──
    const apolloResult = await apolloEnrich(email, linkedinUrl, adminClient, user.id);
    if (apolloResult) {
      const { source, ...fields } = apolloResult;
      Object.entries(fields).forEach(([k, v]) => { if (v) updates[k] = v; });
      enriched = true;
      sources.push("apollo");
    }

    // ── Step 3: PDL fallback ──
    if (!enriched) {
      const pdlResult = await pdlEnrich(email, adminClient, user.id);
      if (pdlResult) {
        const { source, ...fields } = pdlResult;
        Object.entries(fields).forEach(([k, v]) => { if (v) updates[k] = v; });
        enriched = true;
        sources.push("pdl");
      }
    }

    // ── Step 4: Anymail → Findymail email fallback (if we have name but no verified email) ──
    if (displayName && domain && !enriched) {
      const altEmail = await anymailFindEmail(displayName, domain);
      if (altEmail) {
        sources.push("anymail");
      } else {
        const fmEmail = await findymailFindEmail(displayName, domain);
        if (fmEmail) sources.push("findymail");
      }
    }

    // ── Step 5: The Org API (org chart context) ──
    const company = updates.hunter_company || contact.hunter_company;
    if (company) {
      const orgData = await theOrgLookup(company);
      if (orgData) {
        updates.org_chart_data = orgData;
        sources.push("theorg");
      }
    }

    updates.enrichment_source = sources.join("+") || null;
    updates.enrichment_status = enriched ? "fully_enriched" : "enrichment_failed";

    if (contactTable === "email_discovered_contacts") {
      await adminClient
        .from("email_discovered_contacts")
        .update(updates)
        .eq("id", contact_id);
    }
    // For network_contacts, we don't update enrichment fields (different schema)

    return new Response(JSON.stringify({
      success: true, enriched, sources,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("enrich-contact error:", err);
    return new Response(JSON.stringify({ error: "Enrichment failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
