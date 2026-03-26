import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Zap, Shield, BarChart3, Mail, Users, Sparkles as SparklesIcon, Search, Check, Lock, Loader2, LayoutGrid } from "lucide-react";
import { setEmailLayout, type EmailLayout } from "@/components/connect-demo/email-views/useEmailEngine";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { getAuthHeaders } from "@/lib/auth-fetch";
import { toast } from "sonner";

const AuraLogo = ({ size = 56 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <rect width="100" height="100" rx="22" fill="hsl(140 12% 42%)" />
    <path d="M50 18L74 82H62.5L58 70H42L37.5 82H26L50 18Z" fill="#08080A" />
    <rect x="39" y="62" width="22" height="5.5" rx="2.75" fill="hsl(140 12% 42%)" />
  </svg>
);

/* ── Floating particles ── */
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf: number;
    const particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];
    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize();
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        a: Math.random() * 0.4 + 0.1,
      });
    }
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = c.width;
        if (p.x > c.width) p.x = 0;
        if (p.y < 0) p.y = c.height;
        if (p.y > c.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(138, 154, 140, ${p.a})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(138, 154, 140, ${0.06 * (1 - d / 120)})`;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none" />;
}

/* ── Node burst transition canvas ── */
function NodeBurstTransition({ phase, onDone }: { phase: "collapse" | "expand"; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startRef = useRef(0);
  const nodesRef = useRef<{ x: number; y: number; tx: number; ty: number; sx: number; sy: number; r: number; delay: number }[]>([]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    c.width = c.offsetWidth * 2;
    c.height = c.offsetHeight * 2;
    ctx.scale(2, 2);
    const w = c.offsetWidth;
    const h = c.offsetHeight;
    const cx = w / 2;
    const cy = h / 2;

    const COUNT = 24;
    const nodes: typeof nodesRef.current = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = (Math.PI * 2 * i) / COUNT + (Math.random() - 0.5) * 0.3;
      const dist = 40 + Math.random() * 100;
      const edgeX = cx + Math.cos(angle) * dist;
      const edgeY = cy + Math.sin(angle) * dist;
      if (phase === "collapse") {
        nodes.push({ sx: edgeX, sy: edgeY, tx: cx, ty: cy, x: edgeX, y: edgeY, r: 3 + Math.random() * 3, delay: Math.random() * 0.3 });
      } else {
        nodes.push({ sx: cx, sy: cy, tx: edgeX, ty: edgeY, x: cx, y: cy, r: 3 + Math.random() * 3, delay: Math.random() * 0.3 });
      }
    }
    nodesRef.current = nodes;
    startRef.current = performance.now();

    const DURATION = 800;
    let raf: number;

    function draw(now: number) {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / DURATION, 1);
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        const np = Math.max(0, Math.min(1, (progress - n.delay) / (1 - n.delay)));
        const ease = np < 0.5 ? 2 * np * np : 1 - Math.pow(-2 * np + 2, 2) / 2;
        n.x = n.sx + (n.tx - n.sx) * ease;
        n.y = n.sy + (n.ty - n.sy) * ease;

        const alpha = phase === "collapse" ? 0.3 + 0.7 * (1 - np) : 0.3 + 0.7 * np;
        const scale = phase === "collapse" ? 1 - np * 0.5 : 0.5 + np * 0.5;

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * scale, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(140, 12%, 50%, ${alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * scale + 4, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(140, 12%, 50%, ${alpha * 0.15})`;
        ctx.fill();
      }

      // Draw lines between close nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 80) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `hsla(140, 12%, 50%, ${0.2 * (1 - d / 80)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }

      if (progress < 1) {
        raf = requestAnimationFrame(draw);
      } else {
        onDone();
      }
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [phase, onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-20 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

/* ── Orbiting nodes around tagline ── */
function TaglineNodes() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    let raf: number;
    const dpr = 2;

    function resize() {
      const rect = c.getBoundingClientRect();
      c.width = rect.width * dpr;
      c.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const NODE_COUNT = 14;
    const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
      angle: (Math.PI * 2 * i) / NODE_COUNT,
      speed: 0.002 + Math.random() * 0.004,
      radiusX: 120 + Math.random() * 100,
      radiusY: 18 + Math.random() * 16,
      r: 2 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
    }));

    function draw() {
      const rect = c.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;

      for (const n of nodes) {
        n.angle += n.speed;
        const x = cx + Math.cos(n.angle + n.phase) * n.radiusX;
        const y = cy + Math.sin(n.angle + n.phase) * n.radiusY;

        ctx.beginPath();
        ctx.arc(x, y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(140, 12%, 55%, 0.6)`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, n.r + 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(140, 12%, 55%, 0.1)`;
        ctx.fill();
      }

      // Connect nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        const ax = cx + Math.cos(nodes[i].angle + nodes[i].phase) * nodes[i].radiusX;
        const ay = cy + Math.sin(nodes[i].angle + nodes[i].phase) * nodes[i].radiusY;
        for (let j = i + 1; j < nodes.length; j++) {
          const bx = cx + Math.cos(nodes[j].angle + nodes[j].phase) * nodes[j].radiusX;
          const by = cy + Math.sin(nodes[j].angle + nodes[j].phase) * nodes[j].radiusY;
          const d = Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
          if (d < 140) {
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = `hsla(140, 12%, 55%, ${0.12 * (1 - d / 140)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    }
    draw();
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

const FEATURES = [
  { icon: Users, label: "Network Intelligence", delay: "0.3s" },
  { icon: BarChart3, label: "Pipeline", delay: "0.5s" },
  { icon: Mail, label: "Email & Calendar", delay: "0.7s" },
  { icon: SparklesIcon, label: "Create", delay: "0.9s" },
  { icon: Zap, label: "Sage", delay: "1.1s" },
];
const INDUSTRIES = [
  "Accounting", "Advertising & Marketing", "Agriculture", "Architecture", "Automotive",
  "Banking & Finance", "Biotechnology", "Cannabis", "Commercial Real Estate", "Construction",
  "Consulting", "Cybersecurity", "Dental", "E-Commerce", "Education", "Energy & Utilities",
  "Engineering", "Entertainment", "Environmental Services", "Event Planning", "Fashion & Apparel",
  "Film & Media", "Financial Planning", "Fitness & Wellness", "Food & Beverage", "Franchise",
  "Government", "Healthcare", "Hospitality & Hotels", "Human Resources", "Import / Export",
  "Information Technology", "Insurance", "Interior Design", "Investment Management", "Law / Legal",
  "Logistics & Supply Chain", "Manufacturing", "Medical Devices", "Mining", "Mortgage & Lending",
  "Music", "Nonprofit", "Oil & Gas", "Pharmaceuticals", "Photography", "Private Equity",
  "Professional Services", "Property Management", "Publishing", "Real Estate",
  "Recruiting & Staffing", "Renewable Energy", "Residential Real Estate", "Restaurant",
  "Retail", "SaaS / Software", "Security Services", "Social Media", "Sports & Recreation",
  "Telecommunications", "Transportation", "Travel & Tourism", "Venture Capital",
  "Veterinary", "Video Production", "Warehousing", "Wealth Management", "Wholesale", "Other",
];
type Step = "auth" | "subscribe" | "welcome" | "email_layout" | "building";
const IS_DEMO = true; // Label this flow as demo

const ACCOUNT_OPTIONS: { id: string; label: string; desc: string; color: string; icon: string; oauthProvider?: string; status: "ready" | "coming_soon" }[] = [
  { id: "google", label: "Google", desc: "Gmail, Contacts, Calendar", color: "#4285F4", icon: "G", oauthProvider: "gmail", status: "ready" },
  { id: "outlook", label: "Outlook", desc: "Email, Contacts, Calendar", color: "#0078D4", icon: "O", oauthProvider: "outlook", status: "ready" },
  { id: "linkedin", label: "LinkedIn", desc: "Contacts, Posting", color: "#0A66C2", icon: "in", status: "coming_soon" },
  { id: "instagram", label: "Instagram", desc: "Contacts, Posting", color: "#E4405F", icon: "IG", status: "coming_soon" },
  { id: "facebook", label: "Facebook", desc: "Contacts, Posting", color: "#1877F2", icon: "f", status: "coming_soon" },
  { id: "slack", label: "Slack", desc: "Messaging, Notifications", color: "#4A154B", icon: "S", status: "ready" },
  { id: "apple", label: "Apple ID", desc: "Contacts, Calendar", color: "#A2AAAD", icon: "", status: "coming_soon" },
];

export default function ConnectDemoAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<Step>("auth");
  const [cardVisible, setCardVisible] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [industryOpen, setIndustryOpen] = useState(false);
  const industryRef = useRef<HTMLDivElement>(null);
  const [welcomeReady, setWelcomeReady] = useState(false);
  const [buildPhase, setBuildPhase] = useState(0);
  const [connectedAccounts, setConnectedAccounts] = useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem("connect-demo-linked");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });
  const [connectingAccount, setConnectingAccount] = useState<string | null>(null);
  const [syncingNetwork, setSyncingNetwork] = useState(false);

  // Persist connected accounts
  useEffect(() => {
    sessionStorage.setItem("connect-demo-linked", JSON.stringify([...connectedAccounts]));
  }, [connectedAccounts]);

  // Handle OAuth callback return — check if we're returning from an OAuth flow
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const pendingProvider = sessionStorage.getItem("connect-demo-oauth-pending");

    if (code && state && pendingProvider) {
      // We're returning from OAuth — exchange the code
      sessionStorage.removeItem("connect-demo-oauth-pending");
      setStep("welcome");
      setConnectingAccount(pendingProvider === "gmail" ? "google" : pendingProvider === "outlook" ? "outlook" : pendingProvider);

      (async () => {
        try {
          const headers = await getAuthHeaders();
          const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              action: "exchange_code",
              provider: state,
              code,
              redirect_uri: `${window.location.origin}/connectdemo/auth`,
            }),
          });
          const data = await resp.json();
          if (!resp.ok) throw new Error(data.error || "Failed to connect");

          const accountId = state === "gmail" ? "google" : "outlook";
          setConnectedAccounts(prev => new Set([...prev, accountId]));
          toast.success(`Connected ${data.email} via ${state === "gmail" ? "Google" : "Outlook"}`);

          // Auto-trigger contact sync
          triggerContactSync(state === "gmail" ? "sync_google" : "sync_outlook", headers);
        } catch (err: any) {
          toast.error(err.message || "Connection failed");
        } finally {
          setConnectingAccount(null);
          // Clean URL params
          window.history.replaceState({}, "", "/connectdemo/auth");
        }
      })();
    }

    // Restore step if returning from OAuth
    if (pendingProvider && !code) {
      // User cancelled OAuth
      sessionStorage.removeItem("connect-demo-oauth-pending");
    }

    // If we have saved connected accounts but are on auth step, check if we should be on welcome
    const savedStep = sessionStorage.getItem("connect-demo-step");
    if (savedStep === "email_layout") setStep("email_layout");
    else if (savedStep === "welcome") setStep("welcome");
    else if (savedStep === "subscribe") setStep("subscribe");
  }, [searchParams]);

  // Save step to session so OAuth return knows where to go
  useEffect(() => {
    sessionStorage.setItem("connect-demo-step", step);
  }, [step]);

  const triggerContactSync = async (action: string, headers: Record<string, string>) => {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-contacts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action }),
      });
    } catch (e) {
      console.error("Contact sync failed:", e);
    }
  };

  const handleAccountConnect = async (acc: typeof ACCOUNT_OPTIONS[0]) => {
    if (acc.status === "coming_soon") {
      toast.info(`${acc.label} integration coming soon`);
      return;
    }

    // Google / Outlook — real OAuth
    if (acc.oauthProvider) {
      setConnectingAccount(acc.id);
      try {
        const headers = await getAuthHeaders();
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-oauth`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            action: "get_auth_url",
            provider: acc.oauthProvider,
            redirect_uri: `${window.location.origin}/connectdemo/auth`,
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || "Failed to get auth URL");

        // Store pending state so we know to resume on return
        sessionStorage.setItem("connect-demo-oauth-pending", acc.oauthProvider);
        window.location.href = data.url;
      } catch (err: any) {
        toast.error(err.message || `Failed to connect ${acc.label}`);
        setConnectingAccount(null);
      }
      return;
    }

    // Slack — mark as connected (uses Slack connector already linked)
    if (acc.id === "slack") {
      setConnectedAccounts(prev => new Set([...prev, "slack"]));
      toast.success("Slack connected");
      return;
    }
  };

  const connectedCount = connectedAccounts.size;
  const unlockThreshold = 5;

  // Live savings calculation based on reward tiers
  const accountSavings = useMemo(() => {
    const totalAvailable = ACCOUNT_OPTIONS.length;
    let credit = 0;
    if (connectedCount >= totalAvailable) credit = 15; // All accounts
    else if (connectedCount >= 10) credit = 10;
    else if (connectedCount >= 5) credit = 5;
    return credit;
  }, [connectedCount]);

  // Potential max savings (accounts + contacts combined)
  const maxAccountSavings = 15;
  const maxContactSavings = 50;
  const maxTotalSavings = maxAccountSavings + maxContactSavings; // $65 total possible

  // Start building network after 2+ accounts linked
  const handleBuildNetwork = async () => {
    if (connectedCount < 1) return;
    setSyncingNetwork(true);
    try {
      const headers = await getAuthHeaders();
      // Trigger contact resolver to merge + deduplicate
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-resolver`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "resolve" }),
      });
      // Trigger Hunter.io enrichment
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hunter-enrich`, {
        method: "POST",
        headers,
        body: JSON.stringify({ action: "bulk_enrich", limit: 15 }),
      });
      toast.success("Network intelligence is building — your connections are being enriched");
    } catch (e) {
      console.error("Network build error:", e);
    } finally {
      setSyncingNetwork(false);
    }
  };

  const toggleAccount = (id: string) => {
    const acc = ACCOUNT_OPTIONS.find(a => a.id === id);
    if (!acc) return;

    // If already connected, allow disconnect
    if (connectedAccounts.has(id)) {
      setConnectedAccounts(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }

    handleAccountConnect(acc);
  };

  useEffect(() => {
    if (step === "welcome") {
      setWelcomeReady(false);
      setBuildPhase(0);
      const t0 = setTimeout(() => setWelcomeReady(true), 100);
      const t1 = setTimeout(() => setBuildPhase(1), 400);
      const t2 = setTimeout(() => setBuildPhase(2), 1000);
      const t3 = setTimeout(() => setBuildPhase(3), 1600);
      const t4 = setTimeout(() => setBuildPhase(4), 2200);
      const t5 = setTimeout(() => setBuildPhase(5), 3400);
      return () => [t0, t1, t2, t3, t4, t5].forEach(clearTimeout);
    }
    setWelcomeReady(false);
    setBuildPhase(0);
  }, [step]);

  const filteredIndustries = useMemo(() => {
    if (!industry.trim()) return INDUSTRIES.slice(0, 8);
    const q = industry.toLowerCase();
    return INDUSTRIES.filter(i => i.toLowerCase().includes(q)).slice(0, 8);
  }, [industry]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (industryRef.current && !industryRef.current.contains(e.target as Node)) setIndustryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goToStep = useCallback((next: Step) => {
    setCardVisible(false);
    setTimeout(() => {
      setStep(next);
      setTimeout(() => setCardVisible(true), 50);
    }, 400);
  }, []);

  const handleSubscribe = () => goToStep("welcome");
  const handleEnter = async () => {
    // Go to email layout picker before entering
    goToStep("email_layout");
  };

  const [buildProgress, setBuildProgress] = useState(0);
  const [buildMessages] = useState([
    "Initializing AuRa engine…",
    "Mapping your network…",
    "Scanning connections…",
    "Analyzing relationship patterns…",
    "Building intelligence layer…",
    "Syncing email & calendar…",
    "Calibrating AI models…",
    "Almost ready…",
  ]);
  const [buildMsgIdx, setBuildMsgIdx] = useState(0);

  const handleFinalEnter = async (selectedLayout: EmailLayout = "aura") => {
    setEmailLayout(selectedLayout);
    sessionStorage.setItem("connect-demo-auth", "true");
    sessionStorage.setItem("connect-demo-name", name || email.split("@")[0]);
    sessionStorage.setItem("connect-demo-industry", industry);
    if (connectedCount > 0) {
      handleBuildNetwork();
    }
    // Show building screen instead of navigating immediately
    goToStep("building");
  };

  // Building phase timer
  useEffect(() => {
    if (step !== "building") return;
    setBuildProgress(0);
    setBuildMsgIdx(0);
    const totalDuration = 5000;
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / totalDuration) * 100, 100);
      setBuildProgress(pct);
      const msgIdx = Math.min(Math.floor((elapsed / totalDuration) * buildMessages.length), buildMessages.length - 1);
      setBuildMsgIdx(msgIdx);
      if (elapsed >= totalDuration) {
        clearInterval(timer);
        // Navigate after build completes
        setTimeout(() => navigate("/connectdemo"), 600);
      }
    }, interval);
    return () => clearInterval(timer);
  }, [step]);

  /* ── shared header (logo only for pages 2+3) ── */
  const renderHeader = (showTagline = false) => (
    <div className="text-center space-y-3">
      <div className="mx-auto flex items-center justify-center"><AuraLogo size={48} /></div>
      <h1 className="text-xl font-bold text-white">AuRa Connect</h1>
      {showTagline && (
        <>
          <p className="text-sm font-medium" style={{ color: "hsl(140 12% 58%)" }}>
            You already know the right people. You just don't know how to get there.
          </p>
          <div className="relative py-4" style={{ minHeight: 56 }}>
            <div className="absolute pointer-events-none" style={{ top: "-40px", bottom: "-80px", left: "-120px", right: "-120px", zIndex: 0 }}>
              <TaglineNodes />
            </div>
            <p className="text-sm font-semibold italic sage-shimmer relative z-10">
              Let us show you the way in.
            </p>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full overflow-x-hidden flex items-center justify-center p-4" style={{ background: "#08080A" }}>
      <Particles />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(600px,100vw)] h-[min(600px,100vh)] rounded-full pointer-events-none z-0"
        style={{ background: "radial-gradient(circle, hsl(140 12% 42% / 0.08) 0%, transparent 70%)" }} />

      <div className="w-full max-w-md relative z-10">

        <div className="space-y-6">
          {step === "auth" && (
            <>
              <div
                className="rounded-xl border p-6 space-y-6"
                style={{
                  background: "hsl(240 8% 7%)",
                  borderColor: "hsl(240 6% 14%)",
                  transition: "opacity 0.5s ease, transform 0.5s ease",
                  opacity: cardVisible ? 1 : 0,
                  transform: cardVisible ? "scale(1)" : "scale(0.7)",
                }}
              >
                {renderHeader(true)}
                {/* DEMO badge */}
                <div className="flex justify-center">
                  <Badge className="text-[10px] px-3 py-0.5" style={{ background: "hsl(140 12% 42% / 0.15)", color: "hsl(140 12% 58%)", border: "1px solid hsl(140 12% 42% / 0.3)" }}>
                    DEMO
                  </Badge>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); if (email && name) goToStep("welcome"); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/80">Name</Label>
                    <Input placeholder="Your name" required value={name} onChange={e => setName(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(140,12%,42%)] transition-colors" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80">Email</Label>
                    <Input type="email" placeholder="you@example.com" required value={email} onChange={e => setEmail(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[hsl(140,12%,42%)] transition-colors" />
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="mt-1 accent-[hsl(140,12%,42%)]" />
                    <span className="text-[11px]" style={{ color: "hsl(240 5% 50%)" }}>
                      I consent to receive product updates and marketing emails from AuRa. You can unsubscribe at any time.
                    </span>
                  </label>
                  <Button type="submit" className="w-full text-white font-semibold hover:brightness-110 transition-all" style={{ background: "hsl(140 12% 42%)" }}>
                    Try the Demo <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </div>
              <p className="text-xl text-center font-semibold mt-10" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
            </>
          )}

          {step === "subscribe" && (
            <>
              <div
                className="rounded-xl border p-6 space-y-6"
                style={{
                  background: "hsl(240 8% 7%)",
                  borderColor: "hsl(240 6% 14%)",
                  transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
                  opacity: cardVisible ? 1 : 0,
                  transform: cardVisible ? "scale(1)" : "scale(0.7)",
                }}
              >
                {renderHeader()}
                <div>
                  <h2 className="text-lg font-semibold text-center" style={{ color: "hsl(240 5% 56%)" }}>Choose your plan</h2>
                </div>
                <div className="rounded-lg border-2 p-4 space-y-3" style={{ borderColor: "hsl(140 12% 42%)", background: "hsl(140 12% 42% / 0.05)" }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">AuRa Connect Pro</span>
                    <div className="text-right">
                      <span className="text-sm line-through" style={{ color: "hsl(240 5% 40%)" }}>$250/mo</span>
                      <span className="text-lg font-bold ml-2" style={{ color: "hsl(140 12% 58%)" }}>$100/mo</span>
                      <p className="text-[10px]" style={{ color: "hsl(140 12% 55%)" }}>Intro rate · first 6 months</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-white">✓ Smart Pipeline</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>Know who to call next and why.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">✓ Network Intelligence</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>See the path in through your network.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">✓ Email + Calendar</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>All relationships in one place. Work and personal.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">✓ Create</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>Content and materials that represent you right.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">✓ Sage</p>
                      <p className="text-xs ml-4" style={{ color: "hsl(240 5% 46%)" }}>Rewrite, research, and guide your next move.</p>
                    </div>
                  </div>
                </div>
                <Button className="w-full text-white font-semibold hover:brightness-110 transition-all" style={{ background: "hsl(140 12% 42%)" }} onClick={handleSubscribe}>
                  Subscribe <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <p className="text-xs text-center" style={{ color: "hsl(140 12% 58%)" }}>
                  💡 Earn up to $65 in credit by connecting accounts & contacts
                </p>
                <p className="text-xs text-center" style={{ color: "hsl(240 5% 46%)" }}>Demo mode — no payment required</p>
              </div>
              <p className="text-xl text-center font-semibold mt-10" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
            </>
          )}

          {step === "welcome" && (
            <div className="space-y-6">
              <div
                className="rounded-xl border p-8 text-center overflow-hidden"
                style={{
                  background: "hsl(240 8% 7%)",
                  borderColor: welcomeReady ? "hsl(140 12% 42% / 0.3)" : "hsl(240 6% 14%)",
                  transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1), border-color 0.7s ease, box-shadow 0.7s ease",
                  opacity: cardVisible && welcomeReady ? 1 : 0,
                  transform: cardVisible && welcomeReady ? "translateY(0) scale(1)" : "translateY(30px) scale(0.7)",
                  boxShadow: welcomeReady ? "0 0 60px hsl(140 12% 42% / 0.08)" : "none",
                }}
              >
                <div
                  className="relative mx-auto w-20 h-20 flex items-center justify-center mb-5 transition-all duration-700"
                  style={{ opacity: buildPhase >= 1 ? 1 : 0, transform: buildPhase >= 1 ? "scale(1)" : "scale(0.5)" }}
                >
                  <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "hsl(140 12% 42% / 0.15)", animationDuration: "2s" }} />
                  <div className="absolute inset-1 rounded-full" style={{ background: "hsl(140 12% 42% / 0.1)" }} />
                  <AuraLogo size={52} />
                </div>

                <h2
                  className="text-2xl font-bold text-white mb-2 transition-all"
                  style={{ transitionDuration: "600ms", opacity: buildPhase >= 2 ? 1 : 0, transform: buildPhase >= 2 ? "translateY(0)" : "translateY(15px)" }}
                >
                  Welcome to AuRa Connect
                </h2>


                <div className="mx-auto mb-4 h-px transition-all duration-700" style={{
                  background: "hsl(140 12% 42% / 0.3)",
                  width: buildPhase >= 3 ? "80%" : "0%",
                }} />

                <div className="flex flex-wrap justify-center gap-2 pt-1 mb-5">
                  {FEATURES.map((f, i) => (
                    <span
                      key={f.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-500"
                      style={{
                        background: "hsl(140 12% 42% / 0.1)",
                        color: "hsl(140 12% 58%)",
                        border: "1px solid hsl(140 12% 42% / 0.2)",
                        opacity: buildPhase >= 4 ? 1 : 0,
                        transform: buildPhase >= 4 ? "translateY(0) scale(1)" : "translateY(12px) scale(0.9)",
                        transitionDelay: `${i * 200}ms`,
                      }}
                    >
                      <f.icon className="h-3 w-3" />
                      {f.label}
                    </span>
                  ))}
                </div>

                <div className="space-y-4" style={{
                  opacity: buildPhase >= 5 ? 1 : 0,
                  transform: buildPhase >= 5 ? "translateY(0) scale(1)" : "translateY(10px) scale(0.95)",
                  transitionDuration: "500ms",
                  transitionProperty: "opacity, transform",
                  pointerEvents: buildPhase >= 5 ? "auto" : "none",
                }}>
                  {/* Account linking section */}
                  <div className="space-y-3">
                    <div className="text-center space-y-1">
                      <p className="text-xs font-semibold text-white">Connect your accounts</p>
                      <p className="text-[10px]" style={{ color: "hsl(240 5% 46%)" }}>
                        Optional — connect 5+ to unlock full network intelligence
                      </p>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium" style={{ color: connectedCount >= unlockThreshold ? "hsl(140 12% 58%)" : "hsl(240 5% 50%)" }}>
                          {connectedCount}/{unlockThreshold} connected
                        </span>
                        {connectedCount >= unlockThreshold && (
                          <span className="text-[10px] font-semibold flex items-center gap-1" style={{ color: "hsl(140 12% 58%)" }}>
                            <Check className="h-3 w-3" /> Full access unlocked
                          </span>
                        )}
                      </div>

                      {/* Live savings indicator */}
                      {connectedCount > 0 && (
                        <div
                          className="rounded-lg p-3 text-center transition-all duration-500"
                          style={{
                            background: accountSavings > 0 ? "hsl(140 12% 42% / 0.1)" : "hsl(240 6% 10%)",
                            border: `1px solid ${accountSavings > 0 ? "hsl(140 12% 42% / 0.3)" : "hsl(240 6% 18%)"}`,
                          }}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-[10px] font-medium" style={{ color: "hsl(240 5% 50%)" }}>Credit earned:</span>
                            <span
                              className="text-lg font-bold transition-all duration-300"
                              style={{
                                color: accountSavings > 0 ? "hsl(140 12% 58%)" : "hsl(240 5% 40%)",
                              }}
                            >
                              ${accountSavings}
                            </span>
                            <span className="text-[10px]" style={{ color: "hsl(240 5% 40%)" }}>one-time</span>
                          </div>
                          {accountSavings > 0 ? (
                            <p className="text-[10px] mt-1" style={{ color: "hsl(140 12% 55%)" }}>
                              🎉 ${accountSavings} credit unlocked — applied at checkout!
                            </p>
                          ) : connectedCount < 5 ? (
                            <p className="text-[10px] mt-1" style={{ color: "hsl(240 5% 46%)" }}>
                              Connect {5 - connectedCount} more account{5 - connectedCount > 1 ? "s" : ""} to earn $5 credit
                            </p>
                          ) : null}
                          {accountSavings > 0 && accountSavings < maxAccountSavings && (
                            <p className="text-[9px] mt-0.5" style={{ color: "hsl(240 5% 40%)" }}>
                              Up to ${maxTotalSavings} in credit possible with all accounts + contacts
                            </p>
                          )}
                        </div>
                      )}
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(240 6% 14%)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min((connectedCount / unlockThreshold) * 100, 100)}%`,
                            background: connectedCount >= unlockThreshold
                              ? "hsl(140 12% 50%)"
                              : "linear-gradient(90deg, hsl(140 12% 42%), hsl(140 12% 55%))",
                          }}
                        />
                      </div>
                    </div>

                    {/* Account grid */}
                    <div className="grid grid-cols-2 gap-2">
                      {ACCOUNT_OPTIONS.map(acc => {
                        const connected = connectedAccounts.has(acc.id);
                        const isConnecting = connectingAccount === acc.id;
                        const comingSoon = acc.status === "coming_soon";
                        return (
                          <button
                            key={acc.id}
                            onClick={() => toggleAccount(acc.id)}
                            disabled={isConnecting}
                            className="relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-300 disabled:opacity-60"
                            style={{
                              background: connected ? `${acc.color}15` : "hsl(240 6% 10%)",
                              border: `1px solid ${connected ? acc.color + "50" : "hsl(240 6% 18%)"}`,
                            }}
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-all"
                              style={{
                                background: connected ? acc.color : "hsl(240 6% 16%)",
                                color: connected ? "#fff" : "hsl(240 5% 50%)",
                              }}
                            >
                              {isConnecting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : acc.id === "apple" ? (
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                              ) : acc.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-white truncate">{acc.label}</p>
                              <p className="text-[9px] truncate" style={{ color: "hsl(240 5% 46%)" }}>
                                {isConnecting ? "Connecting..." : comingSoon && !connected ? "Coming soon" : acc.desc}
                              </p>
                            </div>
                            {connected && (
                              <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: acc.color }}>
                                <Check className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                            {comingSoon && !connected && (
                              <div className="absolute top-1.5 right-1.5">
                                <Lock className="h-3 w-3" style={{ color: "hsl(240 5% 36%)" }} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Network building indicator */}
                    {syncingNetwork && (
                      <div className="flex items-center justify-center gap-2 py-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: "hsl(140 12% 55%)" }} />
                        <span className="text-[10px] font-medium" style={{ color: "hsl(140 12% 55%)" }}>Building your network intelligence...</span>
                      </div>
                    )}
                  </div>

                  <Button
                    size="lg"
                    className="w-full text-white font-semibold hover:brightness-110 transition-all"
                    style={{ background: "hsl(140 12% 42%)" }}
                    onClick={handleEnter}
                  >
                    {connectedCount === 0
                      ? "Skip & Enter AuRa Connect"
                      : accountSavings > 0
                        ? `Enter — $${accountSavings} credit earned 🎉`
                        : `Enter AuRa Connect (${connectedCount} linked)`}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>

                  {connectedCount > 0 && connectedCount < unlockThreshold && (
                    <p className="text-[10px] text-center" style={{ color: "hsl(240 5% 46%)" }}>
                      Connect {unlockThreshold - connectedCount} more to unlock $5 credit
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xl text-center font-semibold mt-10" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
            </div>
          )}

          {step === "email_layout" && (
            <div className="space-y-6">
              <div
                className="rounded-xl border p-6 space-y-6"
                style={{
                  background: "hsl(240 8% 7%)",
                  borderColor: "hsl(140 12% 42% / 0.3)",
                  transition: "opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)",
                  opacity: cardVisible ? 1 : 0,
                  transform: cardVisible ? "scale(1)" : "scale(0.7)",
                }}
              >
                {renderHeader()}
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-semibold text-white">Choose your Email View</h2>
                  <p className="text-xs" style={{ color: "hsl(240 5% 46%)" }}>You can change this later in Settings → Email View</p>
                </div>

                <div className="space-y-3">
                  {([
                    { id: "gmail" as EmailLayout, label: "Gmail View", desc: "Feels like Gmail: compact list, conversation threads, left labels.", icon: "G", color: "#4285F4" },
                    { id: "outlook" as EmailLayout, label: "Outlook View", desc: "Feels like Outlook: folders on the left, list in the middle, preview on the right.", icon: "O", color: "#0078D4" },
                    { id: "aura" as EmailLayout, label: "AuRa View", desc: "Recommended: optimized for AURA's AI and sales tools.", icon: "A", color: "hsl(140 12% 42%)", recommended: true },
                  ] as const).map(view => (
                    <button
                      key={view.id}
                      onClick={() => handleFinalEnter(view.id)}
                      className="w-full text-left p-4 rounded-lg transition-all hover:scale-[1.01] relative"
                      style={{
                        background: "hsl(240 8% 9%)",
                        border: `1px solid ${"recommended" in view && view.recommended ? "hsl(140 12% 42% / 0.5)" : "hsl(240 6% 18%)"}`,
                      }}
                    >
                      {"recommended" in view && view.recommended && (
                        <span className="absolute -top-2 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "hsl(140 12% 42%)", color: "white" }}>
                          Recommended
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{ background: typeof view.color === "string" && view.color.startsWith("#") ? view.color : view.color, color: "white" }}>
                          {view.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{view.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "hsl(240 5% 50%)" }}>{view.desc}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0" style={{ color: "hsl(240 5% 40%)" }} />
                      </div>
                    </button>
                  ))}
                </div>

                <Button variant="ghost" className="w-full text-xs" style={{ color: "hsl(240 5% 46%)" }} onClick={() => handleFinalEnter("aura")}>
                  Skip — use AuRa View
                </Button>
              </div>
              <p className="text-xl text-center font-semibold mt-10" style={{ color: "hsl(140 12% 58%)" }}>Intelligence runs on AuRa</p>
            </div>
          )}

          {step === "building" && (
            <div className="flex flex-col items-center justify-center space-y-8 py-16">
              <style>{`
                @keyframes buildPulse { 0%,100% { opacity:0.6; transform:scale(1); } 50% { opacity:1; transform:scale(1.08); } }
                @keyframes buildGlow { 0%,100% { box-shadow: 0 0 20px hsl(140 12% 42% / 0.15); } 50% { box-shadow: 0 0 50px hsl(140 12% 42% / 0.35); } }
                .build-logo { animation: buildPulse 2s ease-in-out infinite, buildGlow 2s ease-in-out infinite; }
                @keyframes msgFade { 0% { opacity:0; transform:translateY(8px); } 30% { opacity:1; transform:translateY(0); } 100% { opacity:1; transform:translateY(0); } }
                .build-msg { animation: msgFade 0.5s ease-out; }
              `}</style>
              <div className="build-logo rounded-2xl">
                <AuraLogo size={72} />
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-xl font-bold text-white">Building your network…</h2>
                <p key={buildMsgIdx} className="build-msg text-sm" style={{ color: "hsl(140 12% 58%)" }}>
                  {buildMessages[buildMsgIdx]}
                </p>
              </div>
              <div className="w-64 space-y-2">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(140 12% 42% / 0.12)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-100 ease-linear"
                    style={{
                      width: `${buildProgress}%`,
                      background: "linear-gradient(90deg, hsl(140 12% 42%), hsl(140 12% 58%))",
                    }}
                  />
                </div>
                <p className="text-[10px] text-center" style={{ color: "hsl(240 5% 40%)" }}>{Math.round(buildProgress)}%</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
