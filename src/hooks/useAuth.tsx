import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { clear2FAVerified } from "@/lib/2fa-storage";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    const applySession = (s: Session | null) => {
      if (!mounted) return;
      const newId = s?.user?.id ?? null;
      // Only update state when user actually changes to prevent re-render loops
      if (lastUserId.current !== newId) {
        lastUserId.current = newId;
        setSession(s);
        setUser(s?.user ?? null);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    lastUserId.current = undefined;
    clear2FAVerified();
    await supabase.auth.signOut();
  }, []);

  return { user, session, loading, signOut };
}
