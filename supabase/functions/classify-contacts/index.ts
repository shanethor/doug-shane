import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Classification helpers ───

const FAMILY_NAMES = new Set([
  "mom", "dad", "mama", "papa", "honey", "babe", "baby", "wifey", "hubby",
  "sis", "bro", "brother", "sister", "grandma", "grandpa", "nana", "granny",
  "auntie", "uncle", "cousin", "sweetheart", "darling", "love",
]);

const SPAM_SYSTEM_NAMES = new Set([
  "do not reply", "donotreply", "no reply", "noreply", "no-reply",
  "notification", "notifications", "support team", "customer service",
  "mailer-daemon", "postmaster", "system", "automated", "auto-reply",
  "newsletter", "unsubscribe", "marketing", "promotions", "deals",
]);

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
  "att.net", "sbcglobal.net", "aol.com", "protonmail.com", "me.com",
  "live.com", "msn.com", "comcast.net", "verizon.net", "cox.net",
]);

const SPAM_PREFIXES = new Set([
  "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply",
  "mailer-daemon", "postmaster", "bounce", "bounces", "unsubscribe",
  "subscribe", "newsletter", "promo", "promotions", "notifications",
  "alerts", "system", "automated", "auto", "bot", "daemon",
]);

const ESP_DOMAINS = new Set([
  "sendgrid.net", "mailchimp.com", "constantcontact.com", "hubspot.com",
  "salesforce.com", "marketo.com", "mailgun.org", "amazonses.com",
  "intercom.io", "zendesk.com", "freshdesk.com", "facebookmail.com",
  "noreply.github.com",
]);

const ORG_KEYWORDS = /\b(llc|inc|corp|ltd|gmbh|co\.|group|agency|insurance|services|solutions|consulting|associates|partners|enterprises|foundation|association|institute)\b/i;

const TRANSACTIONAL_SUBDOMAIN_RE = /^(em\d*|mail|edm|us-edm|email|e|news|notify|promo|comms?|campaign|mailer|bounce|sg|mkt)\./i;

interface ContactRow {
  id: string;
  email_address?: string;
  display_name?: string;
  first_name?: string;
  last_name?: string;
  domain?: string;
  email_frequency?: number;
  contact_type?: string;
  hunter_company?: string;
  hunter_position?: string;
}

