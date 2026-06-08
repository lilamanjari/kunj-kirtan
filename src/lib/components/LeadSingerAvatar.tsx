"use client";

import { buildTransformedImageUrl } from "@/lib/media";

type LeadSingerAvatarProps = {
  name: string | null;
  imageUrl?: string | null;
  alt?: string | null;
  size?: "list" | "featured";
  className?: string;
  imageClassName?: string;
  textClassName?: string;
};

function getInitials(name: string | null) {
  const initials = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "?";
}

export default function LeadSingerAvatar({
  name,
  imageUrl,
  alt,
  size = "list",
  className,
  imageClassName,
  textClassName,
}: LeadSingerAvatarProps) {
  const transformedImageUrl = buildTransformedImageUrl(imageUrl, {
    width: size === "featured" ? 320 : 160,
    height: size === "featured" ? 320 : 160,
    fit: "cover",
    format: "auto",
  });

  if (imageUrl) {
    return (
      // We use a plain img here because these portraits come from a configurable
      // bucket host and we want to avoid coupling this component to Next remotePatterns.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={transformedImageUrl ?? imageUrl}
        alt={alt ?? name ?? ""}
        className={imageClassName ?? `h-full w-full object-cover ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      className={
        className
          ? `relative ${className}`
          : "relative h-full w-full bg-[radial-gradient(circle_at_top,_rgba(255,251,247,0.96),rgba(244,230,221,0.86))]"
      }
    >
      <span
        className={
          textClassName ??
          "absolute inset-0 flex items-center justify-center text-[1.15rem] font-semibold uppercase tracking-[0.02em] text-[#8e6254]"
        }
      >
        {getInitials(name)}
      </span>
    </div>
  );
}
