import { supabase } from "@/integrations/supabase/client";

/**
 * Get the current user's JWT access token for authenticated edge function calls.
 * Falls back to the publishable key if no session exists (should not happen for protected routes).
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  // Try getSession first; if the token is expired, force a refresh
  let { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const { data } = await supabase.auth.refreshSession();
    session = data.session;
  }
  const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
