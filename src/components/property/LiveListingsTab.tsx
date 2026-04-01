import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ExternalLink, Bed, Bath, Maximize, Clock, Loader2 } from "lucide-react";

const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY as string | undefined;

interface Listing {
  property_id: string;
  list_price: number;
  location: {
    address: { line?: string; city?: string; state_code?: string; postal_code?: string };
  };
  description: { beds?: number; baths?: number; sqft?: number };
  photos?: { href: string }[];
  list_date?: string;
  status?: string;
  href?: string;
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function daysOnMarket(listDate?: string): number | null {
  if (!listDate) return null;
  const diff = Date.now() - new Date(listDate).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

const STATUS_COLORS: Record<string, string> = {
  for_sale: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  ready_to_build: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  sold: "bg-muted text-muted-foreground border-border",
};

function statusLabel(s?: string) {
  if (!s) return "For Sale";
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export default function LiveListingsTab({ activeZip }: { activeZip: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const fetchListings = useCallback(async (zip: string, currentOffset: number, append = false) => {
    if (!RAPIDAPI_KEY) return;
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ postal_code: zip, limit: "20", offset: String(currentOffset) });
      const res = await fetch(`https://us-real-estate.p.rapidapi.com/v2/for-sale?${params}`, {
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "us-real-estate.p.rapidapi.com",
        },
      });
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const json = await res.json();
      const results: Listing[] = json?.data?.home_search?.results ?? json?.data?.results ?? [];
      if (results.length < 20) setHasMore(false);
      setListings(prev => append ? [...prev, ...results] : results);
    } catch (e: any) {
      setError(e.message || "Failed to fetch listings");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Reset + fetch on zip change
  useEffect(() => {
    setListings([]);
    setOffset(0);
    setHasMore(true);
    fetchListings(activeZip, 0);
  }, [activeZip, fetchListings]);

  const loadMore = () => {
    const next = offset + 20;
    setOffset(next);
    fetchListings(activeZip, next, true);
  };

  if (!RAPIDAPI_KEY && !dismissed) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium">RapidAPI key not configured</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add <code className="bg-muted px-1 rounded text-[11px]">VITE_RAPIDAPI_KEY</code> to your environment to enable live MLS listings.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={() => setDismissed(true)}>Dismiss</Button>
      </div>
    );
  }

  if (dismissed && !RAPIDAPI_KEY) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Live Listings — {activeZip}</h3>
          <p className="text-[11px] text-muted-foreground">{listings.length} listing{listings.length !== 1 ? "s" : ""} loaded</p>
        </div>
        <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => { setOffset(0); setHasMore(true); fetchListings(activeZip, 0); }}>
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
          <Button variant="outline" size="sm" className="mt-2 text-xs" onClick={() => fetchListings(activeZip, 0)}>Retry</Button>
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
            {listings.map((l) => {
              const addr = l.location?.address;
              const photo = l.photos?.[0]?.href;
              const dom = daysOnMarket(l.list_date);
              const status = l.status || "for_sale";

              return (
                <Card key={l.property_id} className="border-border bg-card overflow-hidden hover:shadow-sm transition-shadow group">
                  <div className="relative h-40 bg-muted">
                    {photo ? (
                      <img src={photo} alt={addr?.line || "Listing"} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground text-xs">No photo</div>
                    )}
                    <Badge variant="outline" className={`absolute top-2 left-2 text-[10px] ${STATUS_COLORS[status] || STATUS_COLORS.for_sale}`}>
                      {statusLabel(status)}
                    </Badge>
                  </div>
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-base font-bold">{formatUSD(l.list_price)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[addr?.line, addr?.city, addr?.state_code, addr?.postal_code].filter(Boolean).join(", ")}
                    </p>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                      {l.description?.beds != null && (
                        <span className="flex items-center gap-1"><Bed className="h-3 w-3" />{l.description.beds} bd</span>
                      )}
                      {l.description?.baths != null && (
                        <span className="flex items-center gap-1"><Bath className="h-3 w-3" />{l.description.baths} ba</span>
                      )}
                      {l.description?.sqft != null && (
                        <span className="flex items-center gap-1"><Maximize className="h-3 w-3" />{l.description.sqft.toLocaleString()} sqft</span>
                      )}
                      {dom != null && (
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{dom}d</span>
                      )}
                    </div>
                    {l.href && (
                      <a href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mt-1" onClick={e => e.stopPropagation()}>
                        View listing <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
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
