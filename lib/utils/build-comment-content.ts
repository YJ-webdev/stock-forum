import type { JSONContent } from "@tiptap/react";

import { getGifDimensions } from "@/lib/utils/gif-dimensions";

interface CommentGif {
  src: string;
  title: string;
  width?: number | null;
  height?: number | null;
}

export function buildCommentContent(
  text: string,
  gif: CommentGif | null,
): JSONContent {
  const content: JSONContent[] = [];
  const trimmed = text.trim();

  if (trimmed) {
    for (const line of trimmed.split(/\r\n|\r|\n/)) {
      content.push({
        type: "paragraph",
        content: line ? [{ type: "text", text: line }] : [],
      });
    }
  }

  if (gif) {
    const dimensions = getGifDimensions(gif.width, gif.height);

    content.push({
      type: "image",
      attrs: {
        src: gif.src,
        alt: gif.title,
        ...(dimensions ?? {}),
      },
    });
  }

  return {
    type: "doc",
    content,
  };
}
