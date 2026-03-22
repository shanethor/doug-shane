import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Sparkles, Loader2 } from "lucide-react";

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

/* ── Animated Network Graph ── */
interface Node {
  x: number; y: number; vx: number; vy: number;
  r: number; label: string; type: "you" | "connection" | "person";
}

const NETWORK_LABELS: string[] = ["You"];
const FIRST_NAMES = [
  "Doug","James","Priya","Tom","Sarah","Alex","Maria","Chris","Jordan","Sam",
  "Casey","Pat","Quinn","Riley","Morgan","Avery","Blake","Dana","Ellis","Frankie",
  "Harper","Indigo","Jules","Kai","Logan","Noel","Oakley","Peyton","Reese","Skyler",
  "Tatum","Val","Wren","Zion","Ari","Rowan","Sage","Emery","Finley","Hayden",
  "Jamie","Kendall","Lane","Micah","Nico","Parker","Remy","Shea","Taylor","Uma",
  "Vince","Wade","Xander","Yara","Zara","Brynn","Cade","Dex","Eve","Flynn",
  "Gia","Hugo","Iris","Jude","Kira","Leo","Mila","Nate","Opal","Rex",
  "Sia","Theo","Uri","Vera","Wes","Xena","Yael","Zeke","Ada","Bo",
  "Cal","Dot","Eli","Faye","Gil","Hope","Ian","Joy","Kit","Liv","Max","Nell","Otto",
];
const LAST_INITIALS = "ABCDEFGHJKLMNPRSTUVWXYZ";
for (let i = 0; i < 99; i++) {
  const fn = FIRST_NAMES[i % FIRST_NAMES.length];
  const li = LAST_INITIALS[i % LAST_INITIALS.length];
  NETWORK_LABELS.push(`${fn} ${li}.`);
}

