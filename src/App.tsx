import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Auth from "./pages/Auth";
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
import PdfDiagnostic from "./pages/PdfDiagnostic";
import FormTest from "./pages/FormTest";
import Pipeline from "./pages/Pipeline";
import LeadDetail from "./pages/LeadDetail";
import ProducerDashboard from "./pages/ProducerDashboard";
import Approvals from "./pages/Approvals";
import IntakeForm from "./pages/IntakeForm";
import PipelineTracker from "./pages/PipelineTracker";
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
import { Navigate } from "react-router-dom";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/email" element={<ProtectedRoute><EmailHub /></ProtectedRoute>} />
          <Route path="/hub" element={<ProtectedRoute><ProducerHub /></ProtectedRoute>} />
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
          <Route path="/pdf-diagnostic" element={<PdfDiagnostic />} />
          <Route path="/form-test" element={<ProtectedRoute><FormTest /></ProtectedRoute>} />
          <Route path="/pipeline" element={<ProtectedRoute><Pipeline /></ProtectedRoute>} />
          <Route path="/pipeline/:leadId" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
          <Route path="/my-dashboard" element={<ProtectedRoute><ProducerDashboard /></ProtectedRoute>} />
          <Route path="/approvals" element={<Navigate to="/admin" replace />} />
          <Route path="/intake/:token" element={<IntakeForm />} />
          <Route path="/tracker" element={<PipelineTracker />} />
          <Route path="/personal-intake/:token" element={<IntakeForm />} />
          <Route path="/bor-sign/:token" element={<BorSign />} />
          <Route path="/inbox" element={<Navigate to="/email" replace />} />
          <Route path="/email-callback" element={<ProtectedRoute><EmailCallback /></ProtectedRoute>} />
          <Route path="/calendar" element={<Navigate to="/email" replace />} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/book/:producerId" element={<BookingPage />} />
          <Route path="/beta" element={<AuraBeta />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
