import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from JWT
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { action, partner_email } = await req.json();

    if (action === "find_overlap") {
      if (!partner_email) throw new Error("partner_email required");

      // 1. Find the partner's user_id from profiles
      const { data: partnerProfile } = await supabase
        .from("profiles")
        .select("user_id, full_name, agency_name")
        .or(`from_email.eq.${partner_email},intake_email_alias.eq.${partner_email}`)
        .limit(1)
        .maybeSingle();

      // Also check auth.users email
      let partnerId: string | null = partnerProfile?.user_id || null;
      let partnerName = partnerProfile?.full_name || partner_email;
      let partnerAgency = partnerProfile?.agency_name || null;

      if (!partnerId) {
        // Try to find by auth email using admin API
        const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const match = users?.users?.find(u => u.email === partner_email);
        if (match) {
          partnerId = match.id;
          // Get their profile
          const { data: pProfile } = await supabase
            .from("profiles")
            .select("full_name, agency_name")
            .eq("user_id", match.id)
            .maybeSingle();
          partnerName = pProfile?.full_name || partner_email;
          partnerAgency = pProfile?.agency_name || null;
        }
      }

      if (!partnerId) {
        return new Response(JSON.stringify({
          found: false,
          message: "No user found with that email on the platform.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (partnerId === user.id) {
        return new Response(JSON.stringify({
          found: false,
          message: "You can't compare your network with yourself.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 2. Get canonical_person_ids for the requesting user's contacts
      const { data: myContacts } = await supabase
        .from("network_contacts")
        .select("canonical_person_id, full_name, company, email, source")
        .eq("user_id", user.id)
        .not("canonical_person_id", "is", null);

      // 3. Get canonical_person_ids for the partner's contacts
      const { data: partnerContacts } = await supabase
        .from("network_contacts")
        .select("canonical_person_id, full_name, company, email, source")
        .eq("user_id", partnerId)
        .not("canonical_person_id", "is", null);

      // 4. Find overlapping canonical_person_ids
      const myCanonicalIds = new Set((myContacts || []).map(c => c.canonical_person_id));
      const partnerCanonicalIds = new Set((partnerContacts || []).map(c => c.canonical_person_id));

      const sharedIds = [...myCanonicalIds].filter(id => partnerCanonicalIds.has(id));

      // 5. Also do fuzzy match by email (contacts without canonical_person_id)
      const { data: myAllContacts } = await supabase
        .from("network_contacts")
        .select("full_name, company, email, source")
        .eq("user_id", user.id);

      const { data: partnerAllContacts } = await supabase
        .from("network_contacts")
        .select("full_name, company, email, source")
        .eq("user_id", partnerId);

      const myEmails = new Map<string, typeof myAllContacts[0]>();
      (myAllContacts || []).forEach(c => {
        if (c.email) myEmails.set(c.email.toLowerCase(), c);
      });

      const emailMatches: Array<{ name: string; company: string; email: string; source_you: string; source_them: string }> = [];
      const seenEmails = new Set<string>();

      (partnerAllContacts || []).forEach(pc => {
        if (pc.email) {
          const key = pc.email.toLowerCase();
          const myMatch = myEmails.get(key);
          if (myMatch && !seenEmails.has(key)) {
            seenEmails.add(key);
            emailMatches.push({
              name: myMatch.full_name || pc.full_name || "Unknown",
              company: myMatch.company || pc.company || "",
              email: pc.email,
              source_you: myMatch.source,
              source_them: pc.source,
            });
          }
        }
      });

      // 6. Get canonical person details for shared IDs
      let sharedCanonicalDetails: Array<{ name: string; company: string; email: string }> = [];
      if (sharedIds.length > 0) {
        const { data: canonicals } = await supabase
          .from("canonical_persons")
          .select("display_name, company, primary_email")
          .in("id", sharedIds);

        sharedCanonicalDetails = (canonicals || []).map(c => ({
          name: c.display_name || "Unknown",
          company: c.company || "",
          email: c.primary_email || "",
        }));
      }

      // Merge and deduplicate
      const allShared = new Map<string, { name: string; company: string; email: string; context: string }>();

      sharedCanonicalDetails.forEach(c => {
        const key = (c.email || c.name).toLowerCase();
        if (!allShared.has(key)) {
          allShared.set(key, {
            name: c.name,
            company: c.company,
            email: c.email,
            context: "Matched via unified contact record",
          });
        }
      });

      emailMatches.forEach(c => {
        const key = c.email.toLowerCase();
        if (!allShared.has(key)) {
          allShared.set(key, {
            name: c.name,
            company: c.company,
            email: c.email,
            context: `You: ${c.source_you} · Them: ${c.source_them}`,
          });
        }
      });

      const shared = [...allShared.values()];
      const myTotal = (myAllContacts || []).length;
      const partnerTotal = (partnerAllContacts || []).length;

      // 7. Calculate partnership potential
      const overlapRatio = myTotal > 0 ? shared.length / myTotal : 0;
      let potential: "high" | "medium" | "low" = "low";
      if (shared.length >= 10 || overlapRatio >= 0.15) potential = "high";
      else if (shared.length >= 4 || overlapRatio >= 0.05) potential = "medium";

      return new Response(JSON.stringify({
        found: true,
        partner_name: partnerName,
        partner_agency: partnerAgency,
        your_contacts: myTotal,
        their_contacts: partnerTotal,
        shared_contacts: shared,
        overlap_count: shared.length,
        partnership_potential: potential,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // List platform users the current user might compare with
    if (action === "list_partners") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, agency_name, from_email, branch")
        .neq("user_id", user.id)
        .not("full_name", "is", null)
        .order("full_name")
        .limit(100);

      // Get emails for those users
      const { data: allUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const emailMap = new Map<string, string>();
      allUsers?.users?.forEach(u => {
        if (u.email) emailMap.set(u.id, u.email);
      });

      const partners = (profiles || []).map(p => ({
        user_id: p.user_id,
        name: p.full_name,
        agency: p.agency_name,
        email: emailMap.get(p.user_id) || p.from_email || "",
        branch: p.branch,
      })).filter(p => p.name && p.name !== "User");

      return new Response(JSON.stringify({ partners }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
