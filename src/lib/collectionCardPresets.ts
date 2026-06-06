import { buildBucketImageUrl, buildTransformedImageUrl } from "@/lib/media";
import type { CollectionCardGridItem } from "@/lib/components/CollectionCardGrid";

export type SharedCollectionCardArtKey =
  | "RARE_GEMS"
  | "WITH_HARMONIUM"
  | "HISTORICAL_TREASURES";

type CollectionCardPresetBase<Key extends SharedCollectionCardArtKey> = {
  key: Key;
  title: string;
  imageSrc: string | null;
  overlayClassName: string;
};

export const sharedCollectionCardPresets = {
  RARE_GEMS: {
    key: "RARE_GEMS",
    title: "Rare Gems",
    imageSrc: buildTransformedImageUrl(
      buildBucketImageUrl("page-art/Rare-Gems.png"),
      {
        width: 480,
        height: 260,
        fit: "cover",
        format: "auto",
      },
    ),
    overlayClassName:
      "bg-[linear-gradient(102deg,rgba(246,249,239,0.98)_0%,rgba(248,250,244,0.88)_18%,rgba(248,250,244,0.32)_38%,rgba(248,250,244,0.04)_68%)]",
  },
  WITH_HARMONIUM: {
    key: "WITH_HARMONIUM",
    title: "Harmonium Kirtan",
    imageSrc: buildTransformedImageUrl(
      buildBucketImageUrl("page-art/Harmonium-Background.png"),
      {
        width: 480,
        height: 260,
        fit: "cover",
        format: "auto",
      },
    ),
    overlayClassName:
      "bg-[linear-gradient(102deg,rgba(252,246,239,0.98)_0%,rgba(252,248,244,0.9)_26%,rgba(252,248,244,0.4)_50%,rgba(252,248,244,0.06)_78%)]",
  },
  HISTORICAL_TREASURES: {
    key: "HISTORICAL_TREASURES",
    title: "Historical Treasures",
    imageSrc: buildTransformedImageUrl(
      buildBucketImageUrl("page-art/Historical-Treasures.png"),
      {
        width: 480,
        height: 260,
        fit: "cover",
        format: "auto",
      },
    ),
    overlayClassName:
      "bg-[linear-gradient(102deg,rgba(245,248,239,0.98)_0%,rgba(247,250,244,0.9)_26%,rgba(247,250,244,0.42)_50%,rgba(247,250,244,0.06)_78%)]",
  },
} as const satisfies Record<
  SharedCollectionCardArtKey,
  CollectionCardPresetBase<SharedCollectionCardArtKey>
>;

export function buildSharedCollectionCard<Key extends SharedCollectionCardArtKey>(
  key: Key,
  countText: string,
): CollectionCardGridItem<Key> {
  const preset = sharedCollectionCardPresets[key] as CollectionCardPresetBase<Key>;
  return {
    ...preset,
    countText,
  };
}
