import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Sparkles, Loader2, X, MapPin, Briefcase, Building2, Users, Signal, Mail, MessageSquare, Phone, Send, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ConnectOutreachPopup } from "./ConnectOutreachPopups";

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

/* ── Full-page Hex-grid Network Visualization ── */

const COLS = 21;
const ROWS = 14;

interface GNode {
  gx: number; gy: number;
  label: string;
  tier: 0 | 1 | 2 | 3;
}

function buildGraph() {
  const cx = Math.floor(COLS / 2);
  const cy = Math.floor(ROWS / 2);

  const firstNames = [
    "Doug","James","Priya","Tom","Sarah","Alex","Maria","Chris","Jordan","Sam",
    "Casey","Pat","Quinn","Riley","Morgan","Avery","Blake","Dana","Ellis","Frankie",
    "Harper","Jules","Kai","Logan","Noel","Oakley","Peyton","Reese","Skyler","Tatum",
    "Val","Wren","Zion","Ari","Rowan","Sage","Emery","Finley","Hayden","Jamie",
    "Kendall","Lane","Micah","Nico","Parker","Remy","Shea","Taylor","Uma","Vince",
    "Wade","Xander","Yara","Brynn","Cade","Dex","Eve","Flynn","Gia","Hugo",
    "Iris","Jude","Kira","Leo","Mila","Nate","Opal","Rex","Sia","Theo",
    "Uri","Vera","Wes","Xena","Yael","Zeke","Ada","Bo","Cal","Dot",
    "Eli","Faye","Gil","Hope","Ian","Joy","Kit","Liv","Max","Nell",
    "Otto","Pam","Roy","Sue","Ty","Una","Vic","Zoe","Beau","Cleo",
    "Drew","Erin","Ford","Gwen","Hank","Ivy","Jack","Kate","Luke","May",
    "Ned","Olive","Pete","Rose","Seth","Tara","Wade","Xara","Yuri","Zara",
    "Abel","Beth","Cole","Dara","Evan","Fern","Glen","Hana","Ike","Jill",
    "Kurt","Lena","Milo","Nina","Omar","Prue","Reid","Sara","Tess","Ugo",
    "Vega","Walt","Xia","York","Zena","Alan","Bree","Cyra","Dale","Edna",
    "Finn","Gabe","Hera","Igor","Jana","Karl","Lyla","Mara","Nils","Ora",
    "Penn","Rhea","Sven","Tina","Ulma","Vida","Will","Xyla","Yoko","Zita",
    "Aldo","Bibi","Cruz","Dina","Emir","Fara","Gary","Hedy","Ivan","Juno",
    "Kobe","Lisa","Mars","Neva","Odin","Pia","Roan","Suki","Troy","Ulla",
    "Vito","Wynn","Xeno","Yves","Zeno","Aiko","Bram","Cora","Dirk","Elsa",
    "Fitz","Gray","Hugh","Isis","Joel","Kaia","Lars","Mina","Nora","Oslo",
    "Pax","Roma","Sean","Thea","Umi","Vern","West","Xavi","Yael","Zack",
    "Amos","Bria","Chad","Devi","Esme","Faye","Gail","Hart","Iona","Jade",
    "Kari","Lana","Moss","Neve","Owen","Peri","Ravi","Shay","Tove","Usha",
    "Vada","Wynn","Xara","Yemi","Zoya","Alma","Buck","Clay","Dawn","Elan",
    "Flo","Gage","Hero","Ilsa","Jett","Knox","Lark","Myra","Nash","Oona",
    "Pike","Rena","Siri","Toby","Uta","Voss","Wart","Xola","Yuma","Zeph",
    "Anya","Berg","Cass","Dane","Elke","Flux","Grif","Holt","Izzy","Joss",
  ];
  const lastInits = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  const names: string[] = ["You"];
  for (let i = 0; i < firstNames.length; i++) {
    names.push(`${firstNames[i]} ${lastInits[i % 26]}.`);
  }

  const allSlots: [number, number][] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (!(c === cx && r === cy)) allSlots.push([c, r]);

  // Shuffle deterministically
  for (let i = allSlots.length - 1; i > 0; i--) {
    const j = (i * 7 + 3) % (i + 1);
    [allSlots[i], allSlots[j]] = [allSlots[j], allSlots[i]];
  }

  const nodes: GNode[] = [{ gx: cx, gy: cy, label: "You", tier: 0 }];
  for (let i = 0; i < Math.min(names.length - 1, allSlots.length); i++) {
    const [gx, gy] = allSlots[i];
    const dist = Math.abs(gx - cx) + Math.abs(gy - cy);
    const tier: 1 | 2 | 3 = dist <= 3 ? 1 : dist <= 6 ? 2 : 3;
    nodes.push({ gx, gy, label: names[i + 1], tier });
  }

  // Edges: connect grid neighbors
  const edges: [number, number][] = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = Math.abs(nodes[i].gx - nodes[j].gx);
      const dy = Math.abs(nodes[i].gy - nodes[j].gy);
      if (dx <= 1 && dy <= 1 && dx + dy > 0) edges.push([i, j]);
    }
  }
  // Longer-range connections
  for (let k = 0; k < 60; k++) {
    const a = (k * 13 + 5) % nodes.length;
    const b = (k * 7 + 11) % nodes.length;
    if (a !== b) {
      const dx = Math.abs(nodes[a].gx - nodes[b].gx);
      const dy = Math.abs(nodes[a].gy - nodes[b].gy);
      if (dx <= 4 && dy <= 3) edges.push([a, b]);
    }
  }

  return { nodes, edges };
}

