"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localizeHref } from "@/lib/i18n/localizeHref";

type LocalizedLinkProps = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
    children?: ReactNode;
  };

export default function LocalizedLink({
  href,
  children,
  ...props
}: LocalizedLinkProps) {
  const locale = useLocale();
  const localizedHref =
    typeof href === "string" ? localizeHref(href, locale) : href;

  return (
    <Link href={localizedHref} {...props}>
      {children}
    </Link>
  );
}
