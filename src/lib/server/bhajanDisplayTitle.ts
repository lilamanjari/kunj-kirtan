import { formatKirtanTitle } from "@/lib/kirtanTitle";
import type { KirtanType, PlayableKirtanRow } from "@/types/kirtan";

export function getDisplayKirtanTitle(
  kirtan: Pick<
    PlayableKirtanRow,
    "type" | "title" | "display_title" | "official_title" | "first_line_title"
  > & { type: KirtanType },
) {
  const resolvedTitle =
    kirtan.type === "BHJ"
      ? kirtan.display_title ?? kirtan.official_title ?? kirtan.first_line_title ?? kirtan.title
      : kirtan.title;

  return formatKirtanTitle(kirtan.type, resolvedTitle);
}
