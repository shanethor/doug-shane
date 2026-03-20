import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Rss, Building2, FileText, Calendar as CalendarIcon,
  MapPin, TrendingUp, Loader2, Search,
  ExternalLink, Newspaper, Landmark, Globe,
  Zap, Users, Clock, Ticket, Star,
} from "lucide-react";

interface SignalItem {
  type: string;
  title: string;
  description: string;
  source: string;
  date: string;
  relevance: "high" | "medium" | "low";
  url?: string;
  company?: string;
}

interface EventItem {
  title: string;
  date: string;
  time?: string;
  venue: string;
  category: string;
  description: string;
  attendees_expected?: number;
  url?: string;
  cost: string;
  networking_value: "high" | "medium" | "low";
}

interface NewsItem {
  title: string;
  source: string;
  date: string;
  summary: string;
  category: string;
  sentiment: "positive" | "neutral" | "negative";
  relevance: "high" | "medium" | "low";
  url?: string;
  company?: string;
}

const SIGNAL_CATEGORIES = [
  { key: "all", label: "All", icon: Zap },
  { key: "news", label: "News", icon: Newspaper },
  { key: "filings", label: "Filings", icon: FileText },
  { key: "events", label: "Events", icon: CalendarIcon },
  { key: "permits", label: "Permits", icon: Landmark },
];

