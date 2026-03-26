import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PDL enrichment
async function enrichPDL(identifier: { email?: string; linkedin_url?: string; name?: string; company?: string }, pdlKey: string): Promise<any> {
  const url = new URL("https://api.peopledatalabs.com/v5/person/enrich");
  if (identifier.email) url.searchParams.set("email", identifier.email);
  if (identifier.linkedin_url) url.searchParams.set("profile", identifier.linkedin_url);
  if (identifier.name) url.searchParams.set("name", identifier.name);
  if (identifier.company) url.searchParams.set("company", identifier.company);
  url.searchParams.set("min_likelihood", "3");

  try {
    const resp = await fetch(url.toString(), { headers: { "X-Api-Key": pdlKey } });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.data || data;
  } catch { return null; }
}

// Apollo people search
async function searchApollo(params: { company?: string; domain?: string; title?: string }, apolloKey: string): Promise<any[]> {
  try {
    const body: any = {
      api_key: apolloKey,
      per_page: 10,
    };
    if (params.company) body.organization_name = [params.company];
    if (params.domain) body.q_organization_domains = params.domain;

    const resp = await fetch("https://api.apollo.io/v1/mixed_people/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.people || [];
  } catch { return []; }
}

// Apollo person enrichment
async function enrichApollo(email: string, apolloKey: string): Promise<any> {
  try {
    const resp = await fetch("https://api.apollo.io/v1/people/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apolloKey, email }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.person || null;
  } catch { return null; }
}

// AI scoring & talking point generation using Lovable AI
async function aiScoreAndTalkingPoint(
  prospect: any,
  client: any,
  idealProfile: any,
  supabaseUrl: string,
  anonKey: string,
): Promise<{ score: number; talking_point: string; life_events: any[] }> {
  try {
    const prompt = `You are an AI assistant for an insurance producer. Analyze this prospect and score them 0-100 based on how likely they are to become a client, and suggest a natural talking point for the producer to use.

Client (meeting with): ${client.display_name || client.client_name || "Unknown"}
${client.company ? `Client Company: ${client.company}` : ""}

Prospect:
Name: ${prospect.name || "Unknown"}
Title: ${prospect.occupation || prospect.title || "Unknown"}
Company: ${prospect.company || "Unknown"}
Location: ${prospect.location || "Unknown"}
Relationship: ${prospect.relationship_to_client || "Discovered in network"}
Connection Type: ${prospect.connection_type || "Unknown"}
Is Mutual Contact: ${prospect.is_mutual_with_producer ? "Yes" : "No"}

Ideal Prospect Profile:
Life Event Triggers: ${JSON.stringify(idealProfile?.life_event_triggers || ["new_baby", "marriage", "home_purchase", "job_change"])}
Industries: ${JSON.stringify(idealProfile?.industry_preferences || [])}

Respond ONLY with JSON: {"score": <0-100>, "talking_point": "<natural conversation opener>", "life_events": [{"type": "<event_type>", "confidence": <0-1>}]}`;

    const resp = await fetch(`${supabaseUrl}/functions/v1/ai-router`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        prompt,
        model: "google/gemini-2.5-flash",
        max_tokens: 300,
      }),
    });

    if (!resp.ok) {
      return { score: 50, talking_point: "Research this connection further.", life_events: [] };
    }

    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content || data.text || "";
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        score: Math.max(0, Math.min(100, parsed.score || 50)),
        talking_point: parsed.talking_point || "Ask about their recent activities.",
        life_events: parsed.life_events || [],
      };
    }

    return { score: 50, talking_point: "Research this connection further.", life_events: [] };
  } catch (err) {
    console.error("AI scoring error:", err);
    return { score: 50, talking_point: "Research this connection further.", life_events: [] };
  }
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

    const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !authUser) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authUser.id;
    const body = await req.json();
    const { client_canonical_id, client_name, meeting_date, prospect_profile_id } = body;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const pdlKey = Deno.env.get("PDL_API_KEY");
    const apolloKey = Deno.env.get("APOLLO_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Create feeder list record
    const { data: feederList, error: flErr } = await adminClient
      .from("feeder_lists")
      .insert({
        producer_id: userId,
        client_canonical_id: client_canonical_id || null,
        client_name: client_name || "Unknown Client",
        meeting_date: meeting_date || null,
        status: "generating",
      })
      .select("id")
      .single();

    if (flErr || !feederList) {
      return new Response(JSON.stringify({ error: "Failed to create feeder list" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get client data
    let clientData: any = { display_name: client_name };
    if (client_canonical_id) {
      const { data: cp } = await adminClient
        .from("canonical_persons")
        .select("*")
        .eq("id", client_canonical_id)
        .maybeSingle();
      if (cp) clientData = cp;
    }

    // 3. Get ideal prospect profile
    let idealProfile: any = null;
    if (prospect_profile_id) {
      const { data: pp } = await adminClient
        .from("prospect_profiles")
        .select("*")
        .eq("id", prospect_profile_id)
        .eq("producer_id", userId)
        .maybeSingle();
      idealProfile = pp;
    }
    if (!idealProfile) {
      const { data: defaultPP } = await adminClient
        .from("prospect_profiles")
        .select("*")
        .eq("producer_id", userId)
        .eq("is_default", true)
        .maybeSingle();
      idealProfile = defaultPP;
    }

    // 4. Collect prospects from multiple sources
    const prospects: any[] = [];

    // Source A: Email discovered contacts associated with this client
    if (client_canonical_id) {
      const { data: emailContacts } = await adminClient
        .from("email_discovered_contacts")
        .select("*")
        .eq("user_id", userId)
        .neq("status", "dismissed")
        .limit(20);

      for (const ec of (emailContacts || [])) {
        prospects.push({
          name: ec.display_name || `${ec.first_name || ""} ${ec.last_name || ""}`.trim() || ec.email_address,
          first_name: ec.first_name,
          last_name: ec.last_name,
          email: ec.email_address,
          occupation: ec.hunter_position,
          company: ec.hunter_company,
          linkedin_url: ec.hunter_linkedin_url,
          phone: ec.hunter_phone,
          relationship_to_client: "Found in email threads",
          connection_type: "Email contact",
          is_mutual_with_producer: true,
          enrichment_data: ec.enrichment_data || {},
          source: "email_discovery",
        });
      }
    }

    // Source B: PDL enrichment of client's company network
    if (pdlKey && clientData.company) {
      const companyDomain = clientData.primary_email ? clientData.primary_email.split("@")[1] : null;
      
      // Search for people at the client's company
      const url = new URL("https://api.peopledatalabs.com/v5/person/search");
      const sqlQuery = companyDomain 
        ? `SELECT * FROM person WHERE job_company_website='${companyDomain}' LIMIT 10`
        : `SELECT * FROM person WHERE job_company_name='${clientData.company}' LIMIT 10`;
      
      try {
        const resp = await fetch("https://api.peopledatalabs.com/v5/person/search", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Api-Key": pdlKey },
          body: JSON.stringify({ sql: sqlQuery, size: 10 }),
        });
        if (resp.ok) {
          const data = await resp.json();
          for (const person of (data.data || [])) {
            prospects.push({
              name: person.full_name || `${person.first_name || ""} ${person.last_name || ""}`.trim(),
              first_name: person.first_name,
              last_name: person.last_name,
              email: person.work_email || person.personal_emails?.[0],
              occupation: person.job_title,
              company: person.job_company_name,
              location: person.location_name,
              linkedin_url: person.linkedin_url,
              relationship_to_client: `Works at ${clientData.company}`,
              connection_type: "Company network (PDL)",
              is_mutual_with_producer: false,
              enrichment_data: person,
              source: "pdl",
            });
          }
        }
        await adminClient.from("enrichment_api_logs").insert({
          user_id: userId, provider: "pdl", endpoint: "person/search",
          feeder_list_id: feederList.id, credits_consumed: 1, response_status: 200,
        });
      } catch (e) {
        console.error("PDL search error:", e);
      }
    }

    // Source C: Apollo people search
    if (apolloKey && clientData.company) {
      const apolloPeople = await searchApollo({ company: clientData.company }, apolloKey);
      for (const person of apolloPeople) {
        // Avoid duplicates
        if (prospects.some(p => p.email === person.email)) continue;
        prospects.push({
          name: person.name || `${person.first_name || ""} ${person.last_name || ""}`.trim(),
          first_name: person.first_name,
          last_name: person.last_name,
          email: person.email,
          occupation: person.title,
          company: person.organization_name,
          location: person.city ? `${person.city}, ${person.state}` : null,
          linkedin_url: person.linkedin_url,
          phone: person.phone_numbers?.[0]?.sanitized_number,
          relationship_to_client: `Connected via ${clientData.company}`,
          connection_type: "Company network (Apollo)",
          is_mutual_with_producer: false,
          enrichment_data: person,
          source: "apollo",
        });
      }
      await adminClient.from("enrichment_api_logs").insert({
        user_id: userId, provider: "apollo", endpoint: "mixed_people/search",
        feeder_list_id: feederList.id, credits_consumed: 1, response_status: 200,
      });
    }

    // 5. Cross-reference with producer's existing contacts
    const { data: existingContacts } = await adminClient
      .from("canonical_persons")
      .select("primary_email, display_name")
      .eq("owner_user_id", userId);
    const existingEmails = new Set((existingContacts || []).map(c => c.primary_email?.toLowerCase()).filter(Boolean));

    for (const p of prospects) {
      if (p.email && existingEmails.has(p.email.toLowerCase())) {
        p.is_mutual_with_producer = true;
      }
    }

    // 6. AI scoring for each prospect (limit to top 15)
    const toScore = prospects.slice(0, 15);
    for (const p of toScore) {
      const aiResult = await aiScoreAndTalkingPoint(p, clientData, idealProfile, supabaseUrl, anonKey);
      p.prospect_score = aiResult.score;
      p.suggested_talking_point = aiResult.talking_point;
      p.life_event_signals = aiResult.life_events;
    }

    // 7. Sort by score and take top 10
    toScore.sort((a, b) => (b.prospect_score || 0) - (a.prospect_score || 0));
    const topProspects = toScore.slice(0, 10);

    // 8. Insert into feeder_list_prospects
    for (const p of topProspects) {
      await adminClient.from("feeder_list_prospects").insert({
        feeder_list_id: feederList.id,
        name: p.name || "Unknown",
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        phone: p.phone,
        occupation: p.occupation,
        company: p.company,
        location: p.location,
        linkedin_url: p.linkedin_url,
        relationship_to_client: p.relationship_to_client,
        connection_type: p.connection_type,
        life_event_signals: p.life_event_signals || [],
        is_mutual_with_producer: p.is_mutual_with_producer || false,
        prospect_score: p.prospect_score || 50,
        suggested_talking_point: p.suggested_talking_point,
        enrichment_data: p.enrichment_data || {},
      });
    }

    // 9. Update feeder list status
    await adminClient.from("feeder_lists")
      .update({ status: "ready", updated_at: new Date().toISOString() })
      .eq("id", feederList.id);

    return new Response(JSON.stringify({
      success: true,
      feeder_list_id: feederList.id,
      prospect_count: topProspects.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-feeder-list error:", err);
    return new Response(JSON.stringify({ error: "An error occurred", details: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
