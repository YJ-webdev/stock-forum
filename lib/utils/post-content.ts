// lib/utils/post-content.ts

type TiptapNode = {
  type?: string;
  attrs?: {
    src?: string | null;
    [key: string]: unknown;
  };
  content?: TiptapNode[];
};

import type { JSONContent } from "@tiptap/react";

export function getFirstImage(node: JSONContent): string | null {
  if (
    node.type === "image" &&
    node.attrs &&
    typeof node.attrs.src === "string"
  ) {
    return node.attrs.src;
  }

  if (!Array.isArray(node.content)) {
    return null;
  }

  for (const child of node.content) {
    const src = getFirstImage(child);

    if (src) {
      return src;
    }
  }

  return null;
}