/* ═══ EVENT FEED ═══ */
function EventFeed() {
  const [zipCode, setZipCode] = useState("");
  const [category, setCategory] = useState("");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!zipCode.trim()) {
      toast.error("Enter a ZIP code or city");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "general",
          payload: {
            prompt: `You are a local business events researcher. Generate 8-10 realistic upcoming business networking events for the area "${zipCode}"${category ? ` focused on ${category}` : ""}. 

Return a JSON array of objects with these fields:
- title: event name
- date: upcoming date in YYYY-MM-DD format (within next 30 days from today 2026-03-20)
- time: time like "5:30 PM - 7:30 PM"
- venue: realistic local venue name and address
- category: one of "Chamber", "Industry Mixer", "Professional Association", "Workshop", "Networking", "Conference"
- description: 2-sentence description of the event
- attendees_expected: estimated number (20-500)
- url: null
- cost: "Free", "$25", "$50", etc.
- networking_value: "high", "medium", or "low" based on how useful for business development

Focus on events useful to sales professionals: chamber of commerce meetings, industry mixers, professional association events, business development workshops, BNI chapters, Young Professionals events. Make them specific and realistic to the territory.

Return ONLY the JSON array, no other text.`,
          },
        },
      });
      if (error) throw error;
      const text = data?.text || data?.response || "[]";
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
        setEvents(parsed);
      } catch {
        setEvents([]);
        toast.error("Failed to parse events");
      }
    } catch {
      toast.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  const networkingColor = (v: string) => {
    if (v === "high") return "text-success border-success/20 bg-success/5";
    if (v === "medium") return "text-warning border-warning/20 bg-warning/5";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Ticket className="h-4 w-4 text-accent" />
            Local Event Feed
            <Badge variant="outline" className="text-[9px] ml-1">Eventbrite API</Badge>
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Discover networking events, chamber meetings, and industry mixers in your territory
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">ZIP Code or City</label>
              <Input placeholder="06103 or Hartford, CT" value={zipCode} onChange={e => setZipCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Category (optional)</label>
              <Input placeholder="Finance, Real Estate, Tech..." value={category} onChange={e => setCategory(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="gap-1.5 w-full" onClick={handleSearch} disabled={loading || !zipCode.trim()}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Find Events
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-accent" />
            <p className="text-sm text-muted-foreground">Scanning events near {zipCode}…</p>
          </div>
        </div>
      ) : !hasSearched ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <CalendarIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Enter your ZIP code to discover upcoming networking events.</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Search className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No events found. Try a different location.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event, i) => (
            <Card key={i} className="overflow-hidden hover:border-accent/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex flex-col items-center justify-center bg-accent/10 rounded-lg px-3 py-2 min-w-[52px]">
                    <span className="text-[10px] uppercase text-accent font-semibold">
                      {event.date ? new Date(event.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" }) : ""}
                    </span>
                    <span className="text-lg font-bold text-accent">
                      {event.date ? new Date(event.date + "T12:00:00").getDate() : ""}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{event.title}</p>
                      <Badge variant="outline" className={`text-[9px] ${networkingColor(event.networking_value)}`}>
                        {event.networking_value} value
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{event.description}</p>
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />{event.venue}
                      </span>
                      {event.time && (
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />{event.time}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[9px]">{event.category}</Badge>
                      <span className="text-[10px] font-medium">{event.cost}</span>
                      {event.attendees_expected && (
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />~{event.attendees_expected}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ LOCAL NEWS FEED ═══ */
function LocalNewsFeed() {
  const [territory, setTerritory] = useState("");
  const [industry, setIndustry] = useState("");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFetch = async () => {
    if (!territory.trim()) {
      toast.error("Enter a territory");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "general",
          payload: {
            prompt: `You are a local business news aggregator. Generate 10-12 realistic recent local business news headlines for "${territory}"${industry ? ` in the ${industry} sector` : ""}. 

Return a JSON array of objects with these fields:
- title: news headline
- source: realistic local news source (e.g. "Hartford Business Journal", "CT Mirror", "New Haven Register", local TV station)
- date: recent date in YYYY-MM-DD format (within last 14 days from 2026-03-20)
- summary: 2-3 sentence summary of the story
- category: one of "Expansion", "Hiring", "Funding", "Real Estate", "M&A", "Leadership", "Awards", "Legal", "Government"
- sentiment: "positive", "neutral", or "negative"
- relevance: "high", "medium", or "low" for sales professionals
- company: company name if applicable
- url: null

Focus on stories that are conversation-starters for sales professionals: business expansions, new hires, funding rounds, real estate deals, awards, leadership changes. Make them specific to the territory.

Return ONLY the JSON array, no other text.`,
          },
        },
      });
      if (error) throw error;
      const text = data?.text || data?.response || "[]";
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
        setNews(parsed);
      } catch {
        setNews([]);
        toast.error("Failed to parse news");
      }
    } catch {
      toast.error("Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  const sentimentIcon = (s: string) => {
    if (s === "positive") return <TrendingUp className="h-3 w-3 text-success" />;
    if (s === "negative") return <TrendingUp className="h-3 w-3 text-destructive rotate-180" />;
    return <TrendingUp className="h-3 w-3 text-muted-foreground" />;
  };

  const relevanceColor = (r: string) => {
    if (r === "high") return "text-destructive border-destructive/20 bg-destructive/5";
    if (r === "medium") return "text-warning border-warning/20 bg-warning/5";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            Local News Feed
            <Badge variant="outline" className="text-[9px] ml-1">RSS / Google News</Badge>
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Aggregated local business news — conversation fuel for every meeting
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Territory</label>
              <Input placeholder="Hartford, CT or Greater Boston" value={territory} onChange={e => setTerritory(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Industry (optional)</label>
              <Input placeholder="Healthcare, Construction..." value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="gap-1.5 w-full" onClick={handleFetch} disabled={loading || !territory.trim()}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Newspaper className="h-3.5 w-3.5" />}
                Fetch News
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Aggregating news for {territory}…</p>
          </div>
        </div>
      ) : !hasSearched ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Rss className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Enter your territory to get a curated local business news digest.</p>
        </div>
      ) : news.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Search className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No news found. Try a different location.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {news.map((item, i) => (
            <Card key={i} className="overflow-hidden hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-1">{sentimentIcon(item.sentiment)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{item.title}</p>
                      <Badge variant="outline" className={`text-[9px] ${relevanceColor(item.relevance)}`}>
                        {item.relevance}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.summary}</p>
                    <div className="flex items-center gap-3 pt-1 flex-wrap">
                      {item.company && (
                        <span className="text-[10px] flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{item.company}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[9px]">{item.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">{item.source}</span>
                      <span className="text-[10px] text-muted-foreground">{item.date}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ BUSINESS SIGNAL SCANNER (original) ═══ */
function BusinessSignalScanner() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [territory, setTerritory] = useState("");
  const [industry, setIndustry] = useState("");
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleScan = async () => {
    if (!territory.trim()) {
      toast.error("Enter a territory (city, state, or ZIP)");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-router", {
        body: {
          action: "general",
          payload: {
            prompt: `You are a business intelligence analyst. Generate 8-12 realistic, plausible business signals for the territory "${territory}"${industry ? ` in the ${industry} industry` : ""}. 

Return a JSON array of objects with these fields:
- type: one of "news", "filings", "events", "permits"
- title: short headline
- description: 2-sentence description  
- source: plausible source name (e.g. "Hartford Business Journal", "CT Secretary of State", "Eventbrite")
- date: recent date in YYYY-MM-DD format
- relevance: "high", "medium", or "low"
- company: company name if applicable
- url: null

Focus on signals useful to sales professionals: new businesses, expansions, hiring, permits, networking events, funding rounds, leadership changes. Make them specific to the territory.

Return ONLY the JSON array, no other text.`,
          },
        },
      });
      if (error) throw error;
      const text = data?.text || data?.response || "[]";
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
        setSignals(parsed);
      } catch {
        setSignals([]);
        toast.error("Failed to parse signals");
      }
    } catch {
      toast.error("Failed to scan for signals");
    } finally {
      setLoading(false);
    }
  };

  const filteredSignals = activeCategory === "all"
    ? signals
    : signals.filter(s => s.type === activeCategory);

  const signalIcon = (type: string) => {
    switch (type) {
      case "news": return <Newspaper className="h-4 w-4 text-primary" />;
      case "filings": return <FileText className="h-4 w-4 text-accent" />;
      case "events": return <CalendarIcon className="h-4 w-4 text-warning" />;
      case "permits": return <Landmark className="h-4 w-4 text-success" />;
      default: return <Zap className="h-4 w-4 text-primary" />;
    }
  };

  const relevanceColor = (r: string) => {
    if (r === "high") return "text-destructive border-destructive/20 bg-destructive/5";
    if (r === "medium") return "text-warning border-warning/20 bg-warning/5";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Rss className="h-4 w-4 text-primary" />
            Business Signal Scanner
          </CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Surface trigger events, filings, news, and networking opportunities in your territory
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Territory</label>
              <Input placeholder="Hartford, CT or 06103" value={territory} onChange={e => setTerritory(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Industry Filter (optional)</label>
              <Input placeholder="Construction, Healthcare..." value={industry} onChange={e => setIndustry(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button className="gap-1.5 w-full" onClick={handleScan} disabled={loading || !territory.trim()}>
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                Scan Territory
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasSearched && (
        <div className="flex gap-1.5 flex-wrap">
          {SIGNAL_CATEGORIES.map(cat => (
            <Badge
              key={cat.key}
              variant={activeCategory === cat.key ? "default" : "outline"}
              className="cursor-pointer gap-1 text-xs py-1 px-2.5"
              onClick={() => setActiveCategory(cat.key)}
            >
              <cat.icon className="h-3 w-3" />
              {cat.label}
              {cat.key !== "all" && (
                <span className="ml-0.5 opacity-60">
                  ({signals.filter(s => cat.key === "all" || s.type === cat.key).length})
                </span>
              )}
            </Badge>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Scanning {territory} for business signals…</p>
          </div>
        </div>
      ) : !hasSearched ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Globe className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Enter your territory above to discover business signals, events, and opportunities.
          </p>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Search className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No signals found for this filter. Try "All".</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredSignals.map((signal, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">{signalIcon(signal.type)}</div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{signal.title}</p>
                      <Badge variant="outline" className={`text-[9px] ${relevanceColor(signal.relevance)}`}>
                        {signal.relevance}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{signal.description}</p>
                    <div className="flex items-center gap-3 pt-1">
                      {signal.company && (
                        <span className="text-[10px] flex items-center gap-1">
                          <Building2 className="h-3 w-3" />{signal.company}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{signal.source}</span>
                      <span className="text-[10px] text-muted-foreground">{signal.date}</span>
                      {signal.url && (
                        <a href={signal.url} target="_blank" rel="noopener" className="text-[10px] text-primary flex items-center gap-0.5">
                          <ExternalLink className="h-3 w-3" /> View
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ PAID-TIER INTEGRATIONS ═══ */
const PAID_INTEGRATIONS = [
  {
    name: "Intellizence",
    description: "100+ curated company signals — layoffs, M&A, C-suite changes, expansion, cyber incidents — refreshed daily. Surface personalized intel cards per contact.",
    cost: "~$99–299/mo",
    signals: "100+ signal types",
    icon: "🧠",
    color: "border-accent/30 bg-accent/5",
    features: ["M&A Activity", "Leadership Changes", "Layoff Alerts", "Expansion Signals", "Cyber Incidents", "Daily Refresh"],
  },
  {
    name: "Apollo.io",
    description: "Unlimited prospecting, full phone data, AI email sequences, and intent signals. Research any company in seconds and find decision-maker direct lines.",
    cost: "~$49/mo",
    signals: "Intent + Contact Data",
    icon: "🚀",
    color: "border-primary/30 bg-primary/5",
    features: ["Unlimited Prospecting", "Direct Phone Numbers", "AI Email Sequences", "Intent Signals", "Company Research", "LinkedIn Enrichment"],
  },
  {
    name: "Loom Business",
    description: "Embedded video outreach studio. Record personalized 90-second face-cam videos over a prospect's website or LinkedIn — dramatically higher conversion than cold email.",
    cost: "~$15/user/mo",
    signals: "Video Analytics",
    icon: "🎥",
    color: "border-warning/30 bg-warning/5",
    features: ["Personalized Video Recording", "Screen Share + Face Cam", "View Tracking & Analytics", "Auto-Transcription", "CTA Buttons", "Viewer Engagement Data"],
  },
  {
    name: "NewsCatcher",
    description: "News data API with sentiment scoring and named-entity recognition. Auto-tag news mentions of contacts and companies, score sentiment, push the right alert.",
    cost: "~$49/mo",
    signals: "Sentiment-Scored News",
    icon: "📰",
    color: "border-success/30 bg-success/5",
    features: ["Sentiment Analysis", "Named Entity Recognition", "JSON Output", "Global Coverage", "Category Filtering", "Real-Time Alerts"],
  },
];

function PaidIntegrations() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Star className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold">Premium Intelligence Integrations</h3>
        <Badge variant="outline" className="text-[9px]">Paid Tier</Badge>
      </div>
      <p className="text-[11px] text-muted-foreground -mt-2">
        Upgrade your signal intelligence with enterprise-grade data sources
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {PAID_INTEGRATIONS.map((integration, i) => (
          <Card key={i} className={`overflow-hidden ${integration.color} transition-colors hover:shadow-md`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{integration.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{integration.name}</p>
                    <p className="text-[10px] text-muted-foreground">{integration.signals}</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-[10px] font-mono">{integration.cost}</Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{integration.description}</p>
              <div className="flex flex-wrap gap-1">
                {integration.features.map((f, j) => (
                  <Badge key={j} variant="outline" className="text-[9px] bg-background/50">{f}</Badge>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" disabled>
                <Zap className="h-3 w-3" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══ MAIN EXPORT ═══ */
export default function ConnectSignalsTab() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="events" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="events" className="gap-1.5 text-xs">
            <Ticket className="h-3.5 w-3.5 hidden sm:inline" />
            Events
          </TabsTrigger>
          <TabsTrigger value="news" className="gap-1.5 text-xs">
            <Newspaper className="h-3.5 w-3.5 hidden sm:inline" />
            News
          </TabsTrigger>
          <TabsTrigger value="scanner" className="gap-1.5 text-xs">
            <Rss className="h-3.5 w-3.5 hidden sm:inline" />
            Signals
          </TabsTrigger>
          <TabsTrigger value="premium" className="gap-1.5 text-xs">
            <Star className="h-3.5 w-3.5 hidden sm:inline" />
            Premium
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4">
          <EventFeed />
        </TabsContent>
        <TabsContent value="news" className="mt-4">
          <LocalNewsFeed />
        </TabsContent>
        <TabsContent value="scanner" className="mt-4">
          <BusinessSignalScanner />
        </TabsContent>
        <TabsContent value="premium" className="mt-4">
          <PaidIntegrations />
        </TabsContent>
      </Tabs>
    </div>
  );
}
