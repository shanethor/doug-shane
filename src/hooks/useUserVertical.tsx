import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getVerticalConfig, getAllVerticals, type ConnectVerticalConfig } from "@/lib/connect-verticals";

const MASTER_EMAILS = new Set(["shane@houseofthor.com", "dwenz17@gmail.com"]);

export function useUserVertical() {
  const { user } = useAuth();
  const [vertical, setVertical] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isMaster = user?.email ? MASTER_EMAILS.has(user.email.toLowerCase()) : false;

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("connect_vertical")
        .eq("user_id", user.id)
        .single();

      setVertical((data as any)?.connect_vertical ?? null);
      setLoading(false);
    };
    fetch();
  }, [user?.id]);

  const setUserVertical = async (verticalId: string) => {
    if (!user?.id) return;
    setVertical(verticalId);
    await supabase
      .from("profiles")
      .update({ connect_vertical: verticalId } as any)
      .eq("user_id", user.id);
  };

  const config: ConnectVerticalConfig | undefined = vertical
    ? getVerticalConfig(vertical)
    : undefined;

  // Master accounts can see all verticals
  const allConfigs = isMaster ? getAllVerticals() : config ? [config] : [];

  return {
    vertical,
    config,
    allConfigs,
    isMaster,
    loading,
    setUserVertical,
    needsVerticalSelection: !loading && !vertical && !isMaster,
  };
}
