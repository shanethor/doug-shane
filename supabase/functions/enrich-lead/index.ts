import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Enrichment helpers ───

async function serperSearch(company: string, state: string | null): Promise<{ contact_name?: string; email?: string; phone?: string; linkedin_url?: string } | null> {
  const key = Deno.env.get("SERPER_API_KEY");
  if (!key) return null;
  try {
    const q = `${company} ${state || ""} owner contact email`;
    const resp = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num: 5 }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    // Try to find LinkedIn profile
    let linkedin_url: string | null = null;
    for (const r of (data.organic || [])) {
      if (r.link?.includes("linkedin.com/in/")) {
        linkedin_url = r.link;
        break;
      }
    }

    // Extract contact info from knowledge graph or snippets
    const kg = data.knowledgeGraph || {};
    const phone = kg.phoneNumber || null;
    const email = kg.email || null;

    return { linkedin_url: linkedin_url || undefined, phone, email };
  } catch { return null; }
}

async function apolloCompanySearch(company: string, state: string | null, industry: string | null): Promise<{ contact_name?: string; email?: string; phone?: string; title?: string } | null> {
  const key = Deno.env.get("APOLLO_API_KEY");
  if (!key) return null;
  try {
    // Search for the company and find a decision maker
    const resp = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({
        q_organization_name: company,
        person_seniorities: ["owner", "founder", "c_suite", "vp", "director"],
        page: 1,
        per_page: 3,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const people = data.people || [];
    if (people.length === 0) return null;

    const best = people[0];
    return {
      contact_name: best.name || `${best.first_name || ""} ${best.last_name || ""}`.trim() || undefined,
      email: best.email || undefined,
      phone: best.phone_numbers?.[0]?.sanitized_number || undefined,
      title: best.title || undefined,
    };
  } catch { return null; }
}

async function pdlCompanySearch(company: string): Promise<{ contact_name?: string; email?: string; phone?: string } | null> {
  const key = Deno.env.get("PDL_API_KEY");
  if (!key) return null;
  try {
    const resp = await fetch(`https://api.peopledatalabs.com/v5/person/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": key },
      body: JSON.stringify({
        query: {
          bool: {
            must: [
              { match: { job_company_name: company } },
              { terms: { job_title_levels: ["owner", "cxo", "director", "vp"] } },
            ],
          },
        },
        size: 1,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const person = data.data?.[0];
    if (!person) return null;
    return {
      contact_name: person.full_name || undefined,
      email: person.work_email || person.personal_emails?.[0] || undefined,
      phone: person.phone_numbers?.[0] || undefined,
    };
  } catch { return null; }
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const { company, contact_name, email, state, industry } = await req.json();
    if (!company) {
      return new Response(JSON.stringify({ error: "company is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: { contact_name?: string; email?: string; phone?: string; linkedin_url?: string } = {};

    // Step 1: Serper web search for basic info + LinkedIn
    const serperResult = await serperSearch(company, state);
    if (serperResult) {
      if (serperResult.email) result.email = serperResult.email;
      if (serperResult.phone) result.phone = serperResult.phone;
      if (serperResult.linkedin_url) result.linkedin_url = serperResult.linkedin_url;
    }

    // Step 2: Apollo people search
    if (!result.email) {
      const apolloResult = await apolloCompanySearch(company, state, industry);
      if (apolloResult) {
        if (apolloResult.contact_name && !contact_name) result.contact_name = apolloResult.contact_name;
        if (apolloResult.email) result.email = apolloResult.email;
        if (apolloResult.phone && !result.phone) result.phone = apolloResult.phone;
      }
    }

    // Step 3: PDL fallback
    if (!result.email) {
      const pdlResult = await pdlCompanySearch(company);
      if (pdlResult) {
        if (pdlResult.contact_name && !result.contact_name && !contact_name) result.contact_name = pdlResult.contact_name;
        if (pdlResult.email) result.email = pdlResult.email;
        if (pdlResult.phone && !result.phone) result.phone = pdlResult.phone;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("enrich-lead error:", err);
    return new Response(JSON.stringify({ error: err.message || "Enrichment failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
