import { useUserRole } from "@/hooks/useUserRole";

/**
 * @deprecated Use useUserRole() instead. Kept for backward compatibility.
 */
export function useAdmin() {
  const { isAdmin, loading } = useUserRole();
  return { isAdmin, loading };
}
