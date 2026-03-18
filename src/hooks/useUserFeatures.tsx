import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type FeatureFlag = "connect"; // extend as needed

const featureCache: { userId: string | null; features: FeatureFlag[]; ts: number } = {
  userId: null,
  features: [],
  ts: 0,
};
const CACHE_TTL = 5 * 60 * 1000;

export function useUserFeatures() {
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
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

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    supabase
      .from("user_features")
      .select("feature")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const found = (data || []).map((d) => d.feature as FeatureFlag);
        featureCache.userId = user.id;
        featureCache.features = found;
        featureCache.ts = Date.now();
        setFeatures(found);
        setLoading(false);
      });
  }, [user]);

  return {
    features,
    loading,
    hasFeature: (f: FeatureFlag) => features.includes(f),
    hasConnect: features.includes("connect"),
  };
}

export function invalidateFeatureCache() {
  featureCache.ts = 0;
}
