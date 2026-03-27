import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type NodeKind = "self" | "person" | "company";

interface ContactRow {
  id: string;
  display_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  company: string | null;
  title: string | null;
  linkedin_url: string | null;
  location: string | null;
  tier: string | null;
  metadata: Record<string, any> | null;
}

interface GraphNode {
  id: string;
  name: string;
  kind: NodeKind;
  tier: 0 | 1 | 2 | 3;
  gx: number;
  gy: number;
  title?: string;
  company?: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  industry?: string;
  mutualConnections: number;
  connectionStrength: string;
  sourceContactIds?: string[];
}

interface GraphData {
  cols: number;
  rows: number;
  nodes: GraphNode[];
  edges: Array<[number, number]>;
}

export interface LiveNetworkProfile {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  location: string;
  mutualConnections: number;
  connectionStrength: string;
  tier: 0 | 1 | 2 | 3;
  type: "person" | "company";
  email?: string;
  phone?: string;
  linkedin?: string;
}

interface ConnectLiveNetworkMapProps {
  onNodeClick: (profile: LiveNetworkProfile, pos: { x: number; y: number }) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeName(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function tierFromLabel(label: string | null | undefined, mutuals: number) {
  if (label === "S" || label === "A" || mutuals >= 6) return 1 as const;
  if (label === "B" || mutuals >= 3) return 2 as const;
  return 3 as const;
}

function strengthFromTier(tier: 0 | 1 | 2 | 3) {
  if (tier <= 1) return "Strong";
  if (tier === 2) return "Moderate";
  return "Weak";
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function buildRealGraph(contacts: ContactRow[]): GraphData {
  const groupedByCompany = new Map<string, ContactRow[]>();

  for (const contact of contacts) {
    const companyKey = normalizeName(contact.company);
    if (!companyKey) continue;
    const group = groupedByCompany.get(companyKey) || [];
    group.push(contact);
    groupedByCompany.set(companyKey, group);
  }

  const people: GraphNode[] = contacts
    .filter((contact) => normalizeName(contact.display_name).length > 0)
    .map((contact) => {
      const companyKey = normalizeName(contact.company);
      const companyPeers = companyKey ? groupedByCompany.get(companyKey) || [] : [];
      const mutualConnections = Math.max(
        Number(contact.metadata?.mutual_connections_count || 0),
        Math.max(companyPeers.length - 1, 0),
      );
      const tier = tierFromLabel(contact.tier, mutualConnections);

      return {
        id: contact.id,
        name: contact.display_name!.trim(),
        kind: "person" as const,
        tier,
        gx: 0,
        gy: 0,
        title: contact.title || "Network contact",
        company: contact.company || "Independent",
        location: contact.location || "Location unavailable",
        email: contact.primary_email || undefined,
        phone: contact.primary_phone || undefined,
        linkedin: contact.linkedin_url || undefined,
        industry: String(contact.metadata?.industry || contact.metadata?.source || "Relationship network"),
        mutualConnections,
        connectionStrength: strengthFromTier(tier),
        sourceContactIds: [contact.id],
      };
    })
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.mutualConnections !== b.mutualConnections) return b.mutualConnections - a.mutualConnections;
      return a.name.localeCompare(b.name);
    });

  const companies: GraphNode[] = Array.from(groupedByCompany.entries())
    .filter(([, members]) => members.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 120)
    .map(([companyKey, members]) => {
      const strongestMember = members[0];
      const mutualConnections = members.length;
      const tier = mutualConnections >= 6 ? 1 : mutualConnections >= 3 ? 2 : 3;

      return {
        id: `company:${companyKey}`,
        name: strongestMember.company || companyKey,
        kind: "company" as const,
        tier,
        gx: 0,
        gy: 0,
        title: `${members.length} contact${members.length === 1 ? "" : "s"}`,
        company: strongestMember.company || companyKey,
        location: strongestMember.location || "Company tie",
        industry: "Company node",
        mutualConnections,
        connectionStrength: strengthFromTier(tier),
        sourceContactIds: members.map((member) => member.id),
      };
    });

  const nodes: GraphNode[] = [
    {
      id: "self",
      name: "You",
      kind: "self" as const,
      tier: 0,
      gx: 0,
      gy: 0,
      title: "Your network",
      company: "AuRa Connect",
      location: "Center of graph",
      industry: "Relationship network",
      mutualConnections: people.length,
      connectionStrength: "Strong",
    },
    ...people,
    ...companies,
  ];

  const total = nodes.length;
  const cols = clamp(Math.ceil(Math.sqrt(total * 1.35)), 12, 34);
  const rows = clamp(Math.ceil(total / cols) + 2, 10, 26);
  const cx = Math.floor(cols / 2);
  const cy = Math.floor(rows / 2);

