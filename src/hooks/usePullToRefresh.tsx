import { useRef, useState, useCallback, useEffect } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80, maxPull = 120 }: PullToRefreshOptions) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling || refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) {
      setPullDistance(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) {
      // Apply resistance
      const distance = Math.min(delta * 0.5, maxPull);
      setPullDistance(distance);
    }
  }, [pulling, refreshing, maxPull]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      if (navigator.vibrate) navigator.vibrate(10);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pulling, pullDistance, threshold, refreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const isTriggered = pullDistance >= threshold;

  const PullIndicator = () => (
    <div
      className="flex items-center justify-center overflow-hidden transition-all duration-200 md:hidden"
      style={{ height: pullDistance > 0 || refreshing ? `${Math.max(pullDistance, refreshing ? 40 : 0)}px` : "0px" }}
    >
      <div className={`flex items-center gap-2 text-xs text-muted-foreground font-sans transition-transform ${isTriggered ? "scale-110" : ""}`}>
        <svg
          className={`h-4 w-4 ${refreshing ? "animate-spin" : ""} transition-transform`}
          style={{ transform: refreshing ? undefined : `rotate(${Math.min(pullDistance / threshold * 180, 180)}deg)` }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span>{refreshing ? "Refreshing…" : isTriggered ? "Release to refresh" : "Pull to refresh"}</span>
      </div>
    </div>
  );

  return { containerRef, PullIndicator, refreshing };
}
