import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Network, ZoomIn, ZoomOut, Maximize2, Mail, Phone, Linkedin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GraphNode {
  id: string;
  name: string;
  type: "producer" | "client" | "prospect" | "contact" | "company";
  company?: string;
  score?: number;
  email?: string;
  linkedin?: string;
  phone?: string;
}

// Heuristic: detect if a name looks like a company/business rather than a person
function looksLikeCompany(name: string, email?: string): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  // Common business suffixes/keywords
  const bizPatterns = [
    /\b(inc|llc|ltd|corp|co|team|group|systems?|solutions?|services?|agency|airlines?|media|labs?|studio|foundation|association|club)\b/i,
    /\b(newsletter|updates?|digest|weekly|daily|finds|deals|alerts?)\b/i,
    /@/,  // email addresses used as names
  ];
  if (bizPatterns.some(p => p.test(lower))) return true;
  // noreply / no-reply / apps- style emails
  if (email && /^(noreply|no-reply|apps-|info@|support@|hello@|team@|admin@|sales@|marketing@)/i.test(email)) return true;
  // Names with no space likely aren't real people (single word like "ESPN", "Adobe")
  if (!name.includes(" ") && name.length > 2 && /^[A-Z]/.test(name)) return true;
  return false;
}

interface GraphLink {
  source: string;
  target: string;
  type: "owns" | "discovered" | "mutual" | "feeder";
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function RelationshipMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => { loadGraphData(); }, []);

  async function loadGraphData() {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nodes: GraphNode[] = [];
      const links: GraphLink[] = [];
      const nodeIds = new Set<string>();

      // Producer node (center)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();

      nodes.push({ id: user.id, name: profile?.full_name || "You", type: "producer" });
      nodeIds.add(user.id);

      // Canonical contacts (clients)
      const { data: contacts } = await supabase
        .from("canonical_persons")
        .select("id, display_name, company, primary_email, linkedin_url, primary_phone")
        .eq("owner_user_id", user.id)
        .limit(50);

      for (const c of contacts || []) {
        if (nodeIds.has(c.id)) continue;
        const name = c.display_name || "Unknown";
        const isCompany = looksLikeCompany(name, c.primary_email || undefined);
        nodes.push({
          id: c.id, name, type: isCompany ? "company" : "client",
          company: c.company || undefined, email: c.primary_email || undefined,
          linkedin: c.linkedin_url || undefined, phone: c.primary_phone || undefined,
        });
        nodeIds.add(c.id);
        links.push({ source: user.id, target: c.id, type: "owns" });
      }

      // Discovered contacts
      const { data: discovered } = await supabase
        .from("email_discovered_contacts" as any)
        .select("id, display_name, email_address, hunter_company, hunter_linkedin_url, hunter_phone, prospect_score")
        .eq("user_id", user.id)
        .neq("status", "dismissed")
        .limit(30);

      for (const d of (discovered || []) as any[]) {
        if (nodeIds.has(d.id)) continue;
        nodes.push({
          id: d.id, name: d.display_name || d.email_address, type: "contact",
          company: d.hunter_company || undefined, score: d.prospect_score || undefined,
          email: d.email_address, linkedin: d.hunter_linkedin_url || undefined,
          phone: d.hunter_phone || undefined,
        });
        nodeIds.add(d.id);
        links.push({ source: user.id, target: d.id, type: "discovered" });
      }

      // Feeder list prospects (most recent list)
      const { data: recentList } = await supabase
        .from("feeder_lists" as any)
        .select("id, client_name")
        .eq("status", "ready")
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentList) {
        const { data: prospects } = await supabase
          .from("feeder_list_prospects" as any)
          .select("id, name, company, email, linkedin_url, phone, prospect_score, relationship_to_client")
          .eq("feeder_list_id", (recentList as any).id)
          .limit(15);

        for (const p of (prospects || []) as any[]) {
          if (nodeIds.has(p.id)) continue;
          nodes.push({
            id: p.id, name: p.name, type: "prospect",
            company: p.company || undefined, score: p.prospect_score || undefined,
            email: p.email || undefined, linkedin: p.linkedin_url || undefined,
            phone: p.phone || undefined,
          });
          nodeIds.add(p.id);
          // Link to producer
          links.push({ source: user.id, target: p.id, type: "feeder", label: p.relationship_to_client });
        }
      }

      setData({ nodes, links });
    } catch (err) {
      console.error("Failed to load graph data:", err);
    } finally {
      setLoading(false);
    }
  }

  const renderGraph = useCallback(() => {
    if (!data || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);
    zoomRef.current = zoom;

    // Color by type
    const colorMap: Record<string, string> = {
      producer: "hsl(var(--primary))",
      client: "#22c55e",
      prospect: "#f59e0b",
      contact: "#8b5cf6",
      company: "#f97316",
    };

    const sizeMap: Record<string, number> = {
      producer: 24,
      client: 14,
      prospect: 12,
      contact: 10,
      company: 16,
    };

    // Force simulation
    const simulation = d3.forceSimulation(data.nodes as any)
      .force("link", d3.forceLink(data.links as any).id((d: any) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Links
    const link = g.append("g")
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke", (d) => d.type === "feeder" ? "#f59e0b" : d.type === "discovered" ? "#8b5cf6" : "#22c55e")
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d) => d.type === "feeder" ? "4,4" : "none");

    // Nodes
    const node = g.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .style("cursor", "pointer")
      .on("click", (_event, d: any) => setSelectedNode(d))
      .call(d3.drag<any, any>()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (event, d: any) => { d.fx = event.x; d.fy = event.y; })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Node circles
    node.append("circle")
      .attr("r", (d) => sizeMap[d.type] || 10)
      .attr("fill", (d) => colorMap[d.type] || "#666")
      .attr("stroke", "hsl(var(--background))")
      .attr("stroke-width", 2);

    // Score ring for prospects
    node.filter((d) => d.type === "prospect" && d.score != null)
      .append("circle")
      .attr("r", (d) => (sizeMap[d.type] || 10) + 4)
      .attr("fill", "none")
      .attr("stroke", (d) => (d.score || 0) >= 80 ? "#22c55e" : (d.score || 0) >= 60 ? "#f59e0b" : "#ef4444")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "3,3");

    // Labels
    node.append("text")
      .text((d) => d.name.length > 15 ? d.name.slice(0, 14) + "…" : d.name)
      .attr("dy", (d) => (sizeMap[d.type] || 10) + 14)
      .attr("text-anchor", "middle")
      .attr("fill", "hsl(var(--foreground))")
      .attr("font-size", "10px")
      .attr("font-weight", (d) => d.type === "producer" ? "bold" : "normal");

    // Tick
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => simulation.stop();
  }, [data]);

  useEffect(() => { renderGraph(); }, [renderGraph]);

  function handleZoom(direction: "in" | "out" | "fit") {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    if (direction === "in") svg.transition().call(zoomRef.current.scaleBy, 1.4);
    else if (direction === "out") svg.transition().call(zoomRef.current.scaleBy, 0.7);
    else svg.transition().call(zoomRef.current.scaleTo, 1);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" /> Relationship Map
          </h2>
          <p className="text-sm text-muted-foreground">Interactive visualization of your network connections</p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleZoom("in")}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleZoom("out")}><ZoomOut className="h-4 w-4" /></Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleZoom("fit")}><Maximize2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        {[
          { color: "hsl(var(--primary))", label: "You" },
          { color: "#22c55e", label: "Clients" },
          { color: "#f59e0b", label: "Prospects" },
          { color: "#8b5cf6", label: "Discovered" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      <div className="relative rounded-xl border border-border bg-card overflow-hidden" style={{ height: 500 }}>
        <svg ref={svgRef} width="100%" height="100%" />

        {/* Selected Node Panel */}
        {selectedNode && (
          <div className="absolute top-4 right-4 w-72 z-10">
            <Card className="shadow-lg">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{selectedNode.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] capitalize">{selectedNode.type}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {selectedNode.company && <p className="text-muted-foreground">🏢 {selectedNode.company}</p>}
                {selectedNode.score != null && <p className="text-muted-foreground">📊 Score: {selectedNode.score}</p>}
                <div className="flex gap-2 pt-1">
                  {selectedNode.email && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(`mailto:${selectedNode!.email}`)}>
                      <Mail className="h-3 w-3 mr-1" /> Email
                    </Button>
                  )}
                  {selectedNode.phone && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(`tel:${selectedNode!.phone}`)}>
                      <Phone className="h-3 w-3 mr-1" /> Call
                    </Button>
                  )}
                  {selectedNode.linkedin && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => window.open(selectedNode!.linkedin!, "_blank")}>
                      <Linkedin className="h-3 w-3 mr-1" /> Profile
                    </Button>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-muted-foreground" onClick={() => setSelectedNode(null)}>
                  Close
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {data && (
        <p className="text-xs text-muted-foreground text-center">
          {data.nodes.length} nodes · {data.links.length} connections · Click a node for details · Drag to rearrange
        </p>
      )}
    </div>
  );
}
