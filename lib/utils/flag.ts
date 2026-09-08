// lib/utils/flag.ts

export function getCountryFlagEmoji(countryCode: string): string {
  if (!countryCode) return "🏴";

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}
