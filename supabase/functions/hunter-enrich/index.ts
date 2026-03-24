import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HUNTER_BASE = "https://api.hunter.io/v2";

interface HunterEmailFinderResult {
  email?: string;
  score?: number;
  first_name?: string;
  last_name?: string;
  position?: string;
  company?: string;
  linkedin_url?: string;
  twitter?: string;
  phone_number?: string;
  sources?: { domain: string; uri: string }[];
}

interface HunterDomainSearchResult {
  domain?: string;
  organization?: string;
  emails?: {
    value: string;
    type: string;
    confidence: number;
    first_name: string;
    last_name: string;
    position: string;
    linkedin: string | null;
    phone_number: string | null;
  }[];
}

interface HunterVerifyResult {
  email?: string;
  result?: string; // deliverable, undeliverable, risky, unknown
  score?: number;
  regexp?: boolean;
  gibberish?: boolean;
  disposable?: boolean;
  webmail?: boolean;
  mx_records?: boolean;
  smtp_server?: boolean;
  smtp_check?: boolean;
  accept_all?: boolean;
}

async function hunterRequest(endpoint: string, params: Record<string, string>): Promise<any> {
  const apiKey = Deno.env.get("HUNTER_API_KEY");
  if (!apiKey) throw new Error("HUNTER_API_KEY not configured");

  const url = new URL(`${HUNTER_BASE}/${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const resp = await fetch(url.toString());
  const data = await resp.json();

  if (!resp.ok) {
    const errMsg = data?.errors?.[0]?.details || data?.errors?.[0]?.code || `Hunter API error ${resp.status}`;
    throw new Error(errMsg);
  }

  return data.data;
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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const body = await req.json();
    const { action } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Email Finder: find email from name + company/domain ───
    if (action === "find_email") {
      const { first_name, last_name, domain, company } = body;
      if (!first_name || !last_name || (!domain && !company)) {
        return new Response(JSON.stringify({ error: "first_name, last_name, and domain or company required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params: Record<string, string> = { first_name, last_name };
      if (domain) params.domain = domain;
      if (company) params.company = company;

      const result: HunterEmailFinderResult = await hunterRequest("email-finder", params);

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Domain Search: find all emails at a company domain ───
    if (action === "domain_search") {
      const { domain, company, limit } = body;
      if (!domain && !company) {
        return new Response(JSON.stringify({ error: "domain or company required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const params: Record<string, string> = {};
      if (domain) params.domain = domain;
      if (company) params.company = company;
      if (limit) params.limit = String(limit);

      const result: HunterDomainSearchResult = await hunterRequest("domain-search", params);

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Email Verification ───
    if (action === "verify_email") {
      const { email } = body;
      if (!email) {
        return new Response(JSON.stringify({ error: "email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const result: HunterVerifyResult = await hunterRequest("email-verifier", { email });

      return new Response(JSON.stringify({ success: true, data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Enrich Canonical Person: auto-fill missing data ───
    if (action === "enrich_person") {
      const { canonical_person_id } = body;
      if (!canonical_person_id) {
        return new Response(JSON.stringify({ error: "canonical_person_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: person, error: personErr } = await adminClient
        .from("canonical_persons")
        .select("*")
        .eq("id", canonical_person_id)
        .eq("owner_user_id", userId)
        .single();

      if (personErr || !person) {
        return new Response(JSON.stringify({ error: "Person not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: Record<string, any> = {};
      const enrichmentLog: string[] = [];

      // If we have a name + company but no email, try email finder
      if (!person.primary_email && person.display_name && person.company) {
        const nameParts = person.display_name.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(" ") || nameParts[0];

        try {
          const result = await hunterRequest("email-finder", {
            first_name: firstName,
            last_name: lastName,
            company: person.company,
          });
          if (result?.email) {
            updates.primary_email = result.email;
            enrichmentLog.push(`Found email via Hunter: ${result.email} (score: ${result.score})`);
          }
          if (result?.linkedin_url && !person.linkedin_url) {
            updates.linkedin_url = result.linkedin_url;
            enrichmentLog.push(`Found LinkedIn: ${result.linkedin_url}`);
          }
          if (result?.phone_number && !person.primary_phone) {
            updates.primary_phone = result.phone_number;
            enrichmentLog.push(`Found phone: ${result.phone_number}`);
          }
          if (result?.position && !person.title) {
            updates.title = result.position;
            enrichmentLog.push(`Found title: ${result.position}`);
          }
        } catch (e) {
          enrichmentLog.push(`Email finder failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // If we have an email, verify it
      const emailToVerify = updates.primary_email || person.primary_email;
      if (emailToVerify) {
        try {
          const verification = await hunterRequest("email-verifier", { email: emailToVerify });
          enrichmentLog.push(`Email verified: ${verification?.result} (score: ${verification?.score})`);
          const existingMeta = (person.metadata as Record<string, any>) || {};
          updates.metadata = {
            ...existingMeta,
            hunter_enrichment: {
              enriched_at: new Date().toISOString(),
              email_verification: verification?.result,
              email_score: verification?.score,
              log: enrichmentLog,
            },
          };
        } catch (e) {
          enrichmentLog.push(`Verification failed: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // If we have a company domain, do domain search to find additional contacts
      let domainContacts: any[] = [];
      if (person.primary_email || updates.primary_email) {
        const email = updates.primary_email || person.primary_email;
        const domain = email.split("@")[1];
        if (domain && !["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com"].includes(domain)) {
          try {
            const domainResult = await hunterRequest("domain-search", { domain, limit: "10" });
            if (domainResult?.emails?.length) {
              domainContacts = domainResult.emails.map((e: any) => ({
                name: [e.first_name, e.last_name].filter(Boolean).join(" "),
                email: e.value,
                position: e.position,
                linkedin: e.linkedin,
                confidence: e.confidence,
              }));
              enrichmentLog.push(`Found ${domainContacts.length} colleagues at ${domain}`);
            }
          } catch (e) {
            enrichmentLog.push(`Domain search failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      // Save enrichment metadata
      if (!updates.metadata) {
        const existingMeta = (person.metadata as Record<string, any>) || {};
        updates.metadata = {
          ...existingMeta,
          hunter_enrichment: {
            enriched_at: new Date().toISOString(),
            log: enrichmentLog,
          },
        };
      }

      // Update canonical person
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await adminClient
          .from("canonical_persons")
          .update(updates)
          .eq("id", canonical_person_id);
      }

      // Auto-create network contacts for discovered colleagues
      if (domainContacts.length > 0) {
        const newContacts = domainContacts
          .filter((dc: any) => dc.email && dc.name)
          .map((dc: any) => ({
            user_id: userId,
            source: "hunter",
            external_id: `hunter-${dc.email}`,
            full_name: dc.name,
            email: dc.email,
            title: dc.position || null,
            linkedin_url: dc.linkedin || null,
            phone: null,
            company: person.company,
            location: null,
            metadata: { discovered_via: canonical_person_id, confidence: dc.confidence },
          }));

        if (newContacts.length > 0) {
          await adminClient
            .from("network_contacts")
            .upsert(newContacts, { onConflict: "user_id,source,external_id" });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        updates,
        enrichment_log: enrichmentLog,
        discovered_contacts: domainContacts.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Bulk Enrich: enrich multiple canonical persons ───
    if (action === "bulk_enrich") {
      const { limit: bulkLimit } = body;
      const maxEnrich = Math.min(bulkLimit || 10, 25); // Cap at 25 per run

      // Find canonical persons that haven't been enriched and have a name + company
      const { data: persons } = await adminClient
        .from("canonical_persons")
        .select("*")
        .eq("owner_user_id", userId)
        .is("primary_email", null)
        .not("display_name", "is", null)
        .not("company", "is", null)
        .order("created_at", { ascending: false })
        .limit(maxEnrich);

      if (!persons?.length) {
        return new Response(JSON.stringify({ success: true, enriched: 0, message: "No contacts need enrichment" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let enriched = 0;
      let errors = 0;

      for (const person of persons) {
        try {
          const nameParts = (person.display_name || "").trim().split(/\s+/);
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ") || nameParts[0];

          const result = await hunterRequest("email-finder", {
            first_name: firstName,
            last_name: lastName,
            company: person.company!,
          });

          if (result?.email) {
            const existingMeta = (person.metadata as Record<string, any>) || {};
            await adminClient
              .from("canonical_persons")
              .update({
                primary_email: result.email,
                linkedin_url: result.linkedin_url || person.linkedin_url,
                primary_phone: result.phone_number || person.primary_phone,
                title: result.position || person.title,
                updated_at: new Date().toISOString(),
                metadata: {
                  ...existingMeta,
                  hunter_enrichment: {
                    enriched_at: new Date().toISOString(),
                    email_score: result.score,
                    source: "bulk_enrich",
                  },
                },
              })
              .eq("id", person.id);
            enriched++;
          }
        } catch {
          errors++;
        }
      }

      return new Response(JSON.stringify({
        success: true,
        enriched,
        errors,
        total_checked: persons.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: find_email, domain_search, verify_email, enrich_person, bulk_enrich" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("hunter-enrich error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
