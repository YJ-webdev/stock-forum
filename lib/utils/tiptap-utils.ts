// lib/tiptap-utils.ts

import type { JSONContent } from "@tiptap/react";

export function hasEditorContent(
  node: JSONContent | null | undefined,
): boolean {
  if (!node) return false;

  if (node.text?.trim()) {
    return true;
  }

  if (node.type === "image") {
    return true;
  }

  return node.content?.some(hasEditorContent) ?? false;
}
