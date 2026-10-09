export const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "it", label: "Italiano" },
  { value: "ru", label: "Русский" },
  { value: "ar", label: "العربية" },
  { value: "hi", label: "हिन्दी" },
] as const;

export type Language = (typeof LANGUAGES)[number]["value"];

// DB에서 가져온 문자열을 검증하고, 없거나 잘못된 값이면 영어 사용
export function resolveLanguage(value?: string | null): Language {
  return LANGUAGES.find((language) => language.value === value)?.value ?? "en";
}
