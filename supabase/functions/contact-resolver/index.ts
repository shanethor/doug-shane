import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function normalize(s: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9@.]/g, "").trim();
}

function normPhone(s: string | null): string {
  return (s || "").replace(/[^0-9+]/g, "").slice(-10);
}

function nameSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Simple token overlap
  const ta = new Set(na.split(/\s+/));
  const tb = new Set(nb.split(/\s+/));
  const overlap = [...ta].filter(t => tb.has(t)).length;
  const total = Math.max(ta.size, tb.size);
  return total > 0 ? overlap / total : 0;
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

    // ─── Run Resolver: find duplicates across sources ───
    if (action === "resolve") {
      // Fetch all contacts for user
      const { data: contacts, error: fetchErr } = await adminClient
        .from("network_contacts")
        .select("*")
        .eq("user_id", userId)
        .is("canonical_person_id", null);

      if (fetchErr) throw fetchErr;
      if (!contacts?.length) {
        return new Response(JSON.stringify({ merged: 0, queue: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build index by email and phone
      const emailIndex: Record<string, typeof contacts> = {};
      const phoneIndex: Record<string, typeof contacts> = {};

      for (const c of contacts) {
        if (c.email) {
          const key = normalize(c.email);
          if (key) (emailIndex[key] ||= []).push(c);
        }
        if (c.phone) {
          const key = normPhone(c.phone);
          if (key.length >= 7) (phoneIndex[key] ||= []).push(c);
        }
      }

      // Find matches
      const processed = new Set<string>();
      const mergeGroups: { contacts: any[]; confidence: number; reason: string }[] = [];

      // Strong match: same email
      for (const [email, group] of Object.entries(emailIndex)) {
        if (group.length < 2) continue;
        // Only group across different sources
        const sources = new Set(group.map(c => c.source));
        if (sources.size < 2) continue;
        const ids = group.map(c => c.id);
        if (ids.some(id => processed.has(id))) continue;
        ids.forEach(id => processed.add(id));
        mergeGroups.push({ contacts: group, confidence: 0.95, reason: `Same email: ${email}` });
      }

      // Medium match: same phone
      for (const [phone, group] of Object.entries(phoneIndex)) {
        if (group.length < 2) continue;
        const sources = new Set(group.map(c => c.source));
        if (sources.size < 2) continue;
        const unprocessed = group.filter(c => !processed.has(c.id));
        if (unprocessed.length < 2) continue;
        const ids = unprocessed.map(c => c.id);
        ids.forEach(id => processed.add(id));
        mergeGroups.push({ contacts: unprocessed, confidence: 0.85, reason: `Same phone: ${phone}` });
      }

      // Weak match: same name across sources (only if confidence is high)
      const nameIndex: Record<string, typeof contacts> = {};
      for (const c of contacts) {
        if (processed.has(c.id) || !c.full_name) continue;
        const key = normalize(c.full_name);
        if (key.length >= 4) (nameIndex[key] ||= []).push(c);
      }
      for (const [, group] of Object.entries(nameIndex)) {
        if (group.length < 2) continue;
        const sources = new Set(group.map(c => c.source));
        if (sources.size < 2) continue;
        const ids = group.map(c => c.id);
        ids.forEach(id => processed.add(id));
        mergeGroups.push({ contacts: group, confidence: 0.6, reason: `Same name match` });
      }

      // Auto-merge high confidence, queue low confidence for review
      let autoMerged = 0;
      let queued = 0;

      for (const mg of mergeGroups) {
        if (mg.confidence >= 0.8) {
          // Auto-create canonical person
          const best = mg.contacts.reduce((a, b) => {
            const aScore = (a.email ? 1 : 0) + (a.phone ? 1 : 0) + (a.company ? 1 : 0) + (a.full_name ? 1 : 0);
            const bScore = (b.email ? 1 : 0) + (b.phone ? 1 : 0) + (b.company ? 1 : 0) + (b.full_name ? 1 : 0);
            return bScore > aScore ? b : a;
          });

          const { data: person, error: personErr } = await adminClient
            .from("canonical_persons")
            .insert({
              owner_user_id: userId,
              display_name: best.full_name,
              primary_email: best.email || mg.contacts.find((c: any) => c.email)?.email,
              primary_phone: best.phone || mg.contacts.find((c: any) => c.phone)?.phone,
              company: best.company || mg.contacts.find((c: any) => c.company)?.company,
              title: best.title || mg.contacts.find((c: any) => c.title)?.title,
              linkedin_url: best.linkedin_url || mg.contacts.find((c: any) => c.linkedin_url)?.linkedin_url,
              location: best.location || mg.contacts.find((c: any) => c.location)?.location,
              metadata: { sources: mg.contacts.map((c: any) => c.source), merge_reason: mg.reason },
            })
            .select("id")
            .single();

          if (!personErr && person) {
            // Link all contacts to canonical person
            for (const c of mg.contacts) {
              await adminClient
                .from("network_contacts")
                .update({ canonical_person_id: person.id })
                .eq("id", c.id);
            }
            autoMerged++;
          }
        } else {
          // Queue for review
          for (let i = 1; i < mg.contacts.length; i++) {
            await adminClient.from("contact_merge_queue").insert({
              owner_user_id: userId,
              contact_a_id: mg.contacts[0].id,
              contact_b_id: mg.contacts[i].id,
              confidence: mg.confidence,
              match_reason: mg.reason,
              status: "pending",
            });
            queued++;
          }
        }
      }

      // Create canonical persons for unmatched contacts too
      const { data: remaining } = await adminClient
        .from("network_contacts")
        .select("*")
        .eq("user_id", userId)
        .is("canonical_person_id", null);

      let singles = 0;
      if (remaining?.length) {
        for (const c of remaining) {
          const { data: person } = await adminClient
            .from("canonical_persons")
            .insert({
              owner_user_id: userId,
              display_name: c.full_name,
              primary_email: c.email,
              primary_phone: c.phone,
              company: c.company,
              title: c.title,
              linkedin_url: c.linkedin_url,
              location: c.location,
              metadata: { sources: [c.source], auto_created: true },
            })
            .select("id")
            .single();
          if (person) {
            await adminClient
              .from("network_contacts")
              .update({ canonical_person_id: person.id })
              .eq("id", c.id);
            singles++;
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        auto_merged: autoMerged,
        queued_for_review: queued,
        singles_created: singles,
        total_canonical: autoMerged + singles,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Get merge queue ───
    if (action === "get_queue") {
      const { data: queue } = await adminClient
        .from("contact_merge_queue")
        .select(`
          *,
          contact_a:contact_a_id(id, full_name, email, phone, company, source),
          contact_b:contact_b_id(id, full_name, email, phone, company, source)
        `)
        .eq("owner_user_id", userId)
        .eq("status", "pending")
        .order("confidence", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ queue: queue || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Approve/reject merge ───
    if (action === "resolve_merge") {
      const { merge_id, decision } = body; // decision: 'approve' | 'reject'
      if (!merge_id || !["approve", "reject"].includes(decision)) {
        return new Response(JSON.stringify({ error: "merge_id and decision (approve/reject) required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: merge } = await adminClient
        .from("contact_merge_queue")
        .select("*, contact_a:contact_a_id(*), contact_b:contact_b_id(*)")
        .eq("id", merge_id)
        .eq("owner_user_id", userId)
        .single();

      if (!merge) {
        return new Response(JSON.stringify({ error: "Merge not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (decision === "approve") {
        // Check if contact_a already has a canonical person
        const a = merge.contact_a as any;
        const b = merge.contact_b as any;
        let canonicalId = a.canonical_person_id || b.canonical_person_id;

        if (!canonicalId) {
          // Create new canonical person from best data
          const best = (a.email ? 1 : 0) + (a.phone ? 1 : 0) >= (b.email ? 1 : 0) + (b.phone ? 1 : 0) ? a : b;
          const other = best === a ? b : a;
          const { data: person } = await adminClient
            .from("canonical_persons")
            .insert({
              owner_user_id: userId,
              display_name: best.full_name || other.full_name,
              primary_email: best.email || other.email,
              primary_phone: best.phone || other.phone,
              company: best.company || other.company,
              title: best.title || other.title,
              linkedin_url: best.linkedin_url || other.linkedin_url,
              location: best.location || other.location,
            })
            .select("id")
            .single();
          canonicalId = person?.id;
        }

        if (canonicalId) {
          await adminClient.from("network_contacts").update({ canonical_person_id: canonicalId }).eq("id", a.id);
          await adminClient.from("network_contacts").update({ canonical_person_id: canonicalId }).eq("id", b.id);
        }

        await adminClient.from("contact_merge_queue").update({
          status: "approved",
          resolved_canonical_id: canonicalId,
          resolved_at: new Date().toISOString(),
        }).eq("id", merge_id);
      } else {
        await adminClient.from("contact_merge_queue").update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
        }).eq("id", merge_id);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Stats ───
    if (action === "stats") {
      const { count: totalContacts } = await adminClient
        .from("network_contacts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      const { count: canonicalCount } = await adminClient
        .from("canonical_persons")
        .select("*", { count: "exact", head: true })
        .eq("owner_user_id", userId);

      const { count: pendingMerges } = await adminClient
        .from("contact_merge_queue")
        .select("*", { count: "exact", head: true })
        .eq("owner_user_id", userId)
        .eq("status", "pending");

      return new Response(JSON.stringify({
        total_contacts: totalContacts || 0,
        canonical_persons: canonicalCount || 0,
        pending_merges: pendingMerges || 0,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("contact-resolver error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
