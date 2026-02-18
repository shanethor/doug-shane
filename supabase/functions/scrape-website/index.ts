import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping URL:", formattedUrl);

    // Step 1: Scrape the website with Firecrawl
    const scrapeResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const scrapeData = await scrapeResp.json();
    if (!scrapeResp.ok) {
      console.error("Firecrawl error:", scrapeData);
      return new Response(
        JSON.stringify({ error: `Failed to scrape: ${scrapeData.error || scrapeResp.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    if (!markdown) {
      return new Response(
        JSON.stringify({ error: "No content found on page", scraped_content: "", extracted_data: {} }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Scraped ${markdown.length} chars from ${formattedUrl}`);

    // Step 2: Use AI to extract insurance-relevant business data from the scraped content
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting business information from websites for commercial insurance applications.
Given website content, extract ALL available business details that would be relevant for filling ACORD insurance forms.

Return a JSON object with these field keys (only include fields you can find or confidently infer):
- applicant_name / company_name
- dba_name 
- mailing_address, city, state, zip
- phone, email, website
- business_type (Corporation, LLC, Sole Proprietor, etc.)
- description_of_operations
- nature_of_business
- business_category (Restaurant, Contractor, Retail, Service, etc.)
- annual_revenue (estimate if implied)
- number_of_employees (estimate if mentioned)
- year_established / date_business_started
- square_footage
- premises_owned_or_leased
- services_offered (array)
- hours_of_operation
- locations_count
- fein (if visible)
- sic_code, naics_code (infer from business type)
- coverage_types_needed (infer: e.g. restaurant → GL, Property, WC, Liquor Liability)
- Any other insurance-relevant details

Be thorough. Extract phone numbers, addresses, business hours, menu items (for restaurants), service lists, team size, etc.
Return ONLY a valid JSON object. No explanations.`,
          },
          {
            role: "user",
            content: `Website URL: ${formattedUrl}\nPage title: ${metadata.title || ""}\n\nWebsite content:\n${markdown.slice(0, 15000)}`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI extraction error:", aiResp.status, errText);
      // Return scraped content even if AI fails
      return new Response(
        JSON.stringify({ scraped_content: markdown.slice(0, 5000), extracted_data: {}, source_url: formattedUrl }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await aiResp.json();
    const content = aiResult.choices?.[0]?.message?.content || "{}";

    let extractedData: Record<string, any> = {};
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      extractedData = JSON.parse(jsonMatch[1].trim());
    } catch {
      console.error("Failed to parse AI extraction:", content);
    }

    // Always include source URL
    extractedData.website = extractedData.website || formattedUrl;

    return new Response(
      JSON.stringify({
        scraped_content: markdown.slice(0, 5000),
        extracted_data: extractedData,
        source_url: formattedUrl,
        page_title: metadata.title || "",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("scrape-website error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
