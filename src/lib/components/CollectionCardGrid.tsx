"use client";

import Image from "next/image";
import { displayHeadingClassName } from "@/lib/theme/componentThemes";
import { radiusClassNames } from "@/lib/theme/radii";

export type CollectionCardGridItem<Key extends string = string> = {
  key: Key;
  title: string;
  countText: string;
  imageSrc?: string | null;
  overlayClassName: string;
};

export default function CollectionCardGrid<Key extends string>({
  cards,
  selectedKey,
  onSelect,
}: {
  cards: CollectionCardGridItem<Key>[];
  selectedKey: Key | "ALL";
  onSelect: (key: Key) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => {
        const isSelected = selectedKey === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect(card.key)}
            className={`group relative h-[4.85rem] overflow-hidden border px-3 py-2 text-left shadow-[0_12px_28px_rgba(120,53,15,0.08)] transition sm:h-[5.1rem] ${
              isSelected
                ? "border-[#deb8ab] ring-1 ring-[#deb8ab]"
                : "border-[#ead8cf]"
            } ${radiusClassNames.surface} bg-white/90`}
          >
            <div className="absolute inset-0">
              {card.imageSrc ? (
                <Image
                  src={card.imageSrc}
                  alt=""
                  fill
                  sizes="220px"
                  className="object-cover object-right"
                />
              ) : null}
              <div className={`absolute inset-0 ${card.overlayClassName}`} />
            </div>
            <div className="relative z-[1] flex h-full max-w-[56%] flex-col justify-between">
              <p
                className={`${displayHeadingClassName} text-[0.92rem] leading-[1] text-[#5b372f] sm:text-[1rem]`}
              >
                {card.title}
              </p>
              <p className="mt-1 whitespace-nowrap text-xs leading-none text-[#97756b]">
                {card.countText}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
