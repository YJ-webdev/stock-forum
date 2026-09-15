export function createSlug(title: string) {
  const base = title
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = crypto.randomUUID().slice(0, 6);

  return `${base || "post"}-${suffix}`;
}