  const slots: Array<[number, number]> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (col === cx && row === cy) continue;
      slots.push([col, row]);
    }
  }

  slots.sort((a, b) => {
    const distA = Math.abs(a[0] - cx) + Math.abs(a[1] - cy);
    const distB = Math.abs(b[0] - cx) + Math.abs(b[1] - cy);
    if (distA !== distB) return distA - distB;
    return (a[0] + a[1] * 3) - (b[0] + b[1] * 3);
  });

  nodes[0].gx = cx;
  nodes[0].gy = cy;

  for (let i = 1; i < nodes.length; i++) {
    const [gx, gy] = slots[i - 1] || slots[slots.length - 1];
    nodes[i].gx = gx;
    nodes[i].gy = gy;
  }

  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const companyIndex = new Map(
    companies.map((companyNode) => [normalizeName(companyNode.company), nodeIndex.get(companyNode.id)!]),
  );
  const normalizedNameToIndex = new Map(
    people.map((personNode) => [normalizeName(personNode.name), nodeIndex.get(personNode.id)!]),
  );

  const edgeSet = new Set<string>();
  const edges: Array<[number, number]> = [];

  const addEdge = (a: number, b: number) => {
    if (a === b) return;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push(a < b ? [a, b] : [b, a]);
  };

  const directConnections = Math.min(Math.max(18, Math.ceil(people.length * 0.2)), 60);
  for (let i = 0; i < directConnections && i < people.length; i++) {
    addEdge(0, nodeIndex.get(people[i].id)!);
  }

  for (const person of people) {
    const personIndex = nodeIndex.get(person.id)!;
    const companyId = companyIndex.get(normalizeName(person.company));
    if (companyId != null) addEdge(personIndex, companyId);
  }

  for (const [, members] of groupedByCompany.entries()) {
    const memberIndexes = members
      .map((member) => nodeIndex.get(member.id))
      .filter((value): value is number => value != null)
      .slice(0, 20);

    for (let i = 1; i < memberIndexes.length; i++) {
      addEdge(memberIndexes[i - 1], memberIndexes[i]);
    }
    if (memberIndexes.length > 2) addEdge(memberIndexes[0], memberIndexes[memberIndexes.length - 1]);
  }

  for (const contact of contacts) {
    const fromIndex = nodeIndex.get(contact.id);
    const mutualNames = Array.isArray(contact.metadata?.mutual_connections)
      ? (contact.metadata?.mutual_connections as string[])
      : [];

    if (fromIndex == null) continue;

    for (const mutualName of mutualNames.slice(0, 3)) {
      const toIndex = normalizedNameToIndex.get(normalizeName(mutualName));
      if (toIndex != null) addEdge(fromIndex, toIndex);
    }
  }

  const fallbackIndexes = people.map((person) => nodeIndex.get(person.id)!);
  for (let i = 2; i < fallbackIndexes.length; i += 3) {
    addEdge(fallbackIndexes[i - 2], fallbackIndexes[i]);
  }

  return { cols, rows, nodes, edges };
}

