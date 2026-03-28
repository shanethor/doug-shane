import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Type, Layout, Layers, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const AuraLogo = ({ size = 80 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
  </svg>
);

const COLORS = [
  { name: "Sage (Primary)", hsl: "hsl(140, 12%, 42%)", hex: "#5F7A61", usage: "AURA Connect logo, primary buttons, accents, links" },
  { name: "Sage Light", hsl: "hsl(140, 12%, 58%)", hex: "#8A9A8C", usage: "Hover states, secondary text, shimmer" },
  { name: "Sage Subtle", hsl: "hsl(140, 12%, 55%)", hex: "#7F9181", usage: "Credit/reward callouts, subtle highlights" },
  { name: "Studio Orange", hsl: "hsl(25, 95%, 53%)", hex: "#F97316", usage: "AURA Studio logo, Studio accents, CTA highlights" },
  { name: "Studio Amber", hsl: "hsl(38, 92%, 50%)", hex: "#F59E0B", usage: "Studio hover states, secondary Studio accents" },
  { name: "Dark Background", hsl: "hsl(240, 10%, 4%)", hex: "#08080A", usage: "App dark mode background" },
  { name: "Card Dark", hsl: "hsl(240, 8%, 7%)", hex: "#101014", usage: "Cards and panels in dark mode" },
  { name: "Border Dark", hsl: "hsl(240, 6%, 14%)", hex: "#212126", usage: "Borders, dividers in dark mode" },
  { name: "Muted Text", hsl: "hsl(240, 5%, 46%)", hex: "#706F77", usage: "Secondary/muted text" },
];

const TYPOGRAPHY = [
  { name: "Display / Hero", family: "Inter", weight: "700–800", size: "28–48px", usage: "Page headings, hero text" },
  { name: "Section Heading", family: "Inter", weight: "600–700", size: "18–24px", usage: "Card titles, section headers" },
  { name: "Body", family: "Inter", weight: "400–500", size: "14–16px", usage: "Paragraphs, descriptions" },
  { name: "Caption / Label", family: "Inter", weight: "500–600", size: "10–12px", usage: "Badges, labels, metadata (often uppercase tracking-wider)" },
  { name: "Tagline Shimmer", family: "Inter", weight: "600 italic", size: "14–16px", usage: "Brand taglines with sage/silver gradient shimmer" },
];

const PRODUCTS = [
  {
    name: "AURA Connect",
    tagline: "Relationship Intelligence Platform",
    description: "Network mapping, email & calendar integration, pipeline management, and AI-powered outreach. Designed for professionals who build relationships.",
    route: "/connect",
  },
  {
    name: "AURA Studio",
    tagline: "Content & Material Creation",
    description: "Branded content, proposals, flyers, and marketing materials powered by AI. Create polished, professional output instantly.",
    route: "/studio",
  },
];

function ColorSwatch({ color }: { color: typeof COLORS[0] }) {
  const [copied, setCopied] = useState(false);
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="space-y-2">
      <div className="h-20 rounded-lg border border-border relative group cursor-pointer" style={{ background: color.hsl }} onClick={() => copy(color.hex)}>
        {copied && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <Check className="h-5 w-5 text-white" />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold">{color.name}</p>
        <p className="text-[11px] text-muted-foreground font-mono">{color.hex}</p>
        <p className="text-[11px] text-muted-foreground font-mono">{color.hsl}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{color.usage}</p>
      </div>
    </div>
  );
}

export default function BrandKit() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "#08080A" }}>
        <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, hsl(140 12% 42% / 0.1) 0%, transparent 60%)" }} />
        <div className="max-w-5xl mx-auto px-6 py-20 relative z-10 text-center space-y-6">
          <AuraLogo size={96} />
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">AURA Brand Kit</h1>
          <p className="text-lg max-w-xl mx-auto" style={{ color: "hsl(140 12% 58%)" }}>
            Official branding guidelines, color palette, typography, and visual assets for AURA products.
          </p>
          <Badge className="text-sm px-4 py-1" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)", border: "1px solid hsl(140 12% 42% / 0.3)" }}>
            v1.0 · March 2026
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Logo */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layers className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Logo</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Primary — Dark BG</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center py-10 rounded-b-lg" style={{ background: "#08080A" }}>
                <AuraLogo size={80} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Primary — Light BG</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center py-10 rounded-b-lg bg-white">
                <AuraLogo size={80} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Wordmark</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center py-10 rounded-b-lg" style={{ background: "#08080A" }}>
                <div className="flex items-center gap-3">
                  <AuraLogo size={48} />
                  <span className="text-3xl font-extrabold text-white tracking-tight">AURA</span>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card className="border-dashed">
            <CardContent className="py-4">
              <p className="text-sm"><strong>Usage rules:</strong> Always maintain clear space equal to the logo height around the mark. The "A" lettermark inside the logo references the brand initial. The sage green square with rounded corners is the primary container. Do not distort, rotate, or recolor.</p>
              <p className="text-sm mt-2"><strong>Stylization:</strong> <p className="text-sm mt-2"><strong>Stylization:</strong> Brand name is always written as <strong>AURA</strong> (all caps).</p></p>
            </CardContent>
          </Card>
        </section>

        {/* Colors */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Palette className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Color Palette</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            AURA uses a "Sage" palette as its signature color identity. The system supports both light and dark modes with corresponding token swaps. Click any swatch to copy the hex value.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
            {COLORS.map(c => <ColorSwatch key={c.name} color={c} />)}
          </div>
          <Card className="border-dashed">
            <CardContent className="py-4 space-y-2">
              <p className="text-sm"><strong>Gradient:</strong> Sage shimmer uses <code className="text-xs bg-muted px-1 py-0.5 rounded">linear-gradient(90deg, hsl(140 12% 42%), hsl(220 10% 78%), hsl(140 12% 55%))</code></p>
              <p className="text-sm"><strong>Glow:</strong> Radial glow uses <code className="text-xs bg-muted px-1 py-0.5 rounded">radial-gradient(circle, hsl(140 12% 42% / 0.08), transparent 70%)</code></p>
              <p className="text-sm"><strong>Shadows:</strong> Sage shadow: <code className="text-xs bg-muted px-1 py-0.5 rounded">0 0 60px hsl(140 12% 42% / 0.08)</code></p>
            </CardContent>
          </Card>
        </section>

        {/* Typography */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Type className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Typography</h2>
          </div>
          <div className="space-y-3">
            {TYPOGRAPHY.map(t => (
              <Card key={t.name}>
                <CardContent className="py-4 flex items-start gap-4">
                  <div className="shrink-0 w-32">
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.family} · {t.weight}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">{t.size}</p>
                    <p className="text-xs text-muted-foreground mt-1">{t.usage}</p>
                  </div>
                  <div className="shrink-0">
                    <p style={{ fontFamily: t.family, fontWeight: parseInt(t.weight) || 600, fontSize: "18px" }}>
                      AURA Connect
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Products */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Layout className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Products</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PRODUCTS.map(p => (
              <Card key={p.name} className="overflow-hidden">
                <div className="h-3" style={{ background: p.name === "AURA Studio" ? "hsl(25 95% 53%)" : "hsl(140 12% 42%)" }} />
                <CardContent className="pt-5 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    <p className="text-sm italic" style={{ color: p.name === "AURA Studio" ? "hsl(25 95% 53%)" : "hsl(140 12% 55%)" }}>{p.tagline}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{p.description}</p>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => window.open(p.route, "_blank")}>
                    View Product →
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Visual Language */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Visual Language</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Animation & Motion</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Loading:</strong> "High-functioning" sequential fade + slide (elements enter one by one)</p>
                <p>• <strong>Transitions:</strong> Cubic bezier ease: <code className="text-xs bg-muted px-1 py-0.5 rounded">cubic-bezier(0.16, 1, 0.3, 1)</code></p>
                <p>• <strong>Network visualization:</strong> D3.js force-directed graphs with draggable nodes</p>
                <p>• <strong>Particles:</strong> Floating sage-colored particles with connection lines on dark backgrounds</p>
                <p>• <strong>Shimmer:</strong> CSS gradient animation for taglines — sage → silver → sage sweep</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">UI Patterns</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• <strong>Borders:</strong> Rounded corners (10px radius), 1px borders with low-opacity sage highlights</p>
                <p>• <strong>Cards:</strong> Subtle glass effect (bg-opacity, border glow on hover)</p>
                <p>• <strong>Badges:</strong> Small (9–10px), uppercase tracking, rounded-full</p>
                <p>• <strong>Nodes:</strong> People = circles, Companies = orange rounded squares</p>
                <p>• <strong>Tiers:</strong> S-Tier (gold ⭐), A-Tier (green 🟢), B-Tier (blue 🔵), C-Tier (gray ⚪)</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Voice & Tone */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Voice & Tone</h2>
          <Card>
            <CardContent className="py-5 space-y-3 text-sm text-muted-foreground">
              <p><strong>Primary tagline:</strong> <em>"You already know the right people. You just don't know how to get there."</em></p>
              <p><strong>Secondary tagline:</strong> <em>"Let us show you the way in."</em></p>
              <p><strong>Closer:</strong> <em>"Intelligence runs on AURA."</em></p>
              <p className="pt-2"><strong>Tone:</strong> Confident but not arrogant. Helpful, never pushy. Professional but approachable. Think: a trusted advisor who's always three steps ahead.</p>
              <p><strong>Avoid:</strong> Overly salesy language, generic AI hype, corporate jargon, exclamation marks in headings.</p>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <div className="text-center py-10 border-t border-border">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} AURA · Brand Kit v1.0</p>
          <p className="text-xs text-muted-foreground mt-1">Questions? Contact brand@aurarisk.com</p>
        </div>
      </div>
    </div>
  );
}
