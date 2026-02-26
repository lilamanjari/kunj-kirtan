"use client";

import { useEffect, useState } from "react";
import { useOffline } from "@/lib/net/useOffline";

export default function OfflineBanner() {
  const { isOffline, lastOfflineAt } = useOffline();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setShow(true);
      return;
    }
    if (lastOfflineAt === 0) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(timer);
  }, [isOffline, lastOfflineAt]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-3 z-[70]">
      <div className="mx-auto w-fit rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 shadow-sm">
        Offline — check your connection
      </div>
    </div>
  );
}
