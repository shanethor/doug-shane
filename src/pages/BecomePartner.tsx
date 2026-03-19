import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Handshake } from "lucide-react";

export default function BecomePartner() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company: "",
    phone: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("partner_requests" as any).insert({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      company: form.company.trim() || null,
      phone: form.phone.trim() || null,
      message: form.message.trim() || null,
    } as any);
    setLoading(false);
    if (error) {
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </button>

        {submitted ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
              <Handshake className="w-7 h-7 text-white/70" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Request received</h2>
            <p className="text-[#71717A] text-sm leading-relaxed max-w-xs mx-auto">
              We'll review your information and reach out shortly. Thank you for your interest in partnering with AURA.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#71717A] mb-3">
                Partnerships
              </div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Become a Partner</h1>
              <p className="text-sm text-[#71717A] leading-relaxed">
                Tell us about yourself and we'll get back to you with partnership details.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Full Name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full bg-[#101012] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="Jane Smith"
                  required
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full bg-[#101012] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="jane@company.com"
                  required
                  maxLength={255}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Company</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full bg-[#101012] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="Acme Corp"
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-[#101012] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="(555) 123-4567"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#A1A1AA] mb-1.5">
                  Why do you want to partner with AURA?
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-[#101012] border border-white/[0.06] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-[#52525B] focus:outline-none focus:border-white/20 transition-colors resize-none"
                  rows={3}
                  placeholder="Tell us briefly..."
                  maxLength={1000}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white text-[#08080A] font-medium text-sm py-3 rounded-lg hover:opacity-85 transition-opacity disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Request"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
