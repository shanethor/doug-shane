// Signal v2: hand-curated source map per industry (matches connect-verticals IDs)
// Each industry has Tier 1 (always pull) + Tier 2 (pull if configured).
// Public Nitter instances rotate to handle flakiness.

export type IndustryConfig = {
  rss_news: string[];
  reddit: string[];          // subreddit names without leading r/
  nitter_handles: string[];  // X handles without @
  substack: string[];
  regulatory: string[];
  podcast_rss: string[];
};

export const NITTER_INSTANCES = [
  "https://nitter.net",
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.kavin.rocks",
];

const newsQuery = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

const insurance: IndustryConfig = {
  rss_news: [
    newsQuery("insurance industry"),
    newsQuery("commercial insurance"),
    newsQuery("p&c insurance carrier"),
    newsQuery("insurance regulation"),
    newsQuery("insurance acquisition OR merger"),
    newsQuery("insurance technology insurtech"),
    "https://www.insurancejournal.com/feed/",
    "https://www.coverager.com/feed/",
    "https://riskandinsurance.com/feed/",
    "https://www.propertycasualty360.com/feed/",
    "https://www.insurancebusinessmag.com/us/rss/news.aspx",
  ],
  reddit: ["Insurance", "InsuranceAgent", "InsuranceClaims"],
  nitter_handles: ["InsuranceJrnl", "coverager", "willistowerswatson", "AonPLC", "MarshMcLennan"],
  substack: [],
  regulatory: ["https://content.naic.org/rss.xml"],
  podcast_rss: [],
};

const real_estate: IndustryConfig = {
  rss_news: [
    newsQuery("commercial real estate"),
    newsQuery("real estate market trends"),
    newsQuery("property investment"),
    newsQuery("CRE financing"),
    "https://therealdeal.com/feed/",
    "https://www.bisnow.com/rss",
    "https://www.globest.com/feed/",
  ],
  reddit: ["realestate", "CommercialRealEstate", "RealEstateInvesting"],
  nitter_handles: ["TheRealDeal", "Bisnow", "globestnews"],
  substack: [],
  regulatory: [],
  podcast_rss: [],
};

const trucking: IndustryConfig = {
  rss_news: [
    newsQuery("trucking industry"),
    newsQuery("FMCSA regulation"),
    newsQuery("freight broker"),
    newsQuery("commercial trucking insurance"),
    "https://www.truckinginfo.com/rss",
    "https://www.ttnews.com/rss.xml",
    "https://www.freightwaves.com/feed",
  ],
  reddit: ["Truckers", "TruckingIndustry", "FreightBrokers"],
  nitter_handles: ["FreightWaves", "TTNews", "OOIDA"],
  substack: [],
  regulatory: [],
  podcast_rss: [],
};

const contractors: IndustryConfig = {
  rss_news: [
    newsQuery("construction industry"),
    newsQuery("contractor licensing"),
    newsQuery("HVAC roofing plumbing"),
    newsQuery("OSHA construction"),
    "https://www.constructiondive.com/feeds/news/",
    "https://www.enr.com/rss/articles/3-construction-news",
  ],
  reddit: ["Construction", "Contractor", "HVAC", "Roofing", "Plumbing"],
  nitter_handles: ["ConstructDive", "ENRnews"],
  substack: [],
  regulatory: [],
  podcast_rss: [],
};

const generic = (label: string): IndustryConfig => ({
  rss_news: [
    newsQuery(`${label} industry`),
    newsQuery(`${label} regulation OR lawsuit`),
    newsQuery(`${label} trends 2026`),
    newsQuery(`${label} acquisition OR funding`),
  ],
  reddit: [],
  nitter_handles: [],
  substack: [],
  regulatory: [],
  podcast_rss: [],
});

export const INDUSTRY_SOURCES: Record<string, IndustryConfig> = {
  insurance,
  real_estate,
  trucking,
  contractors,
  hospitality: generic("hospitality"),
  healthcare: generic("healthcare"),
  professional_services: generic("professional services"),
  technology: { ...generic("technology software"), reddit: ["technology", "startups"] },
  manufacturing: generic("manufacturing"),
  specialty_es: generic("specialty insurance E&S"),
  nonprofit: generic("nonprofit"),
  agriculture: generic("agriculture"),
  transportation_hire: generic("transportation"),
  life_sciences: generic("life sciences pharma"),
  energy: generic("energy oil gas"),
  moving_storage: generic("moving storage"),
  franchise: generic("franchise business"),
  life_insurance: generic("life insurance"),
};

export function getSourceConfig(industry: string): IndustryConfig {
  return INDUSTRY_SOURCES[industry] || INDUSTRY_SOURCES.insurance;
}

export const ALL_INDUSTRIES = Object.keys(INDUSTRY_SOURCES);

// Tier-1 publication names → boost in fallback scoring
export const TIER_1_SOURCES = new Set([
  "Reuters", "Bloomberg", "Wall Street Journal", "WSJ", "Financial Times",
  "Insurance Journal", "Risk & Insurance", "Coverager",
  "FreightWaves", "Construction Dive", "ENR",
  "NAIC", "SEC",
]);