function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width * dpr;
    const H = rect.height * dpr;
    canvas.width = W;
    canvas.height = H;
    ctx.scale(dpr, dpr);
    const w = rect.width;
    const h = rect.height;

    // Create nodes
    const nodes: Node[] = NETWORK_LABELS.map((label, i) => {
      const type = i === 0 ? "you" : i < 6 ? "connection" : "person";
      const r = type === "you" ? 14 : type === "connection" ? 8 : 4;
      // Place "You" near center
      const x = i === 0 ? w / 2 : Math.random() * (w - 80) + 40;
      const y = i === 0 ? h / 2 : Math.random() * (h - 60) + 30;
      return {
        x, y,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r, label, type,
      };
    });

    // Create edges
    const edges: [number, number][] = [];
    // You -> connections
    for (let i = 1; i < 6; i++) edges.push([0, i]);
    // Connections -> people (2nd degree)
    for (let i = 6; i < 16; i++) {
      edges.push([1 + (i % 5), i]);
    }
    // People -> people (3rd degree)
    for (let i = 16; i < nodes.length; i++) {
      edges.push([6 + ((i - 16) % 10), i]);
    }
    // Extra cross-connections for density
    for (let k = 0; k < 20; k++) {
      const a = Math.floor(Math.random() * nodes.length);
      const b = Math.floor(Math.random() * nodes.length);
      if (a !== b) edges.push([a, b]);
    }
    // Connection-to-connection links
    for (let i = 1; i < 5; i++) edges.push([i, i + 1]);

    const teal = [0, 140, 120];
    const gold = [201, 168, 76];
    let frame = 0;

    // Track which edges are "lit up"
    const edgeLitTime = new Float32Array(edges.length);

    function draw() {
      if (!ctx) return;
      frame++;
      ctx.clearRect(0, 0, w, h);

      // Light up random edges periodically
      if (frame % 8 === 0) {
        const idx = Math.floor(Math.random() * edges.length);
        edgeLitTime[idx] = 1;
      }

      // Update positions with gentle force toward center for "You"
      for (const n of nodes) {
        if (n.type === "you") {
          n.vx += (w / 2 - n.x) * 0.001;
          n.vy += (h / 2 - n.y) * 0.001;
        }
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 30 || n.x > w - 30) n.vx *= -1;
        if (n.y < 20 || n.y > h - 20) n.vy *= -1;
        n.vx += (Math.random() - 0.5) * 0.015;
        n.vy += (Math.random() - 0.5) * 0.015;
        n.vx *= 0.997;
        n.vy *= 0.997;
      }

      // Draw edges
      for (let ei = 0; ei < edges.length; ei++) {
        const [a, b] = edges[ei];
        const na = nodes[a], nb = nodes[b];
        const dx = nb.x - na.x, dy = nb.y - na.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 400;
        if (dist > maxDist) continue;

        const baseFade = (1 - dist / maxDist);
        const lit = edgeLitTime[ei];
        const alpha = baseFade * (0.08 + lit * 0.5);

        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        const c = lit > 0.3 ? teal : teal;
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
        ctx.lineWidth = lit > 0.3 ? 2 : 1;
        ctx.stroke();

        // Traveling pulse along lit edges
        if (lit > 0.2) {
          const t = (1 - lit);
          const px = na.x + dx * t;
          const py = na.y + dy * t;
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${teal[0]},${teal[1]},${teal[2]},${lit * 0.9})`;
          ctx.fill();
        }

        // Decay lit time
        if (edgeLitTime[ei] > 0) edgeLitTime[ei] *= 0.985;
        if (edgeLitTime[ei] < 0.01) edgeLitTime[ei] = 0;
      }

      // Draw nodes
      for (const n of nodes) {
        const breathe = 1 + Math.sin(frame * 0.025 + n.x * 0.01) * 0.1;
        const r = n.r * breathe;
        const c = n.type === "you" ? gold : teal;
        const glowR = n.type === "you" ? 28 : n.type === "connection" ? 14 : 8;

        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r + glowR);
        grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${n.type === "you" ? 0.4 : 0.2})`);
        grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + glowR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${n.type === "person" ? 0.15 : 0.25})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${n.type === "person" ? 0.3 : 0.6})`;
        ctx.lineWidth = n.type === "person" ? 0.8 : 1.5;
        ctx.stroke();

        // Labels for You + connections
        if (n.type !== "person") {
          ctx.font = n.type === "you" ? "bold 13px system-ui, sans-serif" : "11px system-ui, sans-serif";
          ctx.fillStyle = `rgba(255,255,255,${n.type === "you" ? 0.95 : 0.55})`;
          ctx.textAlign = "center";
          ctx.fillText(n.label, n.x, n.y + r + 15);
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full pointer-events-none"
      style={{ height: 380 }}
    />
  );
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
    <div className="space-y-6" style={{ animation: "smoothFadeSlide 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
      {/* Hero */}
      <div className="flex flex-col items-center text-center pt-6 pb-2 space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Find the fastest path to{" "}
            <span style={{ color: "hsl(174 97% 40%)" }}>anyone</span>
          </h2>
          <p className="text-sm md:text-base max-w-lg mx-auto" style={{ color: "hsl(240 5% 50%)" }}>
            AURA Connect traverses millions of business connections to find the warmest intro path for you.
          </p>
        </div>

        <div className="flex gap-3 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "hsl(240 5% 46%)" }} />
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search a name... e.g. Douglas Wenz"
              className="pl-12 h-12 text-base rounded-xl"
              style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(174 97% 22% / 0.25)", color: "white", fontSize: "1rem" }}
            />
          </div>
          <Button onClick={handleSearch} disabled={!searchName.trim() || searching} className="h-12 px-6 rounded-xl text-base font-semibold" style={{ background: "hsl(174 97% 22%)", color: "white" }}>
            {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Find Path"}
          </Button>
        </div>
      </div>

      {/* Network Graph — shown when no result */}
      {!searching && !result && (
        <div className="relative rounded-2xl overflow-hidden" style={{ background: "hsl(240 8% 5% / 0.6)", border: "1px solid hsl(174 97% 22% / 0.08)" }}>
          <NetworkGraph />
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: "hsl(240 8% 9% / 0.8)", color: "hsl(240 5% 50%)", border: "1px solid hsl(240 6% 14%)" }}>
              Live network map — search a name to trace a path
            </span>
          </div>
        </div>
      )}

      {/* Searching */}
      {searching && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: "hsl(174 97% 40%)" }} />
            <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>Scanning your network for paths to {searchName}…</p>
          </div>
        </div>
      )}

      {/* Result */}
      {!searching && result && (
        <Card className="max-w-2xl mx-auto" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animation: "smoothFadeSlide 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: "hsl(174 97% 40%)" }} />
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

            {/* Visual path with arrows */}
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg" style={{ background: "hsl(240 6% 7%)" }}>
              <div className="flex items-center justify-center h-10 w-10 rounded-full text-xs font-bold" style={{ background: "hsl(45 93% 47% / 0.15)", color: "hsl(45 93% 47%)" }}>You</div>
              <ArrowRight className="h-5 w-5 shrink-0" style={{ color: "hsl(174 97% 40%)" }} />
              <div className="flex items-center justify-center h-10 px-4 rounded-full text-xs font-bold" style={{ background: "hsl(174 97% 22% / 0.15)", color: "hsl(174 97% 40%)" }}>{result.connection}</div>
              <ArrowRight className="h-5 w-5 shrink-0" style={{ color: "hsl(174 97% 40%)" }} />
              <div className="flex items-center justify-center h-10 px-4 rounded-full text-xs font-bold" style={{ background: "hsl(174 97% 22% / 0.15)", color: "hsl(174 97% 40%)" }}>{result.target}</div>
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
