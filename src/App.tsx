import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProductProtectedRoute } from "@/components/ProductProtectedRoute";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UserDashboard from "./pages/UserDashboard";
import SubmitPlan from "./pages/SubmitPlan";
import ApplicationReview from "./pages/ApplicationReview";
import AcordFormPage from "./pages/AcordFormPage";
import AdminDashboard from "./pages/AdminDashboard";
import Chat from "./pages/Chat";
import TemplateEditor from "./pages/TemplateEditor";
import GeneratedForms from "./pages/GeneratedForms";
import Onboarding from "./pages/Onboarding";
import NotFound from "./pages/NotFound";
import Deck from "./pages/Deck";
import OldDeck from "./pages/OldDeck";
import PdfDiagnostic from "./pages/PdfDiagnostic";
import FormTest from "./pages/FormTest";
import Pipeline from "./pages/Pipeline";
import LeadDetail from "./pages/LeadDetail";
import ProducerDashboard from "./pages/ProducerDashboard";
import Approvals from "./pages/Approvals";
import IntakeForm from "./pages/IntakeForm";
import BorrowerPage from "./pages/BorrowerPage";
import PipelineTracker from "./pages/PipelineTracker";
import PartnerTracker from "./pages/PartnerTracker";
import BorSign from "./pages/BorSign";
import InboxPage from "./pages/Inbox";
import EmailCallback from "./pages/EmailCallback";
import CalendarPage from "./pages/Calendar";
import BookingPage from "./pages/BookingPage";
import PublicBooking from "./pages/PublicBooking";
import Settings from "./pages/Settings";
import AuraPulse from "./pages/AuraPulse";
import EmailHub from "./pages/EmailHub";
import ProducerHub from "./pages/ProducerHub";
import AuraBeta from "./pages/AuraBeta";
import BetaLayout from "./components/BetaLayout";
import BetaChat from "./pages/BetaChat";
import BetaTodos from "./pages/BetaTodos";
import BetaVoice from "./pages/BetaVoice";
import BetaVideo from "./pages/BetaVideo";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import LossRunDashboard from "./pages/LossRunDashboard";
import LossRunNew from "./pages/LossRunNew";
import LossRunDetail from "./pages/LossRunDetail";
import LossRunSign from "./pages/LossRunSign";
import CarrierDirectory from "./pages/CarrierDirectory";
import AuraConnect from "./pages/AuraConnect";
import AuraConcierge from "./pages/AuraConcierge";
import ClientSubmission from "./pages/ClientSubmission";
import LandingPage from "./pages/LandingPage";
import BrandKit from "./pages/BrandKit";
import ConnectDemo from "./pages/ConnectDemo";
import ConnectDemoAuth from "./pages/ConnectDemoAuth";
import BecomePartner from "./pages/BecomePartner";
import RequestAccess from "./pages/RequestAccess";
import StudioDemo from "./pages/StudioDemo";
import LeadLanding from "./pages/LeadLanding";
import ProductAuth from "./pages/ProductAuth";
import ConnectProduct from "./pages/ConnectProduct";
import StudioProduct from "./pages/StudioProduct";
import ProductSettings from "./pages/ProductSettings";
import PostCheckoutOnboard from "./pages/PostCheckoutOnboard";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserFeatures } from "@/hooks/useUserFeatures";

const queryClient = new QueryClient();

/** Syncs dark-mode preference from the DB once the user is authenticated */
function DarkModeSync() {
  useEffect(() => {
    let ran = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (ran || !session?.user) return;
      ran = true;
      supabase
        .from("profiles")
        .select("dark_mode")
        .eq("user_id", session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const dark = !!(data as any).dark_mode;
            document.documentElement.classList.toggle("dark", dark);
            localStorage.setItem("aura-dark-mode", dark ? "true" : "false");
          }
        });
    });
  }, []);
  return null;
}

