"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { getOfflineSnapshot } from "@/lib/net/offlineStore";
import { localizeHref } from "@/lib/i18n/localizeHref";

type LocalizedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children?: ReactNode;
  };

export default function LocalizedLink({
  href,
  children,
  onClick,
  ...props
}: LocalizedLinkProps) {
  const locale = useLocale();
  const localizedHref =
    typeof href === "string" ? localizeHref(href, locale) : href;

  return (
    <Link href={localizedHref} {...props} onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
          event.ctrlKey || event.shiftKey || event.altKey || props.target === "_blank") return;
      if (typeof localizedHref === "string" &&
          /^\/(en|ru)\/favorites(?:[?#]|$)/.test(localizedHref) &&
          (!navigator.onLine || getOfflineSnapshot().isOffline)) {
        event.preventDefault();
        window.location.assign(localizedHref);
      }
    }}>
      {children}
    </Link>
  );
}
