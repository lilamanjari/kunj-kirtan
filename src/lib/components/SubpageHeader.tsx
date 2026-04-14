"use client";

import Image from "next/image";
import Link from "next/link";

type SubpageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
};

export default function SubpageHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Home",
}: SubpageHeaderProps) {
  const isLongTitle = title.length > 18;
  const isVeryLongTitle = title.length > 26;
  const isExtremelyLongTitle = title.length > 34;
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
      <div className="relative h-40">
        <Image
          src="/Kunj%20Kirtan%20Subpage%20Header.jpeg"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 448px"
          className="object-cover"
          style={{ objectPosition: "center center" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,247,242,0.76)_0%,rgba(255,244,238,0.34)_32%,rgba(255,244,238,0.08)_56%,rgba(255,244,238,0)_78%)]" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-[#f6e4de]" />

        <div className="absolute inset-x-5 top-4">
          <div className={titleWidthClassName}>
            <Link
              href={backHref}
              className="inline-flex rounded-md border border-white/70 bg-white/78 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9b6a5f] shadow-sm backdrop-blur-sm hover:bg-white"
            >
              {`\u2039 ${backLabel}`}
            </Link>
          </div>
        </div>

        <div className="absolute inset-x-5 bottom-4">
          <div className={`${titleWidthClassName} px-1`}>
            <h1
              className={`${titleClassName} ${titleClampClassName}`}
              style={{ textShadow: "0 1px 14px rgba(255, 248, 244, 0.72)" }}
              title={title}
            >
              {title}
            </h1>
            {subtitle ? (
              <p
                className="mt-1 text-sm text-[#7b5a53]"
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
