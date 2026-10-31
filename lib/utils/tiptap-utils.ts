// lib/tiptap-utils.ts

import type { JSONContent } from "@tiptap/react";

export function hasEditorContent(
  node: JSONContent | null | undefined,
): boolean {
  if (!node) return false;

  if (node.type === "text" && node.text?.trim()) {
    return true;
  }

  if (node.type === "image") {
    return (
      typeof node.attrs?.src === "string" && node.attrs.src.trim().length > 0
    );
  }

  return node.content?.some(hasEditorContent) ?? false;
}
