"use client";

import { useEffect, useState } from "react";
import { useOffline } from "@/lib/net/useOffline";
import { useDictionary } from "@/lib/i18n/LocaleProvider";

export default function OfflineBanner() {
  const dictionary = useDictionary();
  const { isOffline, lastOfflineAt } = useOffline();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOffline) {
      const frame = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(frame);
    }
    if (lastOfflineAt === 0) {
      const frame = requestAnimationFrame(() => setShow(false));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => setShow(false), 2000);
    return () => clearTimeout(timer);
  }, [isOffline, lastOfflineAt]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-3 z-[70]">
      <div className="mx-auto w-fit rounded-full bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-600 shadow-sm">
        {dictionary.common.offlineCheckConnection}
      </div>
    </div>
  );
}
