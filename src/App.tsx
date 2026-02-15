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
import NotFound from "./pages/NotFound";

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
          <Route path="/clients" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/submit-plan" element={<ProtectedRoute><SubmitPlan /></ProtectedRoute>} />
          <Route path="/application/:submissionId" element={<ProtectedRoute><ApplicationReview /></ProtectedRoute>} />
          <Route path="/acord/:formId/:submissionId" element={<ProtectedRoute><AcordFormPage /></ProtectedRoute>} />
          <Route path="/acord/:formId" element={<ProtectedRoute><AcordFormPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
