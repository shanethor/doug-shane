import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FeatureFlag = "connect" | "concierge"; // extend as needed

const featureCache: { userId: string | null; features: FeatureFlag[]; ts: number } = {
  userId: null,
  features: [],
  ts: 0,
};
const CACHE_TTL = 5 * 60 * 1000;

export function useUserFeatures() {
  const { user, loading: authLoading } = useAuth();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Stay loading until auth finishes hydrating
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!user) {
      setFeatures([]);
      setLoading(false);
      return;
    }

    if (featureCache.userId === user.id && Date.now() - featureCache.ts < CACHE_TTL) {
      setFeatures(featureCache.features);
      setLoading(false);
      return;
    }

    setLoading(true);

    const loadFeatures = async () => {
      try {
        const { data, error } = await supabase
          .from("user_features")
          .select("feature")
          .eq("user_id", user.id);

        if (cancelled) return;

        const found = error ? [] : (data || []).map((d) => d.feature as FeatureFlag);
        featureCache.userId = user.id;
        featureCache.features = found;
        featureCache.ts = Date.now();
        setFeatures(found);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setFeatures([]);
        setLoading(false);
      }
    };

    loadFeatures();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  return {
    features,
    loading,
    hasFeature: (f: FeatureFlag) => !loading && features.includes(f),
    hasConnect: !loading && features.includes("connect"),
  };
}

export function invalidateFeatureCache() {
  featureCache.ts = 0;
}