const GRAPH = buildGraph();

// Mock profile data generator
function generateProfile(name: string, tier: 0 | 1 | 2 | 3) {
  const industries = ["Insurance","Real Estate","Finance","Tech","Healthcare","Consulting","Legal","Marketing"];
  const companies = ["Apex Partners","BlueSky Corp","Meridian Group","NovaTech","Summit LLC","Horizon Inc","Atlas Financial","Pinnacle Consulting"];
  const titles = ["CEO","VP of Sales","Managing Director","Senior Partner","Account Executive","Regional Manager","Director of Operations","Founder"];
  const locations = ["Austin, TX","Dallas, TX","Houston, TX","San Antonio, TX","Denver, CO","Phoenix, AZ","Nashville, TN","Atlanta, GA"];
  const hash = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const mutuals = tier === 1 ? 8 + (hash % 15) : tier === 2 ? 3 + (hash % 8) : 1 + (hash % 4);
  return {
    name,
    title: titles[hash % titles.length],
    company: companies[(hash * 3) % companies.length],
    industry: industries[(hash * 7) % industries.length],
    location: locations[(hash * 11) % locations.length],
    mutualConnections: mutuals,
    connectionStrength: tier === 1 ? "Strong" : tier === 2 ? "Moderate" : "Weak",
    tier,
  };
}

