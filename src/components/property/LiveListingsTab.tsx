import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Bed, Bath, Maximize, Clock, Loader2, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Listing {
  zpid: string;
  price: string;
  unformattedPrice: number;
  address: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressZipcode: string;
  beds: number | null;
  baths: number | null;
  area: number | null;
  imgSrc: string | null;
  detailUrl: string;
  statusText: string;
  homeType: string | null;
  daysOnZillow: number | null;
  zestimate: number | null;
  brokerName: string | null;
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const STATUS_COLORS: Record<string, string> = {
  "for sale": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "condo for sale": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "house for sale": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "townhouse for sale": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "pending": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "sold": "bg-muted text-muted-foreground border-border",
};

function getStatusColor(status: string) {
  const lower = status.toLowerCase();
  for (const [key, val] of Object.entries(STATUS_COLORS)) {
    if (lower.includes(key)) return val;
  }
  return STATUS_COLORS["for sale"];
}

// Simple in-memory cache to avoid redundant API calls
const listingsCache = new Map<string, { data: Listing[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const inflightRequests = new Map<string, Promise<Listing[]>>();

export default function LiveListingsTab({ activeZip }: { activeZip: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchListings = useCallback(async (zip: string, pageNum: number, append = false) => {
    const cacheKey = `${zip}-${pageNum}`;

    // Return cached data if fresh
    const cached = listingsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      if (cached.data.length < 5) setHasMore(false);
      setListings(prev => append ? [...prev, ...cached.data] : cached.data);
      return;
    }

    // Deduplicate in-flight requests
    if (inflightRequests.has(cacheKey)) {
      try {
        const results = await inflightRequests.get(cacheKey)!;
        if (results.length < 5) setHasMore(false);
        setListings(prev => append ? [...prev, ...results] : results);
      } catch {}
      return;
    }
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);

    const doFetch = async (): Promise<Listing[]> => {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/zillow-listings?zip=${zip}&page=${pageNum}`;
      
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `API returned ${res.status}`);
      }

      const json = await res.json();
      return json.listings || [];
    };

    inflightRequests.set(cacheKey, doFetch());

    try {
      const results = await inflightRequests.get(cacheKey)!;
      listingsCache.set(cacheKey, { data: results, ts: Date.now() });

      if (results.length < 5) setHasMore(false);
      setListings(prev => append ? [...prev, ...results] : results);
    } catch (e: any) {
      setError(e.message || "Failed to fetch listings");
    } finally {
      inflightRequests.delete(cacheKey);
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Reset + fetch on zip change
  useEffect(() => {
    setListings([]);
    setPage(1);
    setHasMore(true);
    fetchListings(activeZip, 1);
  }, [activeZip, fetchListings]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchListings(activeZip, next, true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            Live Listings — {activeZip}
          </h3>
          <p className="text-[11px] text-muted-foreground">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} loaded · Powered by Zillow
          </p>
        </div>
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => { setPage(1); setHasMore(true); fetchListings(activeZip, 1); }}>
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border bg-card overflow-hidden">
              <Skeleton className="h-40 w-full rounded-none" />
              <CardContent className="p-3 space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Failed to load listings</p>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => fetchListings(activeZip, 1)}>Retry</Button>
        </div>
      )}

      {!loading && !error && listings.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">No listings found for {activeZip}</p>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <Card key={l.zpid} className="border-border bg-card overflow-hidden hover:shadow-sm transition-shadow group">
                <div className="relative h-40 bg-muted">
                  {l.imgSrc ? (
                    <img src={l.imgSrc} alt={l.addressStreet || "Listing"} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
                  )}
                  <Badge variant="outline" className={`absolute top-2 left-2 text-[10px] ${getStatusColor(l.statusText)}`}>
                    {l.statusText || "For Sale"}
                  </Badge>
                  {l.homeType && (
                    <Badge variant="outline" className="absolute top-2 right-2 text-[10px] bg-background/80 border-border">
                      {l.homeType.replace(/_/g, " ")}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-base font-bold">{l.price || formatUSD(l.unformattedPrice)}</p>
                    {l.zestimate != null && l.zestimate > 0 && (
                      <span className="text-[10px] text-muted-foreground">Zest: {formatUSD(l.zestimate)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{l.address}</p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                    {l.beds != null && (
                      <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{l.beds} bd</span>
                    )}
                    {l.baths != null && (
                      <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{l.baths} ba</span>
                    )}
                    {l.area != null && l.area > 0 && (
                      <span className="flex items-center gap-1"><Maximize className="h-3 w-3" />{l.area.toLocaleString()} sqft</span>
                    )}
                    {l.daysOnZillow != null && (
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{l.daysOnZillow}d</span>
                    )}
                  </div>
                  {l.brokerName && (
                    <p className="text-[10px] text-muted-foreground truncate">{l.brokerName}</p>
                  )}
                  {l.detailUrl && (
                    <a href={l.detailUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1" onClick={e => e.stopPropagation()}>
                      View on Zillow <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</> : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
