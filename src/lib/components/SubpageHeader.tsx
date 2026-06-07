"use client";

import Image from "next/image";
import LocalizedLink from "@/lib/components/LocalizedLink";
import { useDictionary } from "@/lib/i18n/LocaleProvider";
import { radiusClassNames } from "@/lib/theme/radii";

type SubpageHeaderProps = {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  backgroundImageSrc?: string;
  backgroundImageAlt?: string;
  heightClassName?: string;
  overlayClassName?: string;
  bottomWashClassName?: string;
  backgroundImageFit?: "cover" | "contain";
};

export default function SubpageHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Home",
  backgroundImageSrc,
  backgroundImageAlt = "",
  heightClassName,
  overlayClassName,
  bottomWashClassName,
  backgroundImageFit = "cover",
}: SubpageHeaderProps) {
  const dictionary = useDictionary();
  const titleValue = title ?? "";
  const isLongTitle = titleValue.length > 18;
  const isVeryLongTitle = titleValue.length > 26;
  const isExtremelyLongTitle = titleValue.length > 34;
  const titleClassName = isExtremelyLongTitle
    ? "text-[1.12rem] font-semibold leading-[1.05] tracking-[-0.01em] text-[#5b2e26]"
    : isVeryLongTitle
      ? "text-[1.22rem] font-semibold leading-[1.08] tracking-[-0.01em] text-[#5b2e26]"
      : isLongTitle
        ? "text-[1.38rem] font-semibold leading-[1.08] text-[#5b2e26]"
        : "text-[1.7rem] font-semibold leading-tight text-[#5b2e26]";
  const titleWidthClassName = isVeryLongTitle
    ? "max-w-[74%]"
    : isLongTitle
      ? "max-w-[68%]"
      : "max-w-[58%]";
  const titleClampClassName = isLongTitle ? "line-clamp-2" : "";

  return (
    <header className="relative -mx-5 -mt-6 overflow-hidden">
      <div
        className={`relative ${
          backgroundImageFit === "contain"
            ? ""
            : heightClassName ?? "h-[6.7rem] sm:h-[8.8rem]"
        }`}
      >
        {backgroundImageSrc ? (
          backgroundImageFit === "contain" ? (
            <img
              key={backgroundImageSrc}
              src={backgroundImageSrc}
              alt={backgroundImageAlt}
              className="block h-auto w-full"
            />
          ) : (
            <img
              key={backgroundImageSrc}
              src={backgroundImageSrc}
              alt={backgroundImageAlt}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ objectPosition: "center 42%" }}
            />
          )
        ) : (
          <Image
            src="/KunjKirtan-Sub-Header.png"
            alt=""
            fill
            priority
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
            style={{ objectPosition: "center 42%" }}
          />
        )}
        {bottomWashClassName ? (
          <div className={`absolute inset-x-0 bottom-0 ${bottomWashClassName}`} />
        ) : null}
        <div
          className={`absolute inset-0 ${
            overlayClassName ??
            "bg-[linear-gradient(180deg,rgba(255,248,243,0.03)_0%,rgba(255,248,243,0)_58%,rgba(246,228,222,0.5)_78%,rgba(246,228,222,0.95)_100%)]"
          }`}
        />
        <LocalizedLink
          href="/"
          aria-label={dictionary.actions.goToHomePage}
          className={`absolute right-4 top-0 z-10 block h-20 w-[58%] sm:h-24 ${radiusClassNames.headerCorner}`}
        />

        <div className="absolute inset-x-5 top-3 sm:top-4">
          <div className={titleWidthClassName}>
            <LocalizedLink
              href={backHref}
              className={`inline-flex border border-white/70 bg-white/78 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b6a5f] shadow-sm backdrop-blur-sm hover:bg-white ${radiusClassNames.button}`}
            >
              {`\u2039 ${backLabel}`}
            </LocalizedLink>
          </div>
        </div>

        <div className="absolute inset-x-5 bottom-2 sm:bottom-4">
          <div className={`${titleWidthClassName} px-1`}>
            {title ? (
              <h1
                className={`${titleClassName} ${titleClampClassName}`}
                style={{ textShadow: "0 1px 14px rgba(255, 248, 244, 0.72)" }}
                title={title}
              >
                {title}
              </h1>
            ) : null}
            {subtitle ? (
              <p
                className={`${title ? "mt-1" : ""} text-sm text-[#7b5a53]`}
                style={{ textShadow: "0 1px 10px rgba(255, 248, 244, 0.7)" }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