function classifyWithRules(c: ContactRow): { type: string; confidence: number; is_filtered: boolean } {
  const email = (c.email_address || "").toLowerCase().trim();
  const name = (c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim()).toLowerCase().trim();
  const localPart = email.split("@")[0] || "";
  const domain = email.split("@")[1] || "";

  // 1) Spam / System detection
  if (SPAM_PREFIXES.has(localPart)) {
    return { type: "spam_or_system", confidence: 0.95, is_filtered: true };
  }
  if (ESP_DOMAINS.has(domain)) {
    return { type: "spam_or_system", confidence: 0.9, is_filtered: true };
  }
  if (TRANSACTIONAL_SUBDOMAIN_RE.test(domain)) {
    return { type: "spam_or_system", confidence: 0.85, is_filtered: true };
  }
  if (/^\d{7,}/.test(localPart) || /^[a-f0-9]{20,}$/.test(localPart)) {
    return { type: "spam_or_system", confidence: 0.9, is_filtered: true };
  }
  // Check name against spam/system names
  if (SPAM_SYSTEM_NAMES.has(name)) {
    return { type: "spam_or_system", confidence: 0.9, is_filtered: true };
  }

  // 2) Family / personal name detection
  const nameParts = name.split(/\s+/).filter(Boolean);
  if (nameParts.length === 1 && FAMILY_NAMES.has(nameParts[0])) {
    return { type: "person_personal", confidence: 0.9, is_filtered: true };
  }
  // Single short token with no email
  if (nameParts.length === 1 && nameParts[0].length <= 3 && !email) {
    return { type: "unknown", confidence: 0.3, is_filtered: true };
  }

  // 3) Company detection
  if (ORG_KEYWORDS.test(name)) {
    return { type: "company", confidence: 0.85, is_filtered: false };
  }

  // 4) Person classification
  const hasFirstLast = nameParts.length >= 2 && nameParts[0].length > 1 && nameParts[1].length > 1;
  const isPersonalDomain = PERSONAL_DOMAINS.has(domain);
  const isBusinessDomain = email && !isPersonalDomain && domain && !ESP_DOMAINS.has(domain);

  if (hasFirstLast && isBusinessDomain) {
    return { type: "person_business", confidence: 0.85, is_filtered: false };
  }
  if (hasFirstLast && isPersonalDomain) {
    // Could be personal or business person using personal email
    return { type: "person_personal", confidence: 0.6, is_filtered: false };
  }
  if (hasFirstLast) {
    return { type: "person_business", confidence: 0.6, is_filtered: false };
  }

  // 5) No clear signal
  if (!name || name.length < 2) {
    return { type: "unknown", confidence: 0.2, is_filtered: true };
  }

  return { type: "unknown", confidence: 0.4, is_filtered: false };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify user
    const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const forceReclassify = body.force === true;
    const batchSize = 500;

    // Fetch unclassified email_discovered_contacts
    let query = supabase
      .from("email_discovered_contacts")
      .select("id, email_address, display_name, first_name, last_name, domain, email_frequency, contact_type, hunter_company, hunter_position")
      .eq("user_id", user.id)
      .limit(batchSize);

    if (!forceReclassify) {
      query = query.or("classification_type.is.null,classification_type.eq.unknown");
    }

    const { data: contacts, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    let classified = 0;
    let filtered = 0;

    // Batch classify using rules
    const updates: { id: string; classification_type: string; classification_confidence: number; is_filtered: boolean }[] = [];

    for (const c of (contacts || [])) {
      const result = classifyWithRules(c as ContactRow);
      updates.push({
        id: c.id,
        classification_type: result.type,
        classification_confidence: result.confidence,
        is_filtered: result.is_filtered,
      });
      classified++;
      if (result.is_filtered) filtered++;
    }

    // Batch update
    for (const u of updates) {
      await supabase
        .from("email_discovered_contacts")
        .update({
          classification_type: u.classification_type,
          classification_confidence: u.classification_confidence,
          is_filtered: u.is_filtered,
        })
        .eq("id", u.id);
    }

    // Also classify network_contacts
    let ncQuery = supabase
      .from("network_contacts")
      .select("id, full_name, email, phone, company, source")
      .eq("user_id", user.id)
      .limit(batchSize);

    if (!forceReclassify) {
      ncQuery = ncQuery.or("classification_type.is.null,classification_type.eq.unknown");
    }

    const { data: networkContacts } = await ncQuery;
    let ncClassified = 0;

    for (const nc of (networkContacts || [])) {
      const mapped: ContactRow = {
        id: nc.id,
        email_address: nc.email || "",
        display_name: nc.full_name,
        first_name: nc.full_name?.split(" ")[0] || null,
        last_name: nc.full_name?.split(" ").slice(1).join(" ") || null,
        domain: nc.email ? nc.email.split("@")[1] : null,
      };
      const result = classifyWithRules(mapped);
      await supabase
        .from("network_contacts")
        .update({
          classification_type: result.type,
          classification_confidence: result.confidence,
          is_filtered: result.is_filtered,
        })
        .eq("id", nc.id);
      ncClassified++;
    }

    // Now try AI refinement for "unknown" contacts with low confidence
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      const unknowns = updates.filter(u => u.classification_type === "unknown" && u.classification_confidence < 0.5);
      const toRefine = unknowns.slice(0, 20); // AI batch limit

      if (toRefine.length > 0) {
        const contactsForAI = (contacts || [])
          .filter(c => toRefine.some(u => u.id === c.id))
          .map(c => ({
            id: c.id,
            name: c.display_name || `${c.first_name || ""} ${c.last_name || ""}`.trim(),
            email: c.email_address,
            company: c.hunter_company,
            position: c.hunter_position,
          }));

        try {
          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              tools: [{
                type: "function",
                function: {
                  name: "classify_contacts",
                  description: "Classify each contact as person_business, person_personal, company, spam_or_system, or unknown",
                  parameters: {
                    type: "object",
                    properties: {
                      classifications: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            type: { type: "string", enum: ["person_business", "person_personal", "company", "spam_or_system", "unknown"] },
                            confidence: { type: "number" },
                          },
                          required: ["id", "type", "confidence"],
                        },
                      },
                    },
                    required: ["classifications"],
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "classify_contacts" } },
              messages: [
                { role: "system", content: "Classify contacts for a business CRM. person_business = professional/work contact. person_personal = family/friend. company = organization. spam_or_system = automated/marketing. unknown = can't tell." },
                { role: "user", content: JSON.stringify(contactsForAI) },
              ],
            }),
          });

          if (aiResp.ok) {
            const aiData = await aiResp.json();
            const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall) {
              const parsed = JSON.parse(toolCall.function.arguments);
              for (const cls of (parsed.classifications || [])) {
                const shouldFilter = cls.type === "spam_or_system" || cls.type === "person_personal";
                await supabase
                  .from("email_discovered_contacts")
                  .update({
                    classification_type: cls.type,
                    classification_confidence: cls.confidence,
                    is_filtered: shouldFilter && cls.confidence > 0.7,
                  })
                  .eq("id", cls.id);
              }
            }
          }
        } catch (aiErr) {
          console.error("AI classification error:", aiErr);
          // Non-fatal - rules-based classification already applied
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      classified,
      filtered,
      network_classified: ncClassified,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("classify-contacts error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
