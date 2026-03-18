import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock, Home, Car, Anchor, Building2, Heart, Umbrella, Star } from "lucide-react";

export default function LandingPage() {
  const revealRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("landing-visible");
        });
      },
      { threshold: 0.08 }
    );
    revealRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRevealRef = (el: HTMLElement | null) => {
    if (el && !revealRefs.current.includes(el)) revealRefs.current.push(el);
  };

  const lines = [
    { icon: Home, name: "Home" },
    { icon: Car, name: "Auto" },
    { icon: Anchor, name: "Marine" },
    { icon: Building2, name: "Commercial" },
    { icon: Heart, name: "Life" },
    { icon: Umbrella, name: "Umbrella" },
    { icon: Star, name: "Specialty" },
  ];

  return (
    <div className="min-h-screen bg-[hsl(240,10%,4%)] text-[hsl(0,0%,98%)] overflow-x-hidden font-sans antialiased">
      {/* ── Floating Nav ── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-[720px]">
        <nav className="flex items-center justify-between px-5 py-2.5 bg-[hsl(240,8%,7%)]/85 backdrop-blur-xl border border-white/[0.06] rounded-full">
          <div className="flex items-center gap-5">
            <span className="text-sm font-semibold tracking-[0.06em]">AURA</span>
            <div className="hidden md:flex items-center gap-1.5">
              <a href="#platform" className="text-[13px] text-[hsl(240,5%,65%)] hover:text-white px-3 py-1.5 rounded-full transition-colors">Platform</a>
              <a href="#coverage" className="text-[13px] text-[hsl(240,5%,65%)] hover:text-white px-3 py-1.5 rounded-full transition-colors">Coverage</a>
              <a href="#how" className="text-[13px] text-[hsl(240,5%,65%)] hover:text-white px-3 py-1.5 rounded-full transition-colors">How it works</a>
            </div>
          </div>
          <Link to="/auth" className="text-[13px] font-medium bg-white text-[hsl(240,10%,4%)] px-5 py-2 rounded-full hover:opacity-85 transition-opacity whitespace-nowrap">
            Open app
          </Link>
        </nav>
      </div>

      {/* ── Hero ── */}
      <section className="relative h-screen min-h-[700px] max-sm:min-h-[600px] overflow-hidden flex flex-col justify-end">
        <div className="absolute inset-0">
          <img src="/images/hero.jpg" alt="" className="w-full h-full object-cover brightness-[0.35] saturate-[0.4]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(240,10%,4%)]/20 via-[hsl(240,10%,4%)]/10 via-40% to-[hsl(240,10%,4%)] to-100%" />
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 max-w-[1200px] w-full mx-auto px-5 md:px-12 pb-10 md:pb-[72px] items-end">
          <h1 className="text-[clamp(40px,6vw,80px)] font-semibold leading-[0.95] tracking-[-0.04em]">
            Insurance<br />runs on<br />AURA
          </h1>
          <div className="max-w-[440px]">
            <p className="text-base text-[hsl(240,5%,65%)] leading-relaxed mb-7">
              The AI-native insurance platform for modern producers. Seven lines of business, automated submissions, carrier-ready packages — one intelligent system.
            </p>
            <div className="flex items-center gap-2 max-sm:flex-col max-sm:w-full">
              <Link
                to="/auth"
                className="text-sm font-medium border border-white/20 hover:border-white/45 hover:bg-white/[0.04] px-[22px] py-2.5 rounded-lg transition-all max-sm:w-full max-sm:text-center"
              >
                Sign in
              </Link>
              <Link
                to="/auth?mode=signup"
                className="text-sm font-medium bg-white/[0.06] border border-white/[0.08] hover:bg-white/10 hover:border-white/15 px-[22px] py-2.5 rounded-lg transition-all inline-flex items-center gap-2 group max-sm:w-full max-sm:justify-center"
              >
                Request access
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Closed platform notice ── */}
      <div className="max-w-[1200px] mx-auto px-5 md:px-12">
        <div className="flex items-center gap-3 py-5 border-b border-white/[0.06]">
          <div className="w-8 h-8 rounded-lg bg-[hsl(240,10%,10%)] flex items-center justify-center shrink-0">
            <Lock className="h-3.5 w-3.5 text-[hsl(240,5%,45%)]" />
          </div>
          <p className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">
            <span className="text-[hsl(240,5%,65%)] font-medium">Closed platform.</span>{" "}
            AURA is available exclusively to partnered brokerages and their licensed producers. Sign-up requests are reviewed and approved based on your brokerage's partnership status.
          </p>
        </div>
      </div>

      {/* ── Platform features ── */}
      <div ref={addRevealRef} className="landing-reveal max-w-[1200px] mx-auto px-5 md:px-12 pt-20 md:pt-[120px]" id="platform">
        <div className="border-t border-white/[0.06] pt-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-12">
          <div>
            <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-[hsl(240,5%,45%)] mb-4">Platform</div>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-semibold tracking-[-0.035em] leading-[1.1]">
              Built different<br />from day one
            </h2>
          </div>
          <p className="text-[15px] text-[hsl(240,5%,65%)] leading-relaxed max-w-[380px]">
            No legacy baggage. Every workflow was designed from scratch around intelligence, speed, and producer autonomy.
          </p>
        </div>
      </div>

      <div ref={addRevealRef} className="landing-reveal max-w-[1200px] mx-auto px-5 md:px-12 pt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hero card */}
        <div className="md:col-span-2 rounded-2xl overflow-hidden bg-[hsl(240,8%,7%)] border border-white/[0.06] hover:border-white/[0.12] transition-colors group">
          <div className="h-[200px] md:h-[240px] overflow-hidden">
            <img src="/images/hero-insurance.jpg" alt="" className="w-full h-full object-cover brightness-50 saturate-[0.35] transition-transform duration-500 group-hover:scale-[1.03]" />
          </div>
          <div className="p-6">
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[hsl(175,97%,24%)] mb-2.5">Core</div>
            <div className="text-base font-semibold tracking-tight mb-2">AI-powered submissions & ACORD compliance</div>
            <div className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">Upload a policy, get a carrier-ready package in minutes. Every form, every field, every time.</div>
          </div>
        </div>

        <div className="rounded-2xl bg-[hsl(240,8%,7%)] border border-white/[0.06] hover:border-white/[0.12] transition-colors p-6 flex flex-col">
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[hsl(175,97%,24%)] mb-2.5">Revenue</div>
          <div className="text-base font-semibold tracking-tight mb-2">85% revenue share</div>
          <div className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">Zero desk fees. Keep what you earn. AURA's model is designed to attract and retain the best producers.</div>
        </div>

        <div className="rounded-2xl bg-[hsl(240,8%,7%)] border border-white/[0.06] hover:border-white/[0.12] transition-colors p-6 flex flex-col">
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[hsl(175,97%,24%)] mb-2.5">Intelligence</div>
          <div className="text-base font-semibold tracking-tight mb-2">Real-time dashboards</div>
          <div className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">Pipeline visibility, carrier appetite updates, and commission tracking — all in one place.</div>
        </div>

        <div className="rounded-2xl bg-[hsl(240,8%,7%)] border border-white/[0.06] hover:border-white/[0.12] transition-colors p-6 flex flex-col">
          <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[hsl(175,97%,24%)] mb-2.5">Binding</div>
          <div className="text-base font-semibold tracking-tight mb-2">Carrier-direct binding</div>
          <div className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">Integrated with top carriers for direct quote-to-bind workflows. No back-and-forth emails.</div>
        </div>

        <div className="md:col-span-2 rounded-2xl overflow-hidden bg-[hsl(240,8%,7%)] border border-white/[0.06] hover:border-white/[0.12] transition-colors group">
          <div className="h-[200px] md:h-[240px] overflow-hidden">
            <img src="/images/hero.jpg" alt="" className="w-full h-full object-cover object-[center_70%] brightness-50 saturate-[0.35] transition-transform duration-500 group-hover:scale-[1.03]" />
          </div>
          <div className="p-6">
            <div className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[hsl(175,97%,24%)] mb-2.5">Service</div>
            <div className="text-base font-semibold tracking-tight mb-2">Hybrid service model — AI handles 80% of servicing</div>
            <div className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">Endorsements, certificates, renewals — handled automatically. You stay focused on relationships and complex risks.</div>
          </div>
        </div>
      </div>

      {/* ── Lines of business ── */}
      <div ref={addRevealRef} className="landing-reveal max-w-[1200px] mx-auto px-5 md:px-12 pt-20 md:pt-[120px]" id="coverage">
        <div className="border-t border-white/[0.06] pt-12 mb-12">
          <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-[hsl(240,5%,45%)] mb-4">Coverage</div>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-semibold tracking-[-0.035em] leading-[1.1]">Seven lines. One platform.</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 border border-white/[0.06] rounded-xl overflow-hidden">
          {lines.map((line) => (
            <div key={line.name} className="bg-[hsl(240,8%,7%)] border-r border-b border-white/[0.06] last:border-r-0 p-6 text-center hover:bg-[hsl(240,10%,10%)] transition-colors group">
              <div className="w-9 h-9 mx-auto mb-3 flex items-center justify-center">
                <line.icon className="h-5 w-5 text-[hsl(240,5%,65%)] group-hover:text-white transition-colors" strokeWidth={1.5} />
              </div>
              <div className="text-[13px] font-medium text-[hsl(240,5%,65%)] group-hover:text-white transition-colors">{line.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ── */}
      <div ref={addRevealRef} className="landing-reveal max-w-[1200px] mx-auto px-5 md:px-12 pt-20 md:pt-[120px]" id="how">
        <div className="border-t border-white/[0.06] pt-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-12 mb-12">
          <div>
            <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-[hsl(240,5%,45%)] mb-4">How it works</div>
            <h2 className="text-[clamp(28px,3.5vw,44px)] font-semibold tracking-[-0.035em] leading-[1.1]">
              From signup to<br />first submission
            </h2>
          </div>
          <p className="text-[15px] text-[hsl(240,5%,65%)] leading-relaxed max-w-[380px]">
            Your brokerage partners with AURA, you get access, and you start writing business the same day.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { num: "01", title: "Brokerage partners with AURA", desc: "Your firm signs a partnership agreement. No individual desk fees — your brokerage relationship opens the door." },
            { num: "02", title: "Request producer access", desc: "Licensed producers request access through the portal. Approvals are tied to your brokerage partnership — typically same-day." },
            { num: "03", title: "Start writing business", desc: "Upload your first submission, let AURA structure the package, and send it directly to carriers. 85% commission, zero manual forms." },
          ].map((step) => (
            <div key={step.num} className="p-8 bg-[hsl(240,8%,7%)] border border-white/[0.06] rounded-2xl hover:border-white/[0.12] transition-colors">
              <div className="text-5xl font-light text-white/[0.08] tracking-[-0.04em] leading-none mb-5">{step.num}</div>
              <div className="text-[15px] font-semibold mb-2">{step.title}</div>
              <div className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Coming Soon: AURA Property & AURA Wealth ── */}
      <div ref={addRevealRef} className="landing-reveal max-w-[1200px] mx-auto px-5 md:px-12 pt-20 md:pt-[120px]">
        <div className="border-t border-white/[0.06] pt-12 mb-12">
          <div className="text-[11px] font-medium tracking-[0.1em] uppercase text-[hsl(240,5%,45%)] mb-4">Expanding</div>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-semibold tracking-[-0.035em] leading-[1.1]">Beyond insurance</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AURA Property */}
          <div className="rounded-2xl overflow-hidden bg-[hsl(240,8%,7%)] border border-white/[0.06] group relative">
            <div className="h-[220px] overflow-hidden">
              <img src="/images/hero-property.jpg" alt="AURA Property" className="w-full h-full object-cover brightness-[0.4] saturate-[0.35] transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-semibold tracking-[0.1em] uppercase px-4 py-1.5 rounded-full">
                Coming Soon
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-semibold tracking-tight">AURA</span>
                <span className="text-[11px] text-[hsl(240,5%,65%)] tracking-widest uppercase font-medium">Property</span>
              </div>
              <div className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">
                AI-powered real estate intelligence. Smart property analysis, market insights, and risk assessment for the modern real estate professional.
              </div>
            </div>
          </div>

          {/* AURA Wealth */}
          <div className="rounded-2xl overflow-hidden bg-[hsl(240,8%,7%)] border border-white/[0.06] group relative">
            <div className="h-[220px] overflow-hidden">
              <img src="/images/hero-wealth.jpg" alt="AURA Wealth" className="w-full h-full object-cover brightness-[0.4] saturate-[0.35] transition-transform duration-500 group-hover:scale-[1.03]" />
              <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 text-[11px] font-semibold tracking-[0.1em] uppercase px-4 py-1.5 rounded-full">
                Coming Soon
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-semibold tracking-tight">AURA</span>
                <span className="text-[11px] text-[hsl(240,5%,65%)] tracking-widest uppercase font-medium">Wealth</span>
              </div>
              <div className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed">
                Intelligent wealth management infrastructure. Portfolio analytics, financial planning tools, and client relationship management — built for advisors.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTA ── */}
      <div ref={addRevealRef} className="landing-reveal max-w-[1200px] mx-auto px-5 md:px-12 pt-20 md:pt-[120px]">
        <div className="border-t border-white/[0.06] pt-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 md:gap-12">
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-semibold tracking-[-0.035em] leading-[1.1] max-w-[500px]">
            Ready to see what AURA can do?
          </h2>
          <div className="flex items-center gap-2 shrink-0 max-sm:w-full max-sm:flex-col">
            <Link to="/auth" className="text-sm font-medium border border-white/20 hover:border-white/45 hover:bg-white/[0.04] px-[22px] py-2.5 rounded-lg transition-all max-sm:w-full max-sm:text-center">
              Sign in
            </Link>
            <Link
              to="/auth?mode=signup"
              className="text-sm font-medium bg-white/[0.06] border border-white/[0.08] hover:bg-white/10 hover:border-white/15 px-[22px] py-2.5 rounded-lg transition-all inline-flex items-center gap-2 group max-sm:w-full max-sm:justify-center"
            >
              Request access
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer — simplified ── */}
      <footer className="max-w-[1200px] mx-auto px-5 md:px-12 pt-24 pb-8 md:pb-12">
        <div className="border-t border-white/[0.06] pt-8">
          <div className="mb-3">
            <span className="text-sm font-semibold tracking-[0.06em]">AURA</span>
          </div>
          <p className="text-[13px] text-[hsl(240,5%,45%)] leading-relaxed max-w-[400px] mb-8">
            Automated Universal Risk Advisor. AI-native insurance infrastructure for the next generation of producers.
          </p>
          <div className="flex justify-between items-center text-xs text-[hsl(240,4%,32%)]">
            <span>© 2026 AURA Risk Group</span>
            <div className="flex gap-5">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
