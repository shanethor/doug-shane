import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Sparkles, Network, Loader2 } from "lucide-react";

const DUMMY_PATH_TEMPLATES = [
  {
    connection: "Doug Martinez",
    pathTemplate: (name: string) => `${name} commented on your contact Doug Martinez's Facebook post 2 days ago about their new office expansion. Doug and ${name.split(" ")[0]} have been connected for 3+ years.`,
    actionTemplate: (name: string) => `Ask Doug to make a warm intro to ${name} — he's your strongest path in.`,
    confidence: 92,
  },
  {
    connection: "James Whitfield",
    pathTemplate: (name: string) => `${name} and your contact James Whitfield both attended the Austin Tech Summit last month. James mentioned ${name.split(" ")[0]} in a LinkedIn post about the event.`,
    actionTemplate: (name: string) => `Reach out to James and ask if he'd be open to a 3-way coffee chat with ${name}.`,
    confidence: 85,
  },
  {
    connection: "Priya Patel",
    pathTemplate: (name: string) => `${name}'s company recently hired your mutual connection Priya Patel as a consultant. Priya has worked with you on 2 previous deals.`,
    actionTemplate: (name: string) => `Call Priya — she's actively working with ${name.split(" ")[0]} and can position you.`,
    confidence: 88,
  },
  {
    connection: "Tom Nguyen",
    pathTemplate: (name: string) => `${name} liked and shared Tom Nguyen's article on commercial real estate trends yesterday. Tom is in your top network contacts with an A-tier relationship.`,
    actionTemplate: (name: string) => `Text Tom today and mention ${name.split(" ")[0]}'s interest — he can bridge the gap.`,
    confidence: 79,
  },
  {
    connection: "Sarah Mitchell",
    pathTemplate: (name: string) => `${name} and Sarah Mitchell serve on the same Chamber of Commerce board. Sarah introduced you to 3 clients last quarter.`,
    actionTemplate: (name: string) => `Email Sarah with context on ${name} — she's your most prolific referral source.`,
    confidence: 94,
  },
];

interface PathResult {
  target: string;
  connection: string;
  path: string;
  action: string;
  confidence: number;
}

export default function DemoConnectTab() {
  const [searchName, setSearchName] = useState("");
  const [result, setResult] = useState<PathResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!searchName.trim()) return;
    setSearching(true);
    setHasSearched(true);
    const name = searchName.trim();
    setTimeout(() => {
      const idx = name.length % DUMMY_PATH_TEMPLATES.length;
      const tpl = DUMMY_PATH_TEMPLATES[idx];
      setResult({
        target: name,
        connection: tpl.connection,
        path: tpl.pathTemplate(name),
        action: tpl.actionTemplate(name),
        confidence: tpl.confidence,
      });
      setSearching(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Explainer */}
      <Card className="overflow-hidden" style={{ background: "hsl(174 97% 22% / 0.06)", borderColor: "hsl(174 97% 22% / 0.15)" }}>
        <CardContent className="p-4 flex items-start gap-3">
          <Network className="h-6 w-6 shrink-0 mt-0.5" style={{ color: "hsl(174 97% 40%)" }} />
          <div>
            <p className="text-sm font-semibold text-white mb-1">Find the fastest path to anyone</p>
            <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>
              AURA Connect has a network of millions of business connections. We will help you find the best path to your new connection.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "hsl(240 5% 46%)" }} />
          <Input
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search a name... e.g. Douglas Wenz"
            className="pl-9"
            style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", color: "white" }}
          />
        </div>
        <Button onClick={handleSearch} disabled={!searchName.trim() || searching} style={{ background: "hsl(174 97% 22%)" }}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find Path"}
        </Button>
      </div>

      {/* Searching */}
      {searching && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" style={{ color: "hsl(174 97% 40%)" }} />
            <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>Scanning your network for paths to {searchName}…</p>
          </div>
        </div>
      )}

      {/* Result */}
      {!searching && result && (
        <Card className="animate-fade-in" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "hsl(174 97% 40%)" }} />
              <span className="text-white">Path to {result.target}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-xs" style={{ color: "hsl(240 5% 46%)" }}>
              <Badge variant="outline" style={{ color: "hsl(174 97% 40%)", borderColor: "hsl(174 97% 22% / 0.3)" }}>
                {result.confidence}% confidence
              </Badge>
              <span>via <span className="font-medium text-white">{result.connection}</span></span>
            </div>

            {/* Visual path */}
            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "hsl(240 6% 7%)" }}>
              <div className="flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold" style={{ background: "hsl(174 97% 22% / 0.15)", color: "hsl(174 97% 40%)" }}>You</div>
              <ArrowRight className="h-4 w-4" style={{ color: "hsl(240 5% 36%)" }} />
              <div className="flex items-center justify-center h-8 px-3 rounded-full text-xs font-bold" style={{ background: "hsl(174 97% 22% / 0.15)", color: "hsl(174 97% 40%)" }}>{result.connection}</div>
              <ArrowRight className="h-4 w-4" style={{ color: "hsl(240 5% 36%)" }} />
              <div className="flex items-center justify-center h-8 px-3 rounded-full text-xs font-bold" style={{ background: "hsl(45 93% 47% / 0.15)", color: "hsl(45 93% 47%)" }}>{result.target}</div>
            </div>

            <div className="p-3 rounded-lg" style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(240 5% 60%)" }}>{result.path}</p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: "hsl(174 97% 22% / 0.06)", border: "1px solid hsl(174 97% 22% / 0.15)" }}>
              <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "hsl(174 97% 40%)" }} />
              <p className="text-sm font-medium" style={{ color: "hsl(174 97% 40%)" }}>{result.action}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!searching && !result && hasSearched && (
        <div className="text-center py-12 text-sm" style={{ color: "hsl(240 5% 46%)" }}>No results found. Try another name.</div>
      )}
    </div>
  );
}
