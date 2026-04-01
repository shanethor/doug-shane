import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isTrialing: boolean;
  branch: string | null;
  hasStudio: boolean;
  hasAgent: boolean;
  loading: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    isTrialing: false,
    branch: null,
    hasStudio: false,
    hasAgent: false,
    loading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setState(s => ({ ...s, loading: false, subscribed: false }));
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setState({
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        isTrialing: data.is_trialing || false,
        branch: data.branch || null,
        hasStudio: data.has_studio || false,
        hasAgent: data.has_agent || false,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message }));
    }
  }, [session]);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const startCheckout = useCallback(async (branch: string = "property") => {
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { branch },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      throw err;
    }
  }, []);

  const openPortal = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      console.error("Portal error:", err);
      throw err;
    }
  }, []);

  return {
    ...state,
    checkSubscription,
    startCheckout,
    openPortal,
  };
}
