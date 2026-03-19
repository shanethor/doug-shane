import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard } from "lucide-react";

export default function RequestAccess() {
  return (
    <div className="min-h-screen bg-[#08080A] text-[#FAFAFA] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-white mb-12 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="w-16 h-16 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center mx-auto mb-6">
          <CreditCard className="w-7 h-7 text-[#60A5FA]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-3">Request Access</h1>
        <p className="text-sm text-[#71717A] leading-relaxed max-w-xs mx-auto mb-8">
          AURA Connect subscription setup is coming soon. Check back shortly to complete your registration.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#08080A] bg-white px-6 py-2.5 rounded-lg hover:opacity-85 transition-opacity no-underline"
        >
          Sign up for free →
        </Link>
      </div>
    </div>
  );
}