function InsuranceHomeRoute() {
  const { isProperty, loading: roleLoading } = useUserRole();
  const { hasConnect, loading: featuresLoading } = useUserFeatures();

  if (roleLoading || featuresLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isProperty) {
    return <Navigate to={hasConnect ? "/insurance/connect" : "/insurance/submit-client"} replace />;
  }

  return <Chat />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <DarkModeSync />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/deck" element={<Deck />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/become-partner" element={<BecomePartner />} />
          <Route path="/request-access" element={<RequestAccess />} />
          <Route path="/brandkit" element={<BrandKit />} />
          <Route path="/onboard" element={<PostCheckoutOnboard />} />
          <Route path="/pdf-diagnostic" element={<PdfDiagnostic />} />
          <Route path="/intake/:token" element={<IntakeForm />} />
          <Route path="/personal-intake/:token" element={<IntakeForm />} />
          <Route path="/b/:slug" element={<BorrowerPage />} />
          <Route path="/book/:slug" element={<PublicBooking />} />
          <Route path="/tracker" element={<PipelineTracker />} />
          <Route path="/partner/:token" element={<PartnerTracker />} />
          <Route path="/bor-sign/:token" element={<BorSign />} />
          <Route path="/loss-runs/:id/sign" element={<LossRunSign />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* ── Demo routes ── */}
          <Route path="/connectdemo" element={<ConnectDemo />} />
          <Route path="/connectdemo/auth" element={<ConnectDemoAuth />} />
          <Route path="/studiodemo" element={<StudioDemo />} />

          {/* ── Beta routes ── */}
          <Route path="/beta">
            <Route index element={<AuraBeta />} />
            <Route element={<BetaLayout />}>
              <Route path="chat" element={<BetaChat />} />
              <Route path="todos" element={<BetaTodos />} />
              <Route path="voice" element={<BetaVoice />} />
              <Route path="video" element={<BetaVideo />} />
            </Route>
          </Route>

          {/* ── Product auth (Connect / Studio) ── */}
          <Route path="/get-started" element={<ProductAuth />} />

          {/* ── AURA Connect product ── */}
          <Route path="/connect" element={<ProductProtectedRoute><ConnectProduct /></ProductProtectedRoute>} />
          <Route path="/connect/*" element={<ProductProtectedRoute><ConnectProduct /></ProductProtectedRoute>} />

          {/* ── AURA Studio product ── */}
          <Route path="/studio" element={<ProductProtectedRoute><StudioProduct /></ProductProtectedRoute>} />
          <Route path="/studio/*" element={<ProductProtectedRoute><StudioProduct /></ProductProtectedRoute>} />

          {/* ── Product settings ── */}
          <Route path="/app/settings" element={<ProductProtectedRoute><ProductSettings /></ProductProtectedRoute>} />

          {/* ── Insurance auth ── */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />

          {/* ── Insurance app (all under /insurance) ── */}
          <Route path="/insurance/hub" element={<ProtectedRoute><InsuranceHomeRoute /></ProtectedRoute>} />
          <Route path="/insurance/email" element={<ProtectedRoute><EmailHub /></ProtectedRoute>} />
          <Route path="/insurance/command" element={<ProtectedRoute><ProducerHub /></ProtectedRoute>} />
          <Route path="/insurance/pulse" element={<ProtectedRoute><AuraPulse /></ProtectedRoute>} />
          <Route path="/insurance/clients" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/insurance/submit-plan" element={<ProtectedRoute><SubmitPlan /></ProtectedRoute>} />
          <Route path="/insurance/application/:submissionId" element={<ProtectedRoute><ApplicationReview /></ProtectedRoute>} />
          <Route path="/insurance/acord/:formId/:submissionId" element={<ProtectedRoute><AcordFormPage /></ProtectedRoute>} />
          <Route path="/insurance/acord/:formId" element={<ProtectedRoute><AcordFormPage /></ProtectedRoute>} />
          <Route path="/insurance/templates" element={<ProtectedRoute><TemplateEditor /></ProtectedRoute>} />
          <Route path="/insurance/forms" element={<ProtectedRoute><GeneratedForms /></ProtectedRoute>} />
          <Route path="/insurance/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/insurance/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/insurance/olddeck" element={<ProtectedRoute><OldDeck /></ProtectedRoute>} />
          <Route path="/insurance/form-test" element={<ProtectedRoute><FormTest /></ProtectedRoute>} />
          <Route path="/insurance/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
          <Route path="/insurance/pipeline/:leadId" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
          <Route path="/insurance/my-dashboard" element={<ProtectedRoute><ProducerDashboard /></ProtectedRoute>} />
          <Route path="/insurance/email-callback" element={<ProtectedRoute><EmailCallback /></ProtectedRoute>} />
          <Route path="/insurance/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/insurance/connect" element={<ProtectedRoute><AuraConnect /></ProtectedRoute>} />
          <Route path="/insurance/concierge" element={<ProtectedRoute><AuraConcierge /></ProtectedRoute>} />
          <Route path="/insurance/submit-client" element={<ProtectedRoute><ClientSubmission /></ProtectedRoute>} />
          <Route path="/insurance/loss-runs" element={<ProtectedRoute><LossRunDashboard /></ProtectedRoute>} />
          <Route path="/insurance/loss-runs/new" element={<ProtectedRoute><LossRunNew /></ProtectedRoute>} />
          <Route path="/insurance/loss-runs/settings" element={<ProtectedRoute><CarrierDirectory /></ProtectedRoute>} />
          <Route path="/insurance/loss-runs/:id" element={<ProtectedRoute><LossRunDetail /></ProtectedRoute>} />

          {/* ── Redirects: old insurance paths → /insurance/* ── */}
          <Route path="/hub" element={<Navigate to="/insurance/hub" replace />} />
          <Route path="/email" element={<Navigate to="/insurance/email" replace />} />
          <Route path="/command" element={<Navigate to="/insurance/command" replace />} />
          <Route path="/pulse" element={<Navigate to="/insurance/pulse" replace />} />
          <Route path="/clients" element={<Navigate to="/insurance/clients" replace />} />
          <Route path="/submit-plan" element={<Navigate to="/insurance/submit-plan" replace />} />
          <Route path="/application/:submissionId" element={<Navigate to="/insurance/hub" replace />} />
          <Route path="/templates" element={<Navigate to="/insurance/templates" replace />} />
          <Route path="/forms" element={<Navigate to="/insurance/forms" replace />} />
          <Route path="/admin" element={<Navigate to="/insurance/admin" replace />} />
          <Route path="/onboarding" element={<Navigate to="/insurance/onboarding" replace />} />
          <Route path="/form-test" element={<Navigate to="/insurance/form-test" replace />} />
          <Route path="/pipeline" element={<Navigate to="/insurance/pipeline" replace />} />
          <Route path="/pipeline/:leadId" element={<Navigate to="/insurance/pipeline" replace />} />
          <Route path="/my-dashboard" element={<Navigate to="/insurance/my-dashboard" replace />} />
          <Route path="/inbox" element={<Navigate to="/insurance/email" replace />} />
          <Route path="/calendar" element={<Navigate to="/insurance/email" replace />} />
          <Route path="/settings" element={<Navigate to="/insurance/settings" replace />} />
          <Route path="/approvals" element={<Navigate to="/insurance/admin" replace />} />
          <Route path="/concierge" element={<Navigate to="/insurance/concierge" replace />} />
          <Route path="/submit-client" element={<Navigate to="/insurance/submit-client" replace />} />
          <Route path="/loss-runs" element={<Navigate to="/insurance/loss-runs" replace />} />
          <Route path="/acord/:formId/:submissionId" element={<Navigate to="/insurance/hub" replace />} />
          <Route path="/acord/:formId" element={<Navigate to="/insurance/hub" replace />} />
          <Route path="/email-callback" element={<Navigate to="/insurance/email-callback" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
