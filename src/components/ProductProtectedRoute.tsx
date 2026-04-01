import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const MASTER_EMAILS = [
  "shane@houseofthor.com",
  "dwenz17@gmail.com",
];

export function ProductProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#08080A]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[hsl(140,12%,50%)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/get-started" replace />;
  }

  const email = user.email?.toLowerCase() ?? "";
  if (!MASTER_EMAILS.includes(email)) {
    return <Navigate to="/get-started" replace />;
  }

  return <>{children}</>;
}
