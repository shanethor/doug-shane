import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 5 test users ──
    const testUsers = [
      { email: "marcus.rivera@techforward.test", password: "AuraTest2024!", fullName: "Marcus Rivera", title: "VP of Sales", company: "TechForward Inc.", branch: "risk" },
      { email: "priya.patel@cloudbridge.test", password: "AuraTest2024!", fullName: "Priya Patel", title: "Dir. of Partnerships", company: "CloudBridge Solutions", branch: "risk" },
      { email: "james.whitfield@whitfieldcap.test", password: "AuraTest2024!", fullName: "James Whitfield", title: "Managing Director", company: "Whitfield Capital Group", branch: "wealth" },
      { email: "diana.cho@novaspark.test", password: "AuraTest2024!", fullName: "Diana Cho", title: "Head of BD", company: "NovaSpark AI", branch: "risk" },
      { email: "tom.nguyen@growthloop.test", password: "AuraTest2024!", fullName: "Tom Nguyen", title: "Enterprise AE", company: "GrowthLoop", branch: "risk" },
    ];

    const userIds: Record<string, string> = {};

    // Create auth users + profiles
    for (const u of testUsers) {
      // Check if user already exists
      const { data: existingUsers } = await admin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      
      if (existing) {
        userIds[u.email] = existing.id;
        // Update profile
        await admin.from("profiles").update({
          full_name: u.fullName,
          branch: u.branch,
        }).eq("user_id", existing.id);
        continue;
      }

      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.fullName },
      });

      if (authErr) throw new Error(`Failed to create ${u.email}: ${authErr.message}`);
      userIds[u.email] = authData.user.id;

      // Update profile with branch
      await admin.from("profiles").update({
        full_name: u.fullName,
        branch: u.branch,
      }).eq("user_id", authData.user.id);
    }

    // Give all users the 'advisor' role
    for (const uid of Object.values(userIds)) {
      await admin.from("user_roles").upsert(
        { user_id: uid, role: "advisor" },
        { onConflict: "user_id,role" }
      );
    }

    // Grant connect feature to all
    for (const uid of Object.values(userIds)) {
      const { data: existing } = await admin.from("user_features")
        .select("id").eq("user_id", uid).eq("feature", "connect").maybeSingle();
      if (!existing) {
        await admin.from("user_features").insert({
          user_id: uid, feature: "connect", notes: "Test seed data",
        });
      }
    }

    const marcus = userIds["marcus.rivera@techforward.test"];
    const priya = userIds["priya.patel@cloudbridge.test"];
    const james = userIds["james.whitfield@whitfieldcap.test"];
    const diana = userIds["diana.cho@novaspark.test"];
    const tom = userIds["tom.nguyen@growthloop.test"];

    // ── Network connections (simulated connected apps) ──
    const appConnections = [
      { user_id: marcus, source: "linkedin", status: "connected", contact_count: 847 },
      { user_id: marcus, source: "google", status: "connected", contact_count: 312 },
      { user_id: marcus, source: "hubspot", status: "connected", contact_count: 156 },
      { user_id: marcus, source: "google_calendar", status: "connected", contact_count: 0 },
      { user_id: priya, source: "linkedin", status: "connected", contact_count: 1203 },
      { user_id: priya, source: "google", status: "connected", contact_count: 445 },
      { user_id: priya, source: "outlook", status: "connected", contact_count: 210 },
      { user_id: priya, source: "salesforce", status: "connected", contact_count: 88 },
      { user_id: priya, source: "google_calendar", status: "connected", contact_count: 0 },
      { user_id: james, source: "linkedin", status: "connected", contact_count: 2100 },
      { user_id: james, source: "outlook", status: "connected", contact_count: 530 },
      { user_id: james, source: "salesforce", status: "connected", contact_count: 290 },
      { user_id: diana, source: "linkedin", status: "connected", contact_count: 950 },
      { user_id: diana, source: "google", status: "connected", contact_count: 278 },
      { user_id: diana, source: "hubspot", status: "connected", contact_count: 134 },
      { user_id: diana, source: "google_calendar", status: "connected", contact_count: 0 },
      { user_id: tom, source: "linkedin", status: "connected", contact_count: 620 },
      { user_id: tom, source: "google", status: "connected", contact_count: 189 },
      { user_id: tom, source: "salesforce", status: "connected", contact_count: 75 },
      { user_id: tom, source: "google_calendar", status: "connected", contact_count: 0 },
    ];

    // Clear old test connections first
    for (const uid of Object.values(userIds)) {
      await admin.from("network_connections").delete().eq("user_id", uid);
      await admin.from("network_contacts").delete().eq("user_id", uid);
      await admin.from("canonical_persons").delete().eq("owner_user_id", uid);
    }

    // Insert app connections
    for (const conn of appConnections) {
      await admin.from("network_connections").insert({
        ...conn,
        last_sync_at: new Date().toISOString(),
        metadata: { test_seed: true },
      });
    }

    // ── Target: Rachel Odom ──
    const rachelData = { full_name: "Rachel Odom", email: "rachel@odomventures.com", company: "Odom Ventures", title: "CEO", location: "New York, NY", linkedin_url: "https://linkedin.com/in/rachelodom" };

    // ── Shared contacts (people who appear in multiple users' networks) ──
    // These create the cross-referencing connections AURA Connect needs

    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

    // ── Marcus's contacts ──
    const marcusContacts = [
      // Knows Priya (former colleague, strong)
      { user_id: marcus, full_name: "Priya Patel", email: "priya.patel@cloudbridge.test", company: "CloudBridge Solutions", title: "Dir. of Partnerships", source: "linkedin", linkedin_url: "https://linkedin.com/in/priyapatel", metadata: { strength: 5, last_interaction: daysAgo(14), interaction_count: 47, relationship: "former_colleague", channel_mix: ["email", "linkedin", "calendar"], notes: "Worked together at TechForward 2019-2022" } },
      { user_id: marcus, full_name: "Priya Patel", email: "priya.patel@cloudbridge.test", company: "CloudBridge Solutions", title: "Dir. of Partnerships", source: "google", metadata: { strength: 5, email_count_90d: 23, last_email: daysAgo(14) } },
      // Knows James (CRM client, strong)
      { user_id: marcus, full_name: "James Whitfield", email: "james.whitfield@whitfieldcap.test", company: "Whitfield Capital Group", title: "Managing Director", source: "linkedin", linkedin_url: "https://linkedin.com/in/jameswhitfield", metadata: { strength: 4, last_interaction: daysAgo(30), interaction_count: 18, relationship: "client", notes: "Key client since 2022" } },
      { user_id: marcus, full_name: "James Whitfield", email: "james.whitfield@whitfieldcap.test", company: "Whitfield Capital Group", title: "Managing Director", source: "hubspot", metadata: { strength: 4, deal_count: 3, total_revenue: 125000, last_activity: daysAgo(30), relationship: "client" } },
      // Knows Diana (quarterly calls, moderate)
      { user_id: marcus, full_name: "Diana Cho", email: "diana.cho@novaspark.test", company: "NovaSpark AI", title: "Head of BD", source: "google", metadata: { strength: 3, email_count_90d: 8, last_email: daysAgo(45), notes: "Quarterly calls" } },
      { user_id: marcus, full_name: "Diana Cho", email: "diana.cho@novaspark.test", company: "NovaSpark AI", title: "Head of BD", source: "google_calendar", metadata: { strength: 3, meeting_count_90d: 2, last_meeting: daysAgo(45) } },
      // Knows Tom (LinkedIn only, weak)
      { user_id: marcus, full_name: "Tom Nguyen", email: "tom.nguyen@growthloop.test", company: "GrowthLoop", title: "Enterprise AE", source: "linkedin", linkedin_url: "https://linkedin.com/in/tomnguyen", metadata: { strength: 2, last_interaction: daysAgo(180), interaction_count: 3, notes: "Connected at conference 2023, dormant" } },
      // Other contacts in Marcus's network
      { user_id: marcus, full_name: "Sarah Chen", email: "sarah.chen@finova.com", company: "Finova Capital", title: "CFO", source: "hubspot", metadata: { strength: 4, relationship: "prospect", deal_stage: "negotiation" } },
      { user_id: marcus, full_name: "David Park", email: "david.park@meridian.com", company: "Meridian Group", title: "VP Operations", source: "linkedin", metadata: { strength: 3, relationship: "partner" } },
      { user_id: marcus, full_name: "Lisa Thompson", email: "lisa.t@insurance-advisors.com", company: "Insurance Advisors LLC", title: "Senior Broker", source: "google", metadata: { strength: 4, relationship: "COI", email_count_90d: 15 } },
    ];

    // ── Priya's contacts ──
    const priyaContacts = [
      // Knows Marcus (former colleague)
      { user_id: priya, full_name: "Marcus Rivera", email: "marcus.rivera@techforward.test", company: "TechForward Inc.", title: "VP of Sales", source: "linkedin", metadata: { strength: 5, last_interaction: daysAgo(14), relationship: "former_colleague" } },
      { user_id: priya, full_name: "Marcus Rivera", email: "marcus.rivera@techforward.test", company: "TechForward Inc.", title: "VP of Sales", source: "google", metadata: { strength: 5, email_count_90d: 23, last_email: daysAgo(14) } },
      // Knows Rachel Odom (FinTech Summit)
      { user_id: priya, ...rachelData, source: "linkedin", metadata: { strength: 3, last_interaction: daysAgo(60), interaction_count: 5, relationship: "event_connection", notes: "Met at FinTech Summit 2024, exchanged cards, connected on LinkedIn" } },
      // Knows Diana (close friend)
      { user_id: priya, full_name: "Diana Cho", email: "diana.cho@novaspark.test", company: "NovaSpark AI", title: "Head of BD", source: "linkedin", metadata: { strength: 5, last_interaction: daysAgo(7), interaction_count: 89, relationship: "close_friend", notes: "College roommates, talk weekly" } },
      { user_id: priya, full_name: "Diana Cho", email: "diana.cho@novaspark.test", company: "NovaSpark AI", title: "Head of BD", source: "google", metadata: { strength: 5, email_count_90d: 31, last_email: daysAgo(3) } },
      // Knows Tom (moderate)
      { user_id: priya, full_name: "Tom Nguyen", email: "tom.nguyen@growthloop.test", company: "GrowthLoop", title: "Enterprise AE", source: "salesforce", metadata: { strength: 3, relationship: "partner_contact", deal_count: 1 } },
      // Other contacts
      { user_id: priya, full_name: "Michael Torres", email: "mtorres@suncoast.com", company: "Suncoast Realty", title: "Broker", source: "linkedin", metadata: { strength: 3, relationship: "referral_partner" } },
      { user_id: priya, full_name: "Sarah Chen", email: "sarah.chen@finova.com", company: "Finova Capital", title: "CFO", source: "linkedin", metadata: { strength: 2, relationship: "acquaintance", notes: "2nd degree via Marcus" } },
    ];

    // ── James's contacts ──
    const jamesContacts = [
      // Knows Marcus (client relationship)
      { user_id: james, full_name: "Marcus Rivera", email: "marcus.rivera@techforward.test", company: "TechForward Inc.", title: "VP of Sales", source: "linkedin", metadata: { strength: 4, last_interaction: daysAgo(30), relationship: "vendor" } },
      { user_id: james, full_name: "Marcus Rivera", email: "marcus.rivera@techforward.test", company: "TechForward Inc.", title: "VP of Sales", source: "salesforce", metadata: { strength: 4, relationship: "vendor", deal_count: 3 } },
      // Knows Rachel Odom (co-investor, STRONG)
      { user_id: james, ...rachelData, source: "linkedin", metadata: { strength: 5, last_interaction: daysAgo(21), interaction_count: 34, relationship: "co_investor", notes: "Co-invested in Series B of DataMesh 2023, regular deal flow sharing" } },
      { user_id: james, ...rachelData, source: "outlook", metadata: { strength: 5, email_count_90d: 12, last_email: daysAgo(21), notes: "Active co-investor relationship" } },
      // Knows Priya (weak, met once)
      { user_id: james, full_name: "Priya Patel", email: "priya.patel@cloudbridge.test", company: "CloudBridge Solutions", title: "Dir. of Partnerships", source: "linkedin", metadata: { strength: 2, last_interaction: daysAgo(120), relationship: "acquaintance" } },
      // Other contacts
      { user_id: james, full_name: "Robert Kim", email: "rkim@pacificequity.com", company: "Pacific Equity Partners", title: "Partner", source: "outlook", metadata: { strength: 5, relationship: "co_investor", email_count_90d: 28 } },
      { user_id: james, full_name: "Amanda Foster", email: "afoster@legacywealth.com", company: "Legacy Wealth Advisors", title: "Principal", source: "salesforce", metadata: { strength: 4, relationship: "client" } },
      { user_id: james, full_name: "David Park", email: "david.park@meridian.com", company: "Meridian Group", title: "VP Operations", source: "linkedin", metadata: { strength: 3, relationship: "portfolio_company", notes: "Board observer on Meridian deal" } },
    ];

    // ── Diana's contacts ──
    const dianaContacts = [
      // Knows Marcus (moderate)
      { user_id: diana, full_name: "Marcus Rivera", email: "marcus.rivera@techforward.test", company: "TechForward Inc.", title: "VP of Sales", source: "google", metadata: { strength: 3, email_count_90d: 8, last_email: daysAgo(45) } },
      // Knows Priya (close friend)
      { user_id: diana, full_name: "Priya Patel", email: "priya.patel@cloudbridge.test", company: "CloudBridge Solutions", title: "Dir. of Partnerships", source: "linkedin", metadata: { strength: 5, last_interaction: daysAgo(3), relationship: "close_friend" } },
      { user_id: diana, full_name: "Priya Patel", email: "priya.patel@cloudbridge.test", company: "CloudBridge Solutions", title: "Dir. of Partnerships", source: "google", metadata: { strength: 5, email_count_90d: 31, last_email: daysAgo(3) } },
      // Knows Rachel Odom (weak, AI Summit)
      { user_id: diana, ...rachelData, source: "linkedin", metadata: { strength: 2, last_interaction: daysAgo(90), interaction_count: 2, relationship: "event_connection", notes: "Connected at AI Summit 2024, brief conversation" } },
      // Knows Tom (moderate, partnership talks)
      { user_id: diana, full_name: "Tom Nguyen", email: "tom.nguyen@growthloop.test", company: "GrowthLoop", title: "Enterprise AE", source: "hubspot", metadata: { strength: 3, relationship: "partnership_prospect", deal_count: 1, notes: "Exploring integration partnership" } },
      // Other contacts
      { user_id: diana, full_name: "Sarah Chen", email: "sarah.chen@finova.com", company: "Finova Capital", title: "CFO", source: "google", metadata: { strength: 3, relationship: "prospect", notes: "Pitched NovaSpark platform" } },
      { user_id: diana, full_name: "Lisa Thompson", email: "lisa.t@insurance-advisors.com", company: "Insurance Advisors LLC", title: "Senior Broker", source: "linkedin", metadata: { strength: 2, notes: "Connected via industry group" } },
    ];

    // ── Tom's contacts ──
    const tomContacts = [
      // Knows Marcus (weak, LinkedIn only)
      { user_id: tom, full_name: "Marcus Rivera", email: "marcus.rivera@techforward.test", company: "TechForward Inc.", title: "VP of Sales", source: "linkedin", metadata: { strength: 2, last_interaction: daysAgo(180), relationship: "acquaintance" } },
      // Knows Rachel Odom (weak, MarTech Summit)
      { user_id: tom, ...rachelData, source: "google", metadata: { strength: 2, email_count_90d: 2, last_email: daysAgo(120), notes: "Exchanged emails after MarTech Summit, went cold" } },
      // Knows Priya (moderate, partner contact)
      { user_id: tom, full_name: "Priya Patel", email: "priya.patel@cloudbridge.test", company: "CloudBridge Solutions", title: "Dir. of Partnerships", source: "salesforce", metadata: { strength: 3, relationship: "partner_contact" } },
      // Knows Diana (moderate)
      { user_id: tom, full_name: "Diana Cho", email: "diana.cho@novaspark.test", company: "NovaSpark AI", title: "Head of BD", source: "google", metadata: { strength: 3, email_count_90d: 5, last_email: daysAgo(30) } },
      // Other contacts
      { user_id: tom, full_name: "Michael Torres", email: "mtorres@suncoast.com", company: "Suncoast Realty", title: "Broker", source: "google", metadata: { strength: 2, relationship: "cold_outreach" } },
      { user_id: tom, full_name: "Robert Kim", email: "rkim@pacificequity.com", company: "Pacific Equity Partners", title: "Partner", source: "linkedin", metadata: { strength: 1, notes: "2nd degree connection" } },
    ];

    // Insert all contacts
    const allContacts = [...marcusContacts, ...priyaContacts, ...jamesContacts, ...dianaContacts, ...tomContacts];
    
    for (const contact of allContacts) {
      await admin.from("network_contacts").insert(contact);
    }

    // ── Create canonical persons for shared contacts (cross-user dedup targets) ──
    // Rachel Odom - the primary target, appears in James's, Priya's, Diana's, and Tom's networks
    const sharedPersons = [
      { display_name: "Rachel Odom", primary_email: "rachel@odomventures.com", company: "Odom Ventures", title: "CEO", location: "New York, NY", linkedin_url: "https://linkedin.com/in/rachelodom", is_business_owner: true, tier: "A", owner_user_id: james },
      { display_name: "Sarah Chen", primary_email: "sarah.chen@finova.com", company: "Finova Capital", title: "CFO", tier: "B", owner_user_id: marcus },
      { display_name: "David Park", primary_email: "david.park@meridian.com", company: "Meridian Group", title: "VP Operations", tier: "B", owner_user_id: marcus },
      { display_name: "Lisa Thompson", primary_email: "lisa.t@insurance-advisors.com", company: "Insurance Advisors LLC", title: "Senior Broker", tier: "B", owner_user_id: marcus },
      { display_name: "Michael Torres", primary_email: "mtorres@suncoast.com", company: "Suncoast Realty", title: "Broker", tier: "C", owner_user_id: priya },
      { display_name: "Robert Kim", primary_email: "rkim@pacificequity.com", company: "Pacific Equity Partners", title: "Partner", tier: "A", owner_user_id: james },
      { display_name: "Amanda Foster", primary_email: "afoster@legacywealth.com", company: "Legacy Wealth Advisors", title: "Principal", tier: "B", owner_user_id: james },
    ];

    const canonicalIds: Record<string, string> = {};
    for (const person of sharedPersons) {
      const { data } = await admin.from("canonical_persons").insert(person).select("id").single();
      if (data) canonicalIds[person.primary_email] = data.id;
    }

    // Link network_contacts to canonical_persons where emails match
    for (const email of Object.keys(canonicalIds)) {
      await admin.from("network_contacts")
        .update({ canonical_person_id: canonicalIds[email] })
        .eq("email", email);
    }

    // ── Summary ──
    const summary = {
      users_created: Object.entries(userIds).map(([email, id]) => ({ email, id })),
      network_connections_created: appConnections.length,
      contacts_created: allContacts.length,
      canonical_persons_created: sharedPersons.length,
      login_credentials: {
        password: "AuraTest2024!",
        note: "All test users share this password",
      },
      test_scenario: "Log in as Marcus Rivera and search for 'Rachel Odom' in AURA Connect to see warm path suggestions through James (strongest), Priya, Diana, and Tom.",
    };

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
