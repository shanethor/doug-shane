import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Users, ArrowRight, Sparkles, Network, Loader2 } from "lucide-react";

const DUMMY_PATHS = [
  {
    target: "Shane Thor",
    connection: "Doug Martinez",
    path: "Shane Thor commented on your contact Doug Martinez's Facebook post 2 days ago about their new office expansion. Doug and Shane have been connected for 3+ years.",
    action: "Ask Doug to make a warm intro — he's your strongest path in.",
    confidence: 92,
  },
  {
    target: "Rachel Kim",
    connection: "James Whitfield",
    path: "Rachel Kim and your contact James Whitfield both attended the Austin Tech Summit last month. James mentioned Rachel in a LinkedIn post about the event.",
    action: "Reach out to James and ask if he'd be open to a 3-way coffee chat.",
    confidence: 85,
  },
  {
    target: "Marcus Lee",
    connection: "Priya Patel",
    path: "Marcus Lee's company recently hired your mutual connection Priya Patel as a consultant. Priya has worked with you on 2 previous deals.",
    action: "Call Priya — she's actively working with Marcus and can position you.",
    confidence: 88,
  },
  {
    target: "Diana Cho",
    connection: "Tom Nguyen",
    path: "Diana Cho liked and shared Tom Nguyen's article on commercial real estate trends yesterday. Tom is in your top network contacts with an A-tier relationship.",
    action: "Text Tom today and mention Diana's interest — he can bridge the gap.",
    confidence: 79,
  },
  {
    target: "Alex Rivera",
    connection: "Sarah Mitchell",
    path: "Alex Rivera and Sarah Mitchell serve on the same Chamber of Commerce board. Sarah introduced you to 3 clients last quarter.",
    action: "Email Sarah with context on Alex — she's your most prolific referral source.",
    confidence: 94,
  },
];

export default function DemoConnectTab() {
  const [searchName, setSearchName] = useState("");
  const [result, setResult] = useState<typeof DUMMY_PATHS[0] | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!searchName.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setTimeout(() => {
      // Pick a deterministic result based on name length, or random
      const idx = searchName.trim().length % DUMMY_PATHS.length;
      const match = { ...DUMMY_PATHS[idx], target: searchName.trim() };
      setResult(match);
      setSearching(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Network className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">Find the fastest path to anyone</p>
            <p className="text-xs text-muted-foreground">
              AURA Connect has a network of millions of business connections. Search any name and we'll analyze your contacts, social activity, events, and mutual connections to find the best warm introduction path.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex gap-2 max-w-lg">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search a name... e.g. Shane Thor"
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch} disabled={!searchName.trim() || searching} className="bg-primary hover:bg-primary/90">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find Path"}
        </Button>
      </div>

      {/* Result */}
      {searching && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Scanning your network for paths to {searchName}…</p>
          </div>
        </div>
      )}

      {!searching && result && (
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Path to {result.target}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-primary border-primary/30">
                {result.confidence}% confidence
              </Badge>
              <span>via <span className="font-medium text-foreground">{result.connection}</span></span>
            </div>

            {/* Visual path */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold">You</div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center justify-center h-8 px-3 rounded-full bg-accent/10 text-accent text-xs font-bold">{result.connection}</div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center justify-center h-8 px-3 rounded-full bg-warning/10 text-warning text-xs font-bold">{result.target}</div>
            </div>

            <div className="p-3 rounded-lg border border-border bg-card">
              <p className="text-sm text-muted-foreground leading-relaxed">{result.path}</p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <ArrowRight className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm font-medium text-primary">{result.action}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!searching && !result && hasSearched && (
        <div className="text-center py-12 text-muted-foreground text-sm">No results found. Try another name.</div>
      )}
    </div>
  );
}