function NetworkGraph({ onNodeClick }: { onNodeClick: (profile: ReturnType<typeof generateProfile>, pos: { x: number; y: number }) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const hoveredNodeRef = useRef<number | null>(null);
  const toPixelRef = useRef<((gx: number, gy: number) => [number, number]) | null>(null);
  const wRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, edges } = GRAPH;

    const edgePulse = new Float32Array(edges.length);
    let frame = 0;
    let w = 0, h = 0;

    let visibleSet = new Set<number>();
    let visibleEdges: number[] = [];

    let revealedSet = new Set<number>();
    let revealOrder: number[] = [];
    let revealIdx = 0;
    let introComplete = false;

    const adj: number[][] = Array.from({ length: nodes.length }, () => []);
    for (let ei = 0; ei < edges.length; ei++) {
      adj[edges[ei][0]].push(ei);
      adj[edges[ei][1]].push(ei);
    }

    let traceEdges: number[] = [];
    let traceProgress = 0;

    function computeVisible() {
      let targetCount: number;
      if (w >= 1200) targetCount = 240;
      else if (w >= 600) targetCount = 120;
      else targetCount = 60;

      const cx = Math.floor(COLS / 2);
      const cy = Math.floor(ROWS / 2);
      const sorted = nodes.map((n, i) => ({
        i, dist: Math.abs(n.gx - cx) + Math.abs(n.gy - cy)
      })).sort((a, b) => a.dist - b.dist);

      visibleSet = new Set<number>();
      for (let k = 0; k < Math.min(targetCount, sorted.length); k++) {
        visibleSet.add(sorted[k].i);
      }
      visibleSet.add(0);

      if (revealOrder.length === 0) {
        revealOrder = sorted.filter(s => visibleSet.has(s.i)).map(s => s.i);
        revealOrder = [0, ...revealOrder.filter(i => i !== 0)];
        revealedSet = new Set<number>();
      }

      visibleEdges = [];
      for (let ei = 0; ei < edges.length; ei++) {
        if (visibleSet.has(edges[ei][0]) && visibleSet.has(edges[ei][1])) {
          visibleEdges.push(ei);
        }
      }
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = container!.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      wRef.current = w;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      computeVisible();
    }

    function toPixel(gx: number, gy: number): [number, number] {
      const padX = w * 0.04;
      const padY = h * 0.06;
      const cellW = (w - padX * 2) / (COLS - 1);
      const cellH = (h - padY * 2) / (ROWS - 1);
      const offX = (gy % 2) * cellW * 0.5;
      return [padX + gx * cellW + offX, padY + gy * cellH];
    }
    toPixelRef.current = toPixel;

    function startTrace() {
      if (!introComplete) return;
      const targets = nodes.map((_, i) => i).filter(i => nodes[i].tier >= 2 && revealedSet.has(i));
      if (targets.length === 0) return;
      const target = targets[(frame * 3 + 7) % targets.length];
      const visited = new Set<number>([0]);
      const parent = new Map<number, { node: number; edge: number }>();
      const queue = [0];
      outer: while (queue.length) {
        const cur = queue.shift()!;
        if (cur === target) break;
        for (const ei of adj[cur]) {
          const [a, b] = edges[ei];
          const nb = a === cur ? b : a;
          if (!visited.has(nb)) {
            visited.add(nb);
            parent.set(nb, { node: cur, edge: ei });
            queue.push(nb);
            if (nb === target) break outer;
          }
        }
      }
      const path: number[] = [];
      let c = target;
      while (parent.has(c)) {
        const p = parent.get(c)!;
        path.unshift(p.edge);
        c = p.node;
      }
      traceEdges = path;
      traceProgress = 0;
    }

    // Hit detection
    function findNodeAt(mx: number, my: number): number | null {
      const hitRadius = w >= 1200 ? 28 : w >= 600 ? 22 : 18;
      let closest: number | null = null;
      let closestDist = hitRadius;
      for (const i of visibleSet) {
        if (!revealedSet.has(i) || i === 0) continue;
        const [px, py] = toPixel(nodes[i].gx, nodes[i].gy);
        // Hit test on label area (below the node shape)
        const fontSize = w >= 1200 ? 9 : w >= 600 ? 8 : 7;
        const labelY = py + (nodes[i].tier === 1 ? 18 : nodes[i].tier === 2 ? 14 : 12);
        const labelW = nodes[i].label.length * fontSize * 0.55;
        if (mx >= px - labelW && mx <= px + labelW && my >= py - 10 && my <= labelY + 6) {
          const d = Math.hypot(mx - px, my - labelY);
          if (d < closestDist) { closestDist = d; closest = i; }
        }
      }
      return closest;
    }

    function handleMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = findNodeAt(mx, my);
      hoveredNodeRef.current = hit;
      canvas!.style.cursor = hit !== null ? "pointer" : "default";
    }

    function handleClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = findNodeAt(mx, my);
      if (hit !== null && hit !== 0) {
        const node = nodes[hit];
        const [px, py] = toPixel(node.gx, node.gy);
        const containerRect = container!.getBoundingClientRect();
        onNodeClick(
          generateProfile(node.label, node.tier),
          { x: containerRect.left + px, y: containerRect.top + py }
        );
      }
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mouseleave", () => { hoveredNodeRef.current = null; canvas!.style.cursor = "default"; });

    resize();

    const nodeOpacity = new Float32Array(nodes.length);

    const sage = [138, 154, 140];
    const softWhite = [245, 245, 240];

    // Hover scale animation per node
    const hoverScale = new Float32Array(nodes.length);

    function draw() {
      if (!ctx) return;
      frame++;
      ctx.clearRect(0, 0, w, h);

      if (!introComplete && revealOrder.length > 0) {
        // First visit: reveal one node every 3 frames (~20 nodes/sec at 60fps)
        // Return visit: reveal fast in batches
        const isFirst = !sessionStorage.getItem("network-graph-visited");
        const revealInterval = isFirst ? 3 : 1;
        const revealPerFrame = isFirst ? 1 : Math.max(3, Math.ceil(revealOrder.length / 90));
        if (frame % revealInterval === 0) {
          for (let r = 0; r < revealPerFrame && revealIdx < revealOrder.length; r++) {
            const ni = revealOrder[revealIdx];
            revealedSet.add(ni);
            revealIdx++;
            for (const ei of adj[ni]) {
              const [a, b] = edges[ei];
              if (revealedSet.has(a) && revealedSet.has(b)) {
                edgePulse[ei] = 0.8;
              }
            }
          }
        }
        if (revealIdx >= revealOrder.length) {
          introComplete = true;
          sessionStorage.setItem("network-graph-visited", "true");
          startTrace();
        }
      }

      const isFirstNodeReveal = !sessionStorage.getItem("network-graph-visited") || !introComplete;
      const opacityStep = isFirstNodeReveal ? 0.025 : 0.06;
      for (const i of visibleSet) {
        if (revealedSet.has(i)) {
          nodeOpacity[i] = Math.min(1, nodeOpacity[i] + opacityStep);
        }
      }

      // Animate hover scale
      const hovered = hoveredNodeRef.current;
      for (const i of visibleSet) {
        const target = i === hovered ? 1 : 0;
        hoverScale[i] += (target - hoverScale[i]) * 0.15;
      }

      if (introComplete) {
        if (frame % 8 === 0 && traceProgress < traceEdges.length) {
          edgePulse[traceEdges[traceProgress]] = 1;
          traceProgress++;
        }
        if (frame % 180 === 0) startTrace();

        if (frame % 20 === 0 && visibleEdges.length > 0) {
          const idx = visibleEdges[(frame * 7) % visibleEdges.length];
          if (edgePulse[idx] < 0.1) edgePulse[idx] = 0.5;
        }
      }

      for (const ei of visibleEdges) {
        const [a, b] = edges[ei];
        if (!revealedSet.has(a) || !revealedSet.has(b)) continue;
        const oa = nodeOpacity[a], ob = nodeOpacity[b];
        const edgeAlpha = Math.min(oa, ob);
        if (edgeAlpha < 0.01) continue;

        const [ax, ay] = toPixel(nodes[a].gx, nodes[a].gy);
        const [bx, by] = toPixel(nodes[b].gx, nodes[b].gy);
        const p = edgePulse[ei];
        const alpha = (0.04 + p * 0.55) * edgeAlpha;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = `rgba(${sage[0]},${sage[1]},${sage[2]},${alpha})`;
        ctx.lineWidth = p > 0.3 ? 2 : 0.8;
        ctx.stroke();

        if (p > 0.15) {
          const t = 1 - p;
          ctx.beginPath();
          ctx.arc(ax + (bx - ax) * t, ay + (by - ay) * t, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${sage[0]},${sage[1]},${sage[2]},${p * 0.9 * edgeAlpha})`;
          ctx.fill();
        }

        if (edgePulse[ei] > 0) edgePulse[ei] *= 0.98;
        if (edgePulse[ei] < 0.005) edgePulse[ei] = 0;
      }

      const baseFontSize = w >= 1200 ? 9 : w >= 600 ? 8 : 7;
      for (const i of visibleSet) {
        if (!revealedSet.has(i)) continue;
        const op = nodeOpacity[i];
        if (op < 0.01) continue;

        const n = nodes[i];
        const [px, py] = toPixel(n.gx, n.gy);
        const c = n.tier === 0 ? softWhite : sage;
        const breathe = 1 + Math.sin(frame * 0.018 + i * 0.7) * 0.12;
        const hs = hoverScale[i];
        const isHovered = hs > 0.1;

        if (n.tier === 0) {
          const rw = 18 * breathe, rh = 12 * breathe;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, 30);
          grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.25 * op})`);
          grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
          ctx.beginPath();
          ctx.arc(px, py, 30, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
          ctx.beginPath();
          ctx.roundRect(px - rw, py - rh, rw * 2, rh * 2, 4);
          ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.25 * op})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.8 * op})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.font = "bold 11px system-ui, sans-serif";
          ctx.fillStyle = `rgba(255,255,255,${0.95 * op})`;
          ctx.textAlign = "center";
          ctx.fillText("You", px, py + 4);
        } else {
          // Compute enlarged font for hover
          const fontSize = baseFontSize + hs * 4;
          const labelAlpha = n.tier === 1 ? 0.5 : n.tier === 2 ? 0.35 : 0.22;
          const finalAlpha = (labelAlpha + hs * (1 - labelAlpha)) * op;
          const fontWeight = isHovered ? "bold" : "normal";

          if (n.tier === 1) {
            const s = 6 * breathe * (1 + hs * 0.3);
            ctx.beginPath();
            ctx.roundRect(px - s * 1.5, py - s, s * 3, s * 2, 3);
            ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.15 + hs * 0.15) * op})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.45 + hs * 0.4) * op})`;
            ctx.lineWidth = 1 + hs * 0.5;
            ctx.stroke();
            ctx.font = `${fontWeight} ${fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = `rgba(255,255,255,${finalAlpha})`;
            ctx.textAlign = "center";
            ctx.fillText(n.label, px, py + s + 12 + hs * 2);
          } else if (n.tier === 2) {
            const s = 3.5 * breathe * (1 + hs * 0.3);
            ctx.beginPath();
            ctx.moveTo(px, py - s);
            ctx.lineTo(px + s, py);
            ctx.lineTo(px, py + s);
            ctx.lineTo(px - s, py);
            ctx.closePath();
            ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.12 + hs * 0.15) * op})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.25 + hs * 0.4) * op})`;
            ctx.lineWidth = 0.7 + hs * 0.5;
            ctx.stroke();
            ctx.font = `${fontWeight} ${fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = `rgba(255,255,255,${finalAlpha})`;
            ctx.textAlign = "center";
            ctx.fillText(n.label, px, py + s + 11 + hs * 2);
          } else {
            const s = 2.5 * breathe * (1 + hs * 0.3);
            ctx.beginPath();
            ctx.arc(px, py, s, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.1 + hs * 0.15) * op})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(0.2 + hs * 0.4) * op})`;
            ctx.lineWidth = 0.5 + hs * 0.5;
            ctx.stroke();
            ctx.font = `${fontWeight} ${fontSize}px system-ui, sans-serif`;
            ctx.fillStyle = `rgba(255,255,255,${finalAlpha})`;
            ctx.textAlign = "center";
            ctx.fillText(n.label, px, py + s + 10 + hs * 2);
          }

          // Glow effect on hover
          if (hs > 0.05) {
            const glowR = 20 + hs * 10;
            const grad = ctx.createRadialGradient(px, py, 0, px, py, glowR);
            grad.addColorStop(0, `rgba(${sage[0]},${sage[1]},${sage[2]},${0.2 * hs * op})`);
            grad.addColorStop(1, `rgba(${sage[0]},${sage[1]},${sage[2]},0)`);
            ctx.beginPath();
            ctx.arc(px, py, glowR, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize);
    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
    };
  }, [onNodeClick]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} />
    </div>
  );
}

interface ProfileData {
  name: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  mutualConnections: number;
  connectionStrength: string;
  tier: 0 | 1 | 2 | 3;
}

export default function DemoConnectTab({ contentReady = true }: { contentReady?: boolean }) {
  const [searchName, setSearchName] = useState("");
  const [result, setResult] = useState<PathResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [outreachType, setOutreachType] = useState<"email" | "text" | "call" | "meet" | null>(null);
  const [profilePopup, setProfilePopup] = useState<{ profile: ProfileData; pos: { x: number; y: number } } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

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

  const handleNodeClick = useCallback((profile: ProfileData, pos: { x: number; y: number }) => {
    setProfilePopup({ profile, pos });
  }, []);

  useEffect(() => {
    if (!profilePopup) return;
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setProfilePopup(null);
      }
    };
    setTimeout(() => document.addEventListener("click", handler), 10);
    return () => document.removeEventListener("click", handler);
  }, [profilePopup]);

  const popupStyle = profilePopup ? (() => {
    const pw = 280, ph = 260;
    let x = profilePopup.pos.x - pw / 2;
    let y = profilePopup.pos.y - ph - 20;
    if (y < 10) y = profilePopup.pos.y + 20;
    if (x < 10) x = 10;
    if (x + pw > window.innerWidth - 10) x = window.innerWidth - pw - 10;
    return { left: x, top: y, width: pw };
  })() : null;

  const strengthColor = (s: string) =>
    s === "Strong" ? "hsl(140 50% 50%)" : s === "Moderate" ? "hsl(45 80% 55%)" : "hsl(0 0% 55%)";

  const [connectPhase, setConnectPhase] = useState(0);
  const isFirstVisit = useRef(!sessionStorage.getItem("connect-tab-visited"));
  const graphActive = contentReady && (!isFirstVisit.current || connectPhase >= 3);

  useEffect(() => {
    if (!contentReady) return;

    if (!isFirstVisit.current) {
      setConnectPhase(3);
      return;
    }

    sessionStorage.setItem("connect-tab-visited", "true");
    const t1 = setTimeout(() => setConnectPhase(1), 250);
    const t2 = setTimeout(() => setConnectPhase(2), 1450);
    const t3 = setTimeout(() => setConnectPhase(3), 3200);

    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [contentReady]);

  return (
    <div className="flex flex-col" style={{ animation: "smoothFadeSlide 0.6s cubic-bezier(0.16,1,0.3,1) both" }}>
      <div className="relative z-10 flex flex-col items-center text-center pt-6 pb-2 space-y-5">
        <div className="space-y-2" style={{
          opacity: connectPhase >= 1 ? 1 : 0,
          transform: connectPhase >= 1 ? "translateY(0)" : "translateY(20px)",
          transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Find the fastest path to{" "}
            <span style={{ color: "hsl(140 12% 58%)" }}>anyone</span>
          </h2>
          <p className="text-sm md:text-base max-w-lg mx-auto" style={{ color: "hsl(240 5% 50%)" }}>
            AuRa Connect traverses millions of business connections to find the warmest intro path for you.
          </p>
        </div>

        <div className="flex gap-3 w-full max-w-xl" style={{
          opacity: connectPhase >= 2 ? 1 : 0,
          transform: connectPhase >= 2 ? "translateY(0) scale(1)" : "translateY(16px) scale(0.97)",
          transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: "hsl(240 5% 46%)" }} />
            <Input
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search a name... e.g. Douglas Wenz"
              className="pl-12 h-12 text-base rounded-xl animate-[glowPulse_2.5s_ease-in-out_infinite]"
              style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(140 12% 42% / 0.5)", color: "white", fontSize: "1rem" }}
            />
          </div>
          <Button onClick={handleSearch} disabled={!searchName.trim() || searching} className="h-12 px-6 rounded-xl text-base font-semibold animate-[glowPulseBtn_2.5s_ease-in-out_infinite]" style={{ background: "hsl(140 12% 42%)", color: "white" }}>
            {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : "Find Path"}
          </Button>
        </div>
      </div>

      {!searching && !result && (
        <div className="relative flex-1 overflow-hidden mt-2" style={{
          opacity: connectPhase >= 3 ? 1 : 0,
          transform: connectPhase >= 3 ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
          transition: isFirstVisit.current ? "all 1.8s cubic-bezier(0.16, 1, 0.3, 1)" : "all 0.6s ease-out",
        }}>
          {graphActive && <NetworkGraph onNodeClick={handleNodeClick} />}
          <div className="absolute bottom-4 left-0 right-0 text-center z-10">
            <span className="text-xs px-3 py-1 rounded-full" style={{ background: "hsl(240 8% 9% / 0.8)", color: "hsl(240 5% 50%)", border: "1px solid hsl(240 6% 14%)" }}>
              Live network map — click any name to view profile
            </span>
          </div>

          {/* Profile popup */}
          {profilePopup && popupStyle && (
            <div
              ref={popupRef}
              className="fixed z-50 rounded-xl p-4 space-y-3 animate-fade-in shadow-2xl"
              style={{
                left: popupStyle.left,
                top: popupStyle.top,
                width: popupStyle.width,
                background: "hsl(240 8% 8%)",
                border: "1px solid hsl(140 12% 42% / 0.3)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(140 12% 42% / 0.2)", color: "hsl(140 12% 65%)" }}>
                    {profilePopup.profile.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{profilePopup.profile.name}</p>
                    <p className="text-[11px]" style={{ color: "hsl(240 5% 55%)" }}>{profilePopup.profile.title}</p>
                  </div>
                </div>
                <button onClick={() => setProfilePopup(null)} className="p-0.5 rounded hover:bg-white/10">
                  <X className="h-3.5 w-3.5" style={{ color: "hsl(240 5% 46%)" }} />
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 60%)" }}>
                  <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />
                  {profilePopup.profile.company}
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 60%)" }}>
                  <Briefcase className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />
                  {profilePopup.profile.industry}
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 60%)" }}>
                  <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />
                  {profilePopup.profile.location}
                </div>
                <div className="flex items-center gap-2 text-xs" style={{ color: "hsl(240 5% 60%)" }}>
                  <Users className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />
                  {profilePopup.profile.mutualConnections} mutual connections
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Signal className="h-3.5 w-3.5 shrink-0" style={{ color: strengthColor(profilePopup.profile.connectionStrength) }} />
                  <span style={{ color: strengthColor(profilePopup.profile.connectionStrength) }}>
                    {profilePopup.profile.connectionStrength} connection
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="flex-1 text-xs h-8"
                  style={{ background: "hsl(140 12% 42%)", color: "white" }}
                  onClick={() => {
                    setSearchName(profilePopup.profile.name);
                    setProfilePopup(null);
                    setTimeout(handleSearch, 100);
                  }}
                >
                  Find Path
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8"
                  style={{ borderColor: "hsl(240 6% 20%)", color: "hsl(240 5% 70%)" }}
                  onClick={() => setProfilePopup(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Searching */}
      {searching && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="h-10 w-10 animate-spin mx-auto" style={{ color: "hsl(140 12% 58%)" }} />
            <p className="text-sm" style={{ color: "hsl(240 5% 46%)" }}>Scanning your network for paths to {searchName}…</p>
          </div>
        </div>
      )}

      {/* Result */}
      {!searching && result && (
        <Card className="max-w-2xl mx-auto mt-4" style={{ background: "hsl(240 8% 9%)", borderColor: "hsl(240 6% 14%)", animation: "smoothFadeSlide 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
              <span className="text-white">Path to {result.target}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-xs" style={{ color: "hsl(240 5% 46%)" }}>
              <Badge variant="outline" style={{ color: "hsl(140 12% 58%)", borderColor: "hsl(140 12% 42% / 0.3)" }}>
                {result.confidence}% confidence
              </Badge>
              <span>via <span className="font-medium text-white">{result.connection}</span></span>
            </div>

            <div className="flex items-center justify-center gap-2 p-4 rounded-lg" style={{ background: "hsl(240 6% 7%)" }}>
              <div className="flex items-center justify-center h-10 w-10 rounded-full text-xs font-bold" style={{ background: "hsl(45 93% 47% / 0.15)", color: "hsl(45 93% 47%)" }}>You</div>
              <ArrowRight className="h-5 w-5 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
              <div className="flex items-center justify-center h-10 px-4 rounded-full text-xs font-bold" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{result.connection}</div>
              <ArrowRight className="h-5 w-5 shrink-0" style={{ color: "hsl(140 12% 58%)" }} />
              <div className="flex items-center justify-center h-10 px-4 rounded-full text-xs font-bold" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)" }}>{result.target}</div>
            </div>

            <div className="p-3 rounded-lg" style={{ background: "hsl(240 6% 7%)", border: "1px solid hsl(240 6% 14%)" }}>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(240 5% 60%)" }}>{result.path}</p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(240 5% 46%)" }}>Reach out now</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { icon: Mail, label: "Draft Email", desc: "AI-generated intro", key: "email" as const },
                  { icon: MessageSquare, label: "Send Text", desc: "Quick SMS message", key: "text" as const },
                  { icon: Phone, label: "Phone Call", desc: "Call script ready", key: "call" as const },
                  { icon: Calendar, label: "Schedule Meet", desc: "Book a coffee chat", key: "meet" as const },
                ]).map((action) => (
                  <button
                    key={action.label}
                    onClick={() => setOutreachType(action.key)}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl text-center transition-all hover:scale-[1.04] active:scale-95"
                    style={{ background: "hsl(140 12% 42% / 0.08)", border: "1px solid hsl(140 12% 42% / 0.2)" }}
                  >
                    <action.icon className="h-5 w-5" style={{ color: "hsl(140 12% 58%)" }} />
                    <span className="text-xs font-semibold text-white">{action.label}</span>
                    <span className="text-[10px] leading-tight" style={{ color: "hsl(240 5% 50%)" }}>{action.desc}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: "hsl(140 12% 42% / 0.06)", border: "1px solid hsl(140 12% 42% / 0.12)" }}>
                <Send className="h-3.5 w-3.5 shrink-0" style={{ color: "hsl(140 12% 50%)" }} />
                <p className="text-xs" style={{ color: "hsl(140 12% 58%)" }}>{result.action}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <ConnectOutreachPopup
          type={outreachType}
          onClose={() => setOutreachType(null)}
          connection={result.connection}
          target={result.target}
        />
      )}

      {!searching && !result && hasSearched && (
        <div className="text-center py-12 text-sm" style={{ color: "hsl(240 5% 46%)" }}>No results found. Try another name.</div>
      )}
    </div>
  );
}
