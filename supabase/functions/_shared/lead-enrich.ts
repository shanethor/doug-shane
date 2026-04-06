// ─── Lead Enrichment: Serper → Apollo → PDL waterfall ───

export interface EnrichResult {
  contact_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
}

// ── Single lead enrichment via waterfall ──
export async function enrichLead(
  company: string,
  state: string | null,
  industry: string | null,
): Promise<EnrichResult> {
  const result: EnrichResult = {};

  // Step 1: Serper web search
  const SERPER_KEY = Deno.env.get("SERPER_API_KEY");
  if (SERPER_KEY) {
    try {
      const q = `${company} ${state || ""} owner contact email`;
      const resp = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": SERPER_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ q, num: 5 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const r of (data.organic || [])) {
          if (r.link?.includes("linkedin.com/in/")) {
            result.linkedin_url = r.link;
            break;
          }
        }
        const kg = data.knowledgeGraph || {};
        if (kg.phoneNumber) result.phone = kg.phoneNumber;
        if (kg.email) result.email = kg.email;
      }
    } catch (e) { console.warn("[enrich] Serper failed:", e); }
  }

  // Step 2: Apollo people search
  const APOLLO_KEY = Deno.env.get("APOLLO_API_KEY");
  if (!result.email && APOLLO_KEY) {
    try {
      const resp = await fetch("https://api.apollo.io/api/v1/mixed_people/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY },
        body: JSON.stringify({
          q_organization_name: company,
          person_seniorities: ["owner", "founder", "c_suite", "vp", "director"],
          page: 1,
          per_page: 3,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const best = (data.people || [])[0];
        if (best) {
          if (!result.contact_name) result.contact_name = best.name || `${best.first_name || ""} ${best.last_name || ""}`.trim() || undefined;
          if (best.email) result.email = best.email;
          if (!result.phone && best.phone_numbers?.[0]?.sanitized_number) result.phone = best.phone_numbers[0].sanitized_number;
        }
      }
    } catch (e) { console.warn("[enrich] Apollo failed:", e); }
  }

  // Step 3: PDL fallback
  const PDL_KEY = Deno.env.get("PDL_API_KEY");
  if (!result.email && PDL_KEY) {
    try {
      const resp = await fetch("https://api.peopledatalabs.com/v5/person/search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": PDL_KEY },
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
      if (resp.ok) {
        const data = await resp.json();
        const person = data.data?.[0];
        if (person) {
          if (!result.contact_name) result.contact_name = person.full_name || undefined;
          if (person.work_email) result.email = person.work_email;
          else if (person.personal_emails?.[0]) result.email = person.personal_emails[0];
          if (!result.phone && person.phone_numbers?.[0]) result.phone = person.phone_numbers[0];
        }
      }
    } catch (e) { console.warn("[enrich] PDL failed:", e); }
  }

  return result;
}

// ── Batch enrichment with concurrency limit ──
export async function enrichLeadsBatch(
  leads: Array<{ company: string; state: string | null; industry: string | null; idx: number }>,
): Promise<Map<number, EnrichResult>> {
  const results = new Map<number, EnrichResult>();

  for (let i = 0; i < leads.length; i += 3) {
    const batch = leads.slice(i, i + 3);
    const batchResults = await Promise.all(
      batch.map(async (l) => {
        const enriched = await enrichLead(l.company, l.state, l.industry);
        return { idx: l.idx, data: enriched };
      })
    );
    for (const r of batchResults) {
      results.set(r.idx, r.data);
    }
  }

  return results;
}

// ── Enrich inserted leads and update DB ──
export async function enrichInsertedLeads(
  inserted: Array<{ id: string; company: string; state: string | null; industry: string | null }>,
  adminClient: any,
): Promise<number> {
  console.log(`[lead-enrich] Enriching ${inserted.length} leads via Serper → Apollo → PDL waterfall...`);
  const enrichBatch = inserted.map((lead, idx) => ({
    company: lead.company,
    state: lead.state,
    industry: lead.industry,
    idx,
    id: lead.id,
  }));

  const enrichResults = await enrichLeadsBatch(enrichBatch);

  for (const lead of enrichBatch) {
    const enriched = enrichResults.get(lead.idx);
    if (enriched && (enriched.contact_name || enriched.email || enriched.phone)) {
      const updates: Record<string, unknown> = {};
      if (enriched.contact_name) updates.contact_name = enriched.contact_name;
      if (enriched.email) updates.email = enriched.email;
      if (enriched.phone) updates.phone = enriched.phone;

      await adminClient
        .from("engine_leads")
        .update(updates)
        .eq("id", lead.id);
    }
  }

  const enrichedCount = Array.from(enrichResults.values()).filter(r => r.email || r.contact_name).length;
  console.log(`[lead-enrich] Enrichment complete: ${enrichedCount}/${inserted.length} leads enriched with verified data`);
  return enrichedCount;
}
