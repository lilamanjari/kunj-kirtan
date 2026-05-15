import type { RecordedDatePrecision } from "@/types/kirtan";
import {
  defaultLocale,
  getIntlLocale,
  type Locale,
} from "@/lib/i18n/config";

export function parseDateSafe(dateStr: string | null | undefined) {
  if (!dateStr) return null;

  // iOS Safari is picky about bare YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateShort(
  dateStr: string | null | undefined,
  precision: RecordedDatePrecision | null | undefined = "day",
  locale: Locale = defaultLocale,
) {
  const d = parseDateSafe(dateStr);
  if (!d) return "";
  const intlLocale = getIntlLocale(locale);
  if (precision === "year") {
    return d.toLocaleDateString(intlLocale, {
      year: "numeric",
    });
  }
  if (precision === "month") {
    return d.toLocaleDateString(intlLocale, {
      month: "short",
      year: "numeric",
    });
  }
  return d.toLocaleDateString(intlLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateLong(
  dateStr: string | null | undefined,
  precision: RecordedDatePrecision | null | undefined = "day",
  locale: Locale = defaultLocale,
) {
  const d = parseDateSafe(dateStr);
  if (!d) return "";
  const intlLocale = getIntlLocale(locale);
  if (precision === "year") {
    return d.toLocaleDateString(intlLocale, {
      year: "numeric",
    });
  }
  if (precision === "month") {
    return d.toLocaleDateString(intlLocale, {
      month: "long",
      year: "numeric",
    });
  }
  return d.toLocaleDateString(intlLocale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
