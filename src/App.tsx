import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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
import ClientSubmission from "./pages/ClientSubmission";
import LandingPage from "./pages/LandingPage";
import BecomePartner from "./pages/BecomePartner";
import RequestAccess from "./pages/RequestAccess";
import { Navigate } from "react-router-dom";
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

function HomeRoute() {
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
    return <Navigate to={hasConnect ? "/connect" : "/submit-client"} replace />;
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
          <Route path="/auth" element={<Auth />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/email" element={<ProtectedRoute><EmailHub /></ProtectedRoute>} />
          <Route path="/hub" element={<ProtectedRoute><HomeRoute /></ProtectedRoute>} />
          <Route path="/command" element={<ProtectedRoute><ProducerHub /></ProtectedRoute>} />
          <Route path="/pulse" element={<ProtectedRoute><AuraPulse /></ProtectedRoute>} />
          <Route path="/clients" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/submit-plan" element={<ProtectedRoute><SubmitPlan /></ProtectedRoute>} />
          <Route path="/application/:submissionId" element={<ProtectedRoute><ApplicationReview /></ProtectedRoute>} />
          <Route path="/acord/:formId/:submissionId" element={<ProtectedRoute><AcordFormPage /></ProtectedRoute>} />
          <Route path="/acord/:formId" element={<ProtectedRoute><AcordFormPage /></ProtectedRoute>} />
          <Route path="/templates" element={<ProtectedRoute><TemplateEditor /></ProtectedRoute>} />
          <Route path="/forms" element={<ProtectedRoute><GeneratedForms /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/deck" element={<Deck />} />
          <Route path="/home" element={<LandingPage />} />
          <Route path="/become-partner" element={<BecomePartner />} />
          <Route path="/request-access" element={<RequestAccess />} />
          <Route path="/olddeck" element={<ProtectedRoute><OldDeck /></ProtectedRoute>} />
          <Route path="/pdf-diagnostic" element={<PdfDiagnostic />} />
          <Route path="/form-test" element={<ProtectedRoute><FormTest /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
          <Route path="/pipeline/:leadId" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
          <Route path="/my-dashboard" element={<ProtectedRoute><ProducerDashboard /></ProtectedRoute>} />
          <Route path="/approvals" element={<Navigate to="/admin" replace />} />
          <Route path="/intake/:token" element={<IntakeForm />} />
          <Route path="/b/:slug" element={<BorrowerPage />} />
          <Route path="/tracker" element={<PipelineTracker />} />
          <Route path="/partner/:token" element={<PartnerTracker />} />
          <Route path="/personal-intake/:token" element={<IntakeForm />} />
          <Route path="/bor-sign/:token" element={<BorSign />} />
          <Route path="/inbox" element={<Navigate to="/email" replace />} />
          <Route path="/email-callback" element={<ProtectedRoute><EmailCallback /></ProtectedRoute>} />
          <Route path="/calendar" element={<Navigate to="/email" replace />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/connect" element={<ProtectedRoute><AuraConnect /></ProtectedRoute>} />
          <Route path="/submit-client" element={<ProtectedRoute><ClientSubmission /></ProtectedRoute>} />
          <Route path="/loss-runs" element={<ProtectedRoute><LossRunDashboard /></ProtectedRoute>} />
          <Route path="/loss-runs/new" element={<ProtectedRoute><LossRunNew /></ProtectedRoute>} />
          <Route path="/loss-runs/settings" element={<ProtectedRoute><CarrierDirectory /></ProtectedRoute>} />
          <Route path="/loss-runs/:id" element={<ProtectedRoute><LossRunDetail /></ProtectedRoute>} />
          <Route path="/loss-runs/:id/sign" element={<LossRunSign />} />
          <Route path="/beta">
            <Route index element={<AuraBeta />} />
            <Route element={<BetaLayout />}>
              <Route path="chat" element={<BetaChat />} />
              <Route path="todos" element={<BetaTodos />} />
              <Route path="voice" element={<BetaVoice />} />
              <Route path="video" element={<BetaVideo />} />
            </Route>
          </Route>
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
