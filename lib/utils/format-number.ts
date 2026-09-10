// lib/utils.ts

/**
 * Formats a raw number into a localized currency string.
 * e.g., 64250.5 -> "$64,250.50"
 */
export function formatPrice(
  price: number | undefined | null,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  if (price === undefined || price === null || isNaN(price)) {
    return "$0.00";
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Formats market volume numbers into human-readable compact strings.
 * e.g., 1500000 -> "1.5M"
 */
export function formatVolume(vol: number | undefined | null): string {
  if (!vol) return "N/A";
  if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`;
  if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`;
  if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
  return vol.toString();
}

/**
 * Formats percent changes with explicit sign prefix.
 * e.g., 2.5 -> "+2.50%", -1.2 -> "-1.20%"
 */
export function formatPercentChange(changePercent: number): string {
  const sign = changePercent > 0 ? "+" : "";
  return `${sign}${changePercent.toFixed(2)}%`;
}
