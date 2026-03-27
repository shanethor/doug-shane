import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // Fetch the contact
    const { data: contact } = await adminClient
      .from("email_discovered_contacts")
      .select("*")
      .eq("id", contact_id)
      .eq("user_id", user.id)
      .single();

    if (!contact) {
      return new Response(JSON.stringify({ error: "Contact not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = contact.email_address;
    const updates: any = { last_enriched_at: new Date().toISOString() };
    let enriched = false;

    // Step 1: Try Apollo.io
    const apolloKey = Deno.env.get("APOLLO_API_KEY");
    if (apolloKey) {
      try {
        const apolloResp = await fetch("https://api.apollo.io/api/v1/people/match", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Api-Key": apolloKey },
          body: JSON.stringify({
            email,
            reveal_phone_number: true,
            reveal_personal_emails: true,
          }),
        });

        if (apolloResp.ok) {
          const apolloData = await apolloResp.json();
          const person = apolloData.person;

          if (person) {
            updates.apollo_data = person;
            updates.enrichment_source = "apollo";

            if (person.title) updates.hunter_position = person.title;
            if (person.organization?.name) updates.hunter_company = person.organization.name;
            if (person.linkedin_url) updates.hunter_linkedin_url = person.linkedin_url;
            if (person.photo_url) updates.profile_photo_url = person.photo_url;
            if (person.city || person.state) {
              updates.location = [person.city, person.state, person.country].filter(Boolean).join(", ");
            }
            if (person.phone_numbers?.length > 0) {
              updates.hunter_phone = person.phone_numbers[0].sanitized_number || person.phone_numbers[0].raw_number;
            }
            if (person.twitter_url) updates.twitter_url = person.twitter_url;
            if (person.employment_history) {
              updates.employment_history = person.employment_history.slice(0, 3);
            }
            if (person.first_name) updates.first_name = person.first_name;
            if (person.last_name) updates.last_name = person.last_name;
            if (person.name) updates.display_name = person.name;

            enriched = true;

            // Log API call
            await adminClient.from("enrichment_api_logs").insert({
              user_id: user.id,
              provider: "apollo",
              endpoint: "people/match",
              credits_consumed: 1,
              response_status: 200,
            });
          }
        }
      } catch (err) {
        console.error("Apollo enrichment error:", err);
      }
    }

    // Step 2: Fallback to PDL if Apollo didn't return data
    if (!enriched) {
      const pdlKey = Deno.env.get("PDL_API_KEY");
      if (pdlKey) {
        try {
          const url = new URL("https://api.peopledatalabs.com/v5/person/enrich");
          url.searchParams.set("email", email);
          url.searchParams.set("min_likelihood", "5");

          const pdlResp = await fetch(url.toString(), {
            headers: { "X-Api-Key": pdlKey },
          });

          if (pdlResp.ok) {
            const pdlData = await pdlResp.json();
            const person = pdlData.data || pdlData;

            if (person && person.full_name) {
              updates.enrichment_source = "pdl";
              updates.enrichment_data = person;

              if (person.job_title) updates.hunter_position = person.job_title;
              if (person.job_company_name) updates.hunter_company = person.job_company_name;
              if (person.linkedin_url) updates.hunter_linkedin_url = person.linkedin_url;
              if (person.twitter_url) updates.twitter_url = person.twitter_url;
              if (person.location_locality || person.location_region) {
                updates.location = [person.location_locality, person.location_region, person.location_country].filter(Boolean).join(", ");
              }
              if (person.phone_numbers?.length > 0) {
                updates.hunter_phone = person.phone_numbers[0];
              }
              if (person.experience) {
                updates.employment_history = person.experience.slice(0, 3);
              }
              if (person.first_name) updates.first_name = person.first_name;
              if (person.last_name) updates.last_name = person.last_name;
              if (person.full_name) updates.display_name = person.full_name;

              enriched = true;

              await adminClient.from("enrichment_api_logs").insert({
                user_id: user.id,
                provider: "pdl",
                endpoint: "person/enrich",
                credits_consumed: 1,
                response_status: 200,
              });
            }
          }
        } catch (err) {
          console.error("PDL enrichment error:", err);
        }
      }
    }

    updates.enrichment_status = enriched ? "fully_enriched" : "enrichment_failed";

    // Update the contact record
    await adminClient
      .from("email_discovered_contacts")
      .update(updates)
      .eq("id", contact_id);

    return new Response(JSON.stringify({ success: true, enriched, source: updates.enrichment_source || null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("enrich-contact error:", err);
    return new Response(JSON.stringify({ error: "Enrichment failed" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
