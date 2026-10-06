function cleanBriefText(text: string): string {
  const isDomainLabel = (value: string) =>
    /^(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?$/i.test(value.trim());

  return text
    .replace(/\[([^\]]*)\]\(https?:\/\/[^)\s]+\)/g, (_match, label: string) =>
      isDomainLabel(label) ? "" : label,
    )
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, (_match, label: string) => {
      const plainLabel = label.replace(/<[^>]+>/g, "");

      return isDomainLabel(plainLabel) ? "" : plainLabel;
    })
    .replace(/<[^>]+>/g, "")
    .replace(
      /\(\s*(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s()]*)?\s*\)/gi,
      "",
    )
    .replace(/https?:\/\/[^\s<>)\]]+/g, "")
    .replace(/【[^】]*】/g, "")
    .replace(/cite[^]*/g, "")
    .replace(/\(\s*\)|\[\s*\]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\r?\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .trim();
}
