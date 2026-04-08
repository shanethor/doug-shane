import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ProductProtectedRoute } from "@/components/ProductProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { lazy, Suspense, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserFeatures } from "@/hooks/useUserFeatures";

const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UserDashboard = lazy(() => import("./pages/UserDashboard"));
const SubmitPlan = lazy(() => import("./pages/SubmitPlan"));
const ApplicationReview = lazy(() => import("./pages/ApplicationReview"));
const AcordFormPage = lazy(() => import("./pages/AcordFormPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Chat = lazy(() => import("./pages/Chat"));
const TemplateEditor = lazy(() => import("./pages/TemplateEditor"));
const GeneratedForms = lazy(() => import("./pages/GeneratedForms"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Deck = lazy(() => import("./pages/Deck"));
const OldDeck = lazy(() => import("./pages/OldDeck"));
const PdfDiagnostic = lazy(() => import("./pages/PdfDiagnostic"));
const FormTest = lazy(() => import("./pages/FormTest"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const ProducerDashboard = lazy(() => import("./pages/ProducerDashboard"));
const IntakeForm = lazy(() => import("./pages/IntakeForm"));
const BorrowerPage = lazy(() => import("./pages/BorrowerPage"));
const PipelineTracker = lazy(() => import("./pages/PipelineTracker"));
const PartnerTracker = lazy(() => import("./pages/PartnerTracker"));
const BorSign = lazy(() => import("./pages/BorSign"));
const EmailCallback = lazy(() => import("./pages/EmailCallback"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const Settings = lazy(() => import("./pages/Settings"));
const AuraPulse = lazy(() => import("./pages/AuraPulse"));
const EmailHub = lazy(() => import("./pages/EmailHub"));
const ProducerHub = lazy(() => import("./pages/ProducerHub"));
const AuraBeta = lazy(() => import("./pages/AuraBeta"));
const BetaLayout = lazy(() => import("./components/BetaLayout"));
const BetaChat = lazy(() => import("./pages/BetaChat"));
const BetaTodos = lazy(() => import("./pages/BetaTodos"));
const BetaVoice = lazy(() => import("./pages/BetaVoice"));
const BetaVideo = lazy(() => import("./pages/BetaVideo"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const LossRunDashboard = lazy(() => import("./pages/LossRunDashboard"));
const LossRunNew = lazy(() => import("./pages/LossRunNew"));
const LossRunDetail = lazy(() => import("./pages/LossRunDetail"));
const LossRunSign = lazy(() => import("./pages/LossRunSign"));
const CarrierDirectory = lazy(() => import("./pages/CarrierDirectory"));
const AuraConnect = lazy(() => import("./pages/AuraConnect"));
const AuraConcierge = lazy(() => import("./pages/AuraConcierge"));
const ClientSubmission = lazy(() => import("./pages/ClientSubmission"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const BrandKit = lazy(() => import("./pages/BrandKit"));
const ConnectDemo = lazy(() => import("./pages/ConnectDemo"));
const ConnectDemoAuth = lazy(() => import("./pages/ConnectDemoAuth"));
const BecomePartner = lazy(() => import("./pages/BecomePartner"));
const RequestAccess = lazy(() => import("./pages/RequestAccess"));
const StudioDemo = lazy(() => import("./pages/StudioDemo"));
const LeadLanding = lazy(() => import("./pages/LeadLanding"));
const ProductAuth = lazy(() => import("./pages/ProductAuth"));
const ConnectProduct = lazy(() => import("./pages/ConnectProduct"));
const ConnectOnboarding = lazy(() => import("./pages/ConnectOnboarding"));
const StudioProduct = lazy(() => import("./pages/StudioProduct"));
const ProductSettings = lazy(() => import("./pages/ProductSettings"));
const PostCheckoutOnboard = lazy(() => import("./pages/PostCheckoutOnboard"));
const Clark = lazy(() => import("./pages/Clark"));
const ClarkQuestionnaire = lazy(() => import("./pages/ClarkQuestionnaire"));

const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/** Syncs dark-mode preference from the DB once the user is authenticated */
function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("aura-dark-mode", dark ? "true" : "false");
}

function syncThemeFromProfile(userId: string) {
  supabase
    .from("profiles")
    .select("dark_mode, theme_preference")
    .eq("user_id", userId)
    .maybeSingle()
    .then(({ data }) => {
      if (!data) return;
      const themePref = (data as any).theme_preference as string | null;
      const dbDark = (data as any).dark_mode as boolean | null;

      // Prefer explicit theme_preference (set during onboarding) first
      if (themePref) {
        applyTheme(themePref === "dark");
      } else if (dbDark === true) {
        // Only override to dark if explicitly true; ignore false default for new users
        applyTheme(true);
      }
      // Otherwise keep localStorage value (defaults to dark via main.tsx)
    });
}

function DarkModeSync() {
  useEffect(() => {
    // Sync on current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) syncThemeFromProfile(session.user.id);
    });

    // Re-sync whenever auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        syncThemeFromProfile(session.user.id);
      }
      // On logout, keep current localStorage preference
    });

    return () => subscription.unsubscribe();
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
        <Suspense fallback={<RouteFallback />}>
          <Routes>
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

            <Route path="/leads/:industry" element={<LeadLanding />} />

            <Route path="/connectdemo" element={<ConnectDemo />} />
            <Route path="/connectdemo/auth" element={<ConnectDemoAuth />} />
            <Route path="/studiodemo" element={<StudioDemo />} />

            <Route path="/beta">
              <Route index element={<AuraBeta />} />
              <Route element={<BetaLayout />}>
                <Route path="chat" element={<BetaChat />} />
                <Route path="todos" element={<BetaTodos />} />
                <Route path="voice" element={<BetaVoice />} />
                <Route path="video" element={<BetaVideo />} />
              </Route>
            </Route>

            <Route path="/get-started" element={<ProductAuth />} />

            <Route path="/connect/onboarding" element={<ProductProtectedRoute><ConnectOnboarding /></ProductProtectedRoute>} />
            <Route path="/connect" element={<ProductProtectedRoute><ConnectProduct /></ProductProtectedRoute>} />
            <Route path="/connect/*" element={<ProductProtectedRoute><ConnectProduct /></ProductProtectedRoute>} />

            <Route path="/studio" element={<ProductProtectedRoute><StudioProduct /></ProductProtectedRoute>} />
            <Route path="/studio/*" element={<ProductProtectedRoute><StudioProduct /></ProductProtectedRoute>} />

            <Route path="/app/settings" element={<ProductProtectedRoute><ProductSettings /></ProductProtectedRoute>} />

            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Navigate to="/auth" replace />} />
            <Route path="/signup" element={<Navigate to="/auth" replace />} />

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
            <Route path="/insurance/admin" element={<ProtectedRoute><AdminRoute><AdminDashboard /></AdminRoute></ProtectedRoute>} />
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
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
