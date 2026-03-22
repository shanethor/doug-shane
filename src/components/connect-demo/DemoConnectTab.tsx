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
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  label: string;
  type: "you" | "connection" | "person";
}

const NETWORK_LABELS = [
  "You", "Doug M.", "James W.", "Priya P.", "Tom N.", "Sarah M.",
  "Alex K.", "Maria L.", "Chris B.", "Jordan T.", "Sam R.",
  "Casey D.", "Pat H.", "Quinn F.", "Riley J.", "Morgan S.",
];

function NetworkGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<[number, number][]>([]);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.offsetWidth * 2;
    const H = canvas.offsetHeight * 2;
    canvas.width = W;
    canvas.height = H;

    // Create nodes
    const nodes: Node[] = NETWORK_LABELS.map((label, i) => {
      const type = i === 0 ? "you" : i < 6 ? "connection" : "person";
      const r = type === "you" ? 18 : type === "connection" ? 12 : 7;
      return {
        x: Math.random() * (W - 120) + 60,
        y: Math.random() * (H - 80) + 40,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        r, label, type,
      };
    });
    nodesRef.current = nodes;

    // Create edges — ensure connected graph from "You"
    const edges: [number, number][] = [];
    for (let i = 1; i < 6; i++) edges.push([0, i]);
    for (let i = 6; i < nodes.length; i++) {
      const target = 1 + Math.floor(Math.random() * 5);
      edges.push([target, i]);
      if (Math.random() > 0.5) {
        const other = Math.floor(Math.random() * i);
        if (other !== target) edges.push([other, i]);
      }
    }
    // A few extra random connections
    for (let k = 0; k < 6; k++) {
      const a = Math.floor(Math.random() * nodes.length);
      const b = Math.floor(Math.random() * nodes.length);
      if (a !== b) edges.push([a, b]);
    }
    edgesRef.current = edges;

    const teal = { r: 0, g: 140, b: 120 };
    const gold = { r: 201, g: 168, b: 76 };

    function draw() {
      if (!ctx) return;
      frameRef.current++;
      const f = frameRef.current;
      ctx.clearRect(0, 0, W, H);

      // Update positions
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 40 || n.x > W - 40) n.vx *= -1;
        if (n.y < 30 || n.y > H - 30) n.vy *= -1;
        // Gentle drift
        n.vx += (Math.random() - 0.5) * 0.02;
        n.vy += (Math.random() - 0.5) * 0.02;
        n.vx *= 0.998;
        n.vy *= 0.998;
      }

      // Draw edges
      for (const [a, b] of edges) {
        const na = nodes[a], nb = nodes[b];
        const dx = nb.x - na.x, dy = nb.y - na.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 500;
        if (dist > maxDist) continue;
        const alpha = (1 - dist / maxDist) * 0.25;

        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = `rgba(${teal.r},${teal.g},${teal.b},${alpha})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Traveling pulse
        const speed = 0.002;
        const t = ((f * speed + a * 0.1 + b * 0.07) % 1);
        const px = na.x + dx * t;
        const py = na.y + dy * t;
        const pulseAlpha = alpha * 1.5 * Math.sin(t * Math.PI);
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${teal.r},${teal.g},${teal.b},${pulseAlpha})`;
        ctx.fill();
      }

      // Draw nodes
      for (const n of nodes) {
        const glow = n.type === "you" ? 20 : n.type === "connection" ? 12 : 6;
        const c = n.type === "you" ? gold : teal;
        const breathe = 1 + Math.sin(f * 0.03 + n.x * 0.01) * 0.08;
        const r = n.r * breathe;

        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r + glow);
        grad.addColorStop(0, `rgba(${c.r},${c.g},${c.b},0.35)`);
        grad.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + glow, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.2)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},0.6)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        if (n.type !== "person") {
          ctx.font = `${n.type === "you" ? "bold 20px" : "13px"} system-ui, sans-serif`;
          ctx.fillStyle = `rgba(255,255,255,${n.type === "you" ? 0.9 : 0.6})`;
          ctx.textAlign = "center";
          ctx.fillText(n.label, n.x, n.y + r + 18);
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
      style={{ height: 320, opacity: 0.85 }}
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
      {/* Hero — centered title + search */}
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

        {/* Search bar — centered + larger */}
        <div className="flex gap-3 w-full max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "hsl(240 5% 46%)" }} />
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search a name... e.g. Douglas Wenz"
              className="pl-12 h-12 text-base rounded-xl"
              style={{
                background: "hsl(240 8% 9%)",
                borderColor: "hsl(174 97% 22% / 0.25)",
                color: "white",
                fontSize: "1rem",
              }}
            />
          </div>
          <Button
            onClick={handleSearch}
            disabled={!searchName.trim() || searching}
            className="h-12 px-6 rounded-xl text-base font-semibold"
            style={{ background: "hsl(174 97% 22%)", color: "white" }}
          >
            {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Find Path"}
          </Button>
        </div>
      </div>

      {/* Animated Network Graph */}
      {!searching && !result && (
        <div className="relative rounded-2xl overflow-hidden" style={{ background: "hsl(240 8% 5% / 0.6)", border: "1px solid hsl(174 97% 22% / 0.08)" }}>
          <NetworkGraph />
          {/* Overlaid label */}
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

            {/* Visual path */}
            <div className="flex items-center justify-center gap-3 p-4 rounded-lg" style={{ background: "hsl(240 6% 7%)" }}>
              <div className="flex items-center justify-center h-10 w-10 rounded-full text-xs font-bold" style={{ background: "hsl(45 93% 47% / 0.15)", color: "hsl(45 93% 47%)" }}>You</div>
              <div className="h-px flex-1 max-w-[60px]" style={{ background: "linear-gradient(90deg, hsl(45 93% 47% / 0.4), hsl(174 97% 40% / 0.4))" }} />
              <div className="flex items-center justify-center h-10 px-4 rounded-full text-xs font-bold" style={{ background: "hsl(174 97% 22% / 0.15)", color: "hsl(174 97% 40%)" }}>{result.connection}</div>
              <div className="h-px flex-1 max-w-[60px]" style={{ background: "linear-gradient(90deg, hsl(174 97% 40% / 0.4), hsl(174 97% 60% / 0.4))" }} />
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
