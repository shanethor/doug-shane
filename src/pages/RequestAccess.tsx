import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Search, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ConnectUpsellPopup from "@/components/ConnectUpsellPopup";

const INDUSTRIES = [
  "Insurance", "Mortgage", "Real Estate", "Property", "Consulting", "General Business",
  "Accounting", "Advertising & Marketing", "Agriculture", "Architecture", "Automotive",
  "Banking & Finance", "Biotechnology", "Construction", "Cybersecurity", "E-Commerce",
  "Education", "Energy & Utilities", "Engineering", "Entertainment", "Environmental Services",
  "Fashion & Apparel", "Financial Planning", "Fitness & Wellness", "Food & Beverage",
  "Healthcare", "Hospitality", "Human Resources", "Information Technology", "Law / Legal",
  "Logistics & Supply Chain", "Manufacturing", "Nonprofit", "Pharmaceuticals",
  "Professional Services", "Recruiting & Staffing", "Restaurant", "Retail",
  "SaaS / Software", "Telecommunications", "Transportation", "Wealth Management", "Other",
];

export default function RequestAccess() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [industry, setIndustry] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [industryOpen, setIndustryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);
  const industryRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (industryRef.current && !industryRef.current.contains(e.target as Node)) setIndustryOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // If user is already logged in, redirect
  useEffect(() => {
    if (user) navigate("/connect");
  }, [user, navigate]);

  const filteredIndustries = INDUSTRIES.filter((i) =>
    i.toLowerCase().includes(industrySearch.toLowerCase())
  );

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry) {
      toast.error("Please select your industry");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/get-started`,
          data: { full_name: fullName, product_user: true, industry },
        },
      });
      if (error) throw error;

      toast.success("Account created! Check your email for a confirmation link.");
      setShowUpsell(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="w-14 h-14 rounded-full bg-[hsl(140_12%_42%/0.1)] border border-[hsl(140_12%_42%/0.2)] flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-6 h-6 text-[hsl(140_12%_58%)]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-center mb-2">Create your AURA account</h1>
        <p className="text-sm text-[#71717A] text-center leading-relaxed max-w-sm mx-auto mb-8">
          Get started with your free account. Access leads, pipeline tools, and more.
        </p>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-[#71717A]">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              required
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-[#71717A]">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-[#71717A]">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="h-11 bg-white/5 border-white/10 text-white placeholder:text-white/20"
            />
          </div>

          {/* Industry selector */}
          <div className="space-y-2" ref={industryRef}>
            <Label className="text-xs uppercase tracking-wider text-[#71717A]">Industry</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIndustryOpen(!industryOpen)}
                className="w-full h-11 px-3 text-left text-sm bg-white/5 border border-white/10 rounded-md text-white flex items-center justify-between"
              >
                <span className={industry ? "text-white" : "text-white/20"}>
                  {industry || "Select your industry"}
                </span>
                <Search className="w-4 h-4 text-white/30" />
              </button>
              {industryOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#18181B] border border-white/10 rounded-lg shadow-xl max-h-60 overflow-hidden">
                  <div className="p-2 border-b border-white/10">
                    <Input
                      value={industrySearch}
                      onChange={(e) => setIndustrySearch(e.target.value)}
                      placeholder="Search industries..."
                      className="h-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/20"
                      autoFocus
                    />
                  </div>
                  <div className="overflow-y-auto max-h-48">
                    {filteredIndustries.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => { setIndustry(ind); setIndustryOpen(false); setIndustrySearch(""); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/5 flex items-center gap-2 ${industry === ind ? "text-[hsl(140_12%_58%)]" : "text-[#A1A1AA]"}`}
                      >
                        {industry === ind && <Check className="w-3.5 h-3.5 shrink-0" />}
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-[hsl(140_12%_42%)] text-[#08080A] hover:bg-[hsl(140_12%_52%)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-[#52525B]">
            Already have an account?{" "}
            <Link to="/get-started" className="text-[hsl(140_12%_58%)] hover:underline">Sign in</Link>
          </p>
        </div>

        <p className="text-xs text-[#3F3F46] text-center mt-6">
          By creating an account you agree to our{" "}
          <Link to="/terms" className="underline hover:text-[#71717A]">Terms</Link> &{" "}
          <Link to="/privacy" className="underline hover:text-[#71717A]">Privacy Policy</Link>
        </p>
      </div>

      <ConnectUpsellPopup open={showUpsell} onClose={() => setShowUpsell(false)} />
    </div>
  );
}
