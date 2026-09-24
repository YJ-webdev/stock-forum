import type { JSONContent } from "@tiptap/react";

export function isDeletedPredictionContent(content: JSONContent): boolean {
  const text = content.content
    ?.flatMap((node) => node.content ?? [])
    .map((node) => node.text ?? "")
    .join("")
    .trim();

  return text === "Comment deleted by user";
}