export default function ConnectLiveNetworkMap({ onNodeClick }: ConnectLiveNetworkMapProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const hoveredNodeRef = useRef<number | null>(null);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const graph = useMemo(() => buildRealGraph(contacts), [contacts]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadContacts() {
      setLoading(true);
      const { data, error } = await supabase
        .from("canonical_persons")
        .select("id, display_name, primary_email, primary_phone, company, title, linkedin_url, location, tier, metadata")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (cancelled) return;
      if (error) {
        console.error("Failed to load live network map contacts", error);
        setContacts([]);
      } else {
        setContacts((data as ContactRow[]) || []);
      }
      setLoading(false);
    }

    loadContacts();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || loading) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, edges, cols, rows } = graph;
    const edgePulse = new Float32Array(edges.length);
    const nodeOpacity = new Float32Array(nodes.length);
    const hoverScale = new Float32Array(nodes.length);
    const revealedSet = new Set<number>();
    const revealOrder = nodes
      .map((node, index) => ({ index, distance: Math.abs(node.gx - nodes[0].gx) + Math.abs(node.gy - nodes[0].gy) }))
      .sort((a, b) => a.distance - b.distance)
      .map((item) => item.index);

    const adjacency: number[][] = Array.from({ length: nodes.length }, () => []);
    for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
      const [a, b] = edges[edgeIndex];
      adjacency[a].push(edgeIndex);
      adjacency[b].push(edgeIndex);
    }

    let frame = 0;
    let revealIndex = 0;
    let introComplete = false;
    let width = 0;
    let height = 0;
    let traceEdges: number[] = [];
    let traceProgress = 0;

    const visibleSet = new Set(nodes.map((_, index) => index));

    const toPixel = (gx: number, gy: number): [number, number] => {
      const padX = width * 0.045;
      const padY = height * 0.08;
      const cellW = Math.max((width - padX * 2) / Math.max(cols - 1, 1), 18);
      const cellH = Math.max((height - padY * 2) / Math.max(rows - 1, 1), 18);
      const offX = (gy % 2) * cellW * 0.5;
      return [padX + gx * cellW + offX, padY + gy * cellH];
    };

    const startTrace = () => {
      if (!introComplete) return;

      const candidates = nodes
        .map((node, index) => ({ node, index }))
        .filter(({ node, index }) => index !== 0 && revealedSet.has(index) && node.kind !== "self");
      if (!candidates.length) return;

      const target = candidates[(frame * 7 + 11) % candidates.length].index;
      const visited = new Set<number>([0]);
      const queue = [0];
      const parent = new Map<number, { node: number; edge: number }>();

      outer: while (queue.length) {
        const current = queue.shift()!;
        if (current === target) break;

        for (const edgeIndex of adjacency[current]) {
          const [a, b] = edges[edgeIndex];
          const next = a === current ? b : a;
          if (visited.has(next)) continue;
          visited.add(next);
          parent.set(next, { node: current, edge: edgeIndex });
          queue.push(next);
          if (next === target) break outer;
        }
      }

      const path: number[] = [];
      let cursor = target;
      while (parent.has(cursor)) {
        const previous = parent.get(cursor)!;
        path.unshift(previous.edge);
        cursor = previous.node;
      }

      traceEdges = path;
      traceProgress = 0;
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const findNodeAt = (mx: number, my: number) => {
      let closest: number | null = null;
      let closestDistance = width >= 1200 ? 26 : width >= 768 ? 22 : 18;

      for (const index of visibleSet) {
        if (!revealedSet.has(index) || index === 0) continue;
        const node = nodes[index];
        const [px, py] = toPixel(node.gx, node.gy);
        const fontSize = width >= 1200 ? 10 : width >= 768 ? 9 : 8;
        const labelY = py + (node.kind === "company" ? 20 : node.tier === 1 ? 18 : node.tier === 2 ? 15 : 13);
        const labelWidth = node.name.length * fontSize * 0.58;
        if (mx >= px - labelWidth && mx <= px + labelWidth && my >= py - 12 && my <= labelY + 8) {
          const distance = Math.hypot(mx - px, my - labelY);
          if (distance < closestDistance) {
            closestDistance = distance;
            closest = index;
          }
        }
      }

      return closest;
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit = findNodeAt(event.clientX - rect.left, event.clientY - rect.top);
      hoveredNodeRef.current = hit;
      canvas.style.cursor = hit == null ? "default" : "pointer";
    };

    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const hit = findNodeAt(event.clientX - rect.left, event.clientY - rect.top);
      if (hit == null || hit === 0) return;

      const node = nodes[hit];
      const [x, y] = toPixel(node.gx, node.gy);
      const containerRect = container.getBoundingClientRect();

      onNodeClick(
        {
          id: node.id,
          name: node.name,
          title: node.title || "Network node",
          company: node.company || "Independent",
          industry: node.industry || "Relationship network",
          location: node.location || "Location unavailable",
          mutualConnections: node.mutualConnections,
          connectionStrength: node.connectionStrength,
          tier: node.tier,
          type: node.kind === "company" ? "company" : "person",
          email: node.email,
          phone: node.phone,
          linkedin: node.linkedin,
        },
        { x: containerRect.left + x, y: containerRect.top + y },
      );
    };

    const handleLeave = () => {
      hoveredNodeRef.current = null;
      canvas.style.cursor = "default";
    };

    resize();

    // Resolve CSS variables to RGB for canvas (canvas can't use CSS vars)
    const resolveColor = (varName: string): [number, number, number] => {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      // raw is like "240 5% 96%" (HSL components) — parse and convert
      const parts = raw.split(/\s+/);
      if (parts.length >= 3) {
        const h = parseFloat(parts[0]);
        const s = parseFloat(parts[1]) / 100;
        const l = parseFloat(parts[2]) / 100;
        // HSL to RGB
        const a2 = s * Math.min(l, 1 - l);
        const f = (n: number) => {
          const k = (n + h / 30) % 12;
          return l - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        };
        return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
      }
      return [200, 200, 200]; // fallback
    };

    const fg = resolveColor("--foreground");
    const pri = resolveColor("--primary");
    const warn = resolveColor("--warning");
    const cardC = resolveColor("--card");

    const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mouseleave", handleLeave);
    window.addEventListener("resize", resize);

    const visited = sessionStorage.getItem("connect-real-network-visited");

    const draw = () => {
      frame += 1;
      ctx.clearRect(0, 0, width, height);

      if (!introComplete && revealOrder.length > 0) {
        const isFirstVisit = !visited;
        const revealInterval = isFirstVisit ? 2 : 1;
        const revealPerFrame = isFirstVisit ? Math.max(1, Math.ceil(nodes.length / 120)) : Math.max(4, Math.ceil(nodes.length / 70));

        if (frame % revealInterval === 0) {
          for (let step = 0; step < revealPerFrame && revealIndex < revealOrder.length; step++) {
            const nodeIndex = revealOrder[revealIndex];
            revealedSet.add(nodeIndex);
            revealIndex += 1;

            for (const edgeIndex of adjacency[nodeIndex]) {
              const [a, b] = edges[edgeIndex];
              if (revealedSet.has(a) && revealedSet.has(b)) edgePulse[edgeIndex] = 0.78;
            }
          }
        }

        if (revealIndex >= revealOrder.length) {
          introComplete = true;
          sessionStorage.setItem("connect-real-network-visited", "true");
          startTrace();
        }
      }

      const opacityStep = visited ? 0.07 : 0.035;
      for (const index of visibleSet) {
        if (revealedSet.has(index)) nodeOpacity[index] = Math.min(1, nodeOpacity[index] + opacityStep);
      }

      const hoveredIndex = hoveredNodeRef.current;
      for (const index of visibleSet) {
        const target = index === hoveredIndex ? 1 : 0;
        hoverScale[index] += (target - hoverScale[index]) * 0.16;
      }

      if (introComplete) {
        if (frame % 7 === 0 && traceProgress < traceEdges.length) {
          edgePulse[traceEdges[traceProgress]] = 1;
          traceProgress += 1;
        }
        if (frame % 150 === 0) startTrace();
        if (frame % 14 === 0 && edges.length > 0) {
          const randomEdge = (frame * 11 + nodes.length) % edges.length;
          edgePulse[randomEdge] = Math.max(edgePulse[randomEdge], 0.42);
        }
      }

      for (let edgeIndex = 0; edgeIndex < edges.length; edgeIndex++) {
        const [a, b] = edges[edgeIndex];
        if (!revealedSet.has(a) || !revealedSet.has(b)) continue;

        const [ax, ay] = toPixel(nodes[a].gx, nodes[a].gy);
        const [bx, by] = toPixel(nodes[b].gx, nodes[b].gy);
        const pulse = edgePulse[edgeIndex];
        const alpha = Math.min(nodeOpacity[a], nodeOpacity[b]);
        const isCompanyEdge = nodes[a].kind === "company" || nodes[b].kind === "company";
        const edgeColor = isCompanyEdge ? rgba(warn, 0.08 + pulse * 0.35 * alpha) : rgba(pri, 0.08 + pulse * 0.5 * alpha);

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = pulse > 0.28 ? 1.8 : 0.8;
        ctx.stroke();

        if (pulse > 0.12) {
          const t = 1 - pulse;
          ctx.beginPath();
          ctx.arc(ax + (bx - ax) * t, ay + (by - ay) * t, isCompanyEdge ? 2.2 : 2.8, 0, Math.PI * 2);
          ctx.fillStyle = isCompanyEdge ? rgba(warn, pulse * 0.9 * alpha) : rgba(pri, pulse * 0.95 * alpha);
          ctx.fill();
        }

        edgePulse[edgeIndex] *= 0.98;
        if (edgePulse[edgeIndex] < 0.005) edgePulse[edgeIndex] = 0;
      }

      const baseFontSize = width >= 1200 ? 9.5 : width >= 768 ? 8.5 : 7.5;

      for (const index of visibleSet) {
        if (!revealedSet.has(index)) continue;

        const node = nodes[index];
        const [px, py] = toPixel(node.gx, node.gy);
        const opacity = nodeOpacity[index];
        const hover = hoverScale[index];
        const pulse = 1 + Math.sin(frame * 0.018 + index * 0.65) * 0.12;

        if (node.kind === "self") {
          const widthRect = 18 * pulse;
          const heightRect = 12 * pulse;
          const glow = ctx.createRadialGradient(px, py, 0, px, py, 30);
          glow.addColorStop(0, rgba(fg, 0.18 * opacity));
          glow.addColorStop(1, rgba(fg, 0));
          ctx.beginPath();
          ctx.arc(px, py, 30, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();

          drawRoundedRectPath(ctx, px - widthRect, py - heightRect, widthRect * 2, heightRect * 2, 4);
          ctx.fillStyle = rgba(cardC, 0.18 * opacity);
          ctx.fill();
          ctx.strokeStyle = rgba(fg, 0.78 * opacity);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.font = "700 11px 'DM Sans', sans-serif";
          ctx.fillStyle = rgba(fg, 0.96 * opacity);
          ctx.textAlign = "center";
          ctx.fillText("You", px, py + 4);
          continue;
        }

        const fontSize = baseFontSize + hover * 3.5;
        const labelAlpha = node.tier === 1 ? 0.55 : node.tier === 2 ? 0.38 : 0.24;
        const finalAlpha = (labelAlpha + hover * (1 - labelAlpha)) * opacity;
        const labelY = node.kind === "company" ? py + 18 + hover * 2 : py + (node.tier === 1 ? 16 : node.tier === 2 ? 13 : 11) + hover * 2;

        if (node.kind === "company") {
          const size = 7.5 * pulse * (1 + hover * 0.3);
          drawRoundedRectPath(ctx, px - size * 1.4, py - size, size * 2.8, size * 2, 3.5);
          ctx.fillStyle = `hsl(var(--warning) / ${0.14 + hover * 0.12})`;
          ctx.fill();
          ctx.strokeStyle = `hsl(var(--warning) / ${0.55 + hover * 0.35})`;
          ctx.lineWidth = 1 + hover * 0.6;
          ctx.stroke();
        } else if (node.tier === 1) {
          const size = 5.8 * pulse * (1 + hover * 0.25);
          drawRoundedRectPath(ctx, px - size * 1.45, py - size, size * 2.9, size * 2, 3);
          ctx.fillStyle = `hsl(var(--primary) / ${(0.14 + hover * 0.15) * opacity})`;
          ctx.fill();
          ctx.strokeStyle = `hsl(var(--primary) / ${(0.5 + hover * 0.35) * opacity})`;
          ctx.lineWidth = 1 + hover * 0.5;
          ctx.stroke();
        } else if (node.tier === 2) {
          const size = 3.8 * pulse * (1 + hover * 0.25);
          ctx.beginPath();
          ctx.moveTo(px, py - size);
          ctx.lineTo(px + size, py);
          ctx.lineTo(px, py + size);
          ctx.lineTo(px - size, py);
          ctx.closePath();
          ctx.fillStyle = `hsl(var(--primary) / ${(0.12 + hover * 0.15) * opacity})`;
          ctx.fill();
          ctx.strokeStyle = `hsl(var(--primary) / ${(0.3 + hover * 0.35) * opacity})`;
          ctx.lineWidth = 0.8 + hover * 0.5;
          ctx.stroke();
        } else {
          const radius = 2.6 * pulse * (1 + hover * 0.3);
          ctx.beginPath();
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fillStyle = `hsl(var(--primary) / ${(0.1 + hover * 0.16) * opacity})`;
          ctx.fill();
          ctx.strokeStyle = `hsl(var(--primary) / ${(0.22 + hover * 0.3) * opacity})`;
          ctx.lineWidth = 0.55 + hover * 0.45;
          ctx.stroke();
        }

        if (hover > 0.05) {
          const glowRadius = node.kind === "company" ? 18 + hover * 12 : 16 + hover * 10;
          const glow = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
          glow.addColorStop(0, node.kind === "company" ? `hsl(var(--warning) / ${0.18 * hover * opacity})` : `hsl(var(--primary) / ${0.2 * hover * opacity})`);
          glow.addColorStop(1, node.kind === "company" ? "hsl(var(--warning) / 0)" : "hsl(var(--primary) / 0)");
          ctx.beginPath();
          ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
          ctx.fillStyle = glow;
          ctx.fill();
        }

        ctx.font = `${hover > 0.2 ? 700 : 500} ${fontSize}px 'DM Sans', sans-serif`;
        ctx.fillStyle = `hsl(var(--foreground) / ${finalAlpha})`;
        ctx.textAlign = "center";
        ctx.fillText(node.name, px, labelY);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mouseleave", handleLeave);
      window.removeEventListener("resize", resize);
    };
  }, [graph, loading, onNodeClick]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]">
          <div className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm text-muted-foreground shadow-sm">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Building your live network…
          </div>
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <div className="rounded-2xl border border-border bg-card/90 px-6 py-4 text-sm text-muted-foreground shadow-sm">
            Sync or save contacts to populate your live network map.
          </div>
        </div>
      )}
    </div>
  );
}