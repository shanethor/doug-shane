import { supabase } from "@/integrations/supabase/client";

export interface Carrier {
  id: string;
  name: string;
  loss_run_email: string | null;
  loss_run_fax: string | null;
  notes: string | null;
}

let cachedCarriers: Carrier[] | null = null;

export async function getCarriers(): Promise<Carrier[]> {
  if (cachedCarriers) return cachedCarriers;
  const { data } = await supabase
    .from("carriers" as any)
    .select("*")
    .order("name");
  cachedCarriers = (data as any as Carrier[]) || [];
  return cachedCarriers;
}

export function invalidateCarrierCache() {
  cachedCarriers = null;
}
