import type { JSONContent } from "@tiptap/react";

import type { CommentImage } from "@/lib/types/comment-image";
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
  image: CommentImage | null = null,
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

  if (image) {
    content.push({
      type: "image",
      attrs: {
        src: image.src,
        alt: image.title,
        width: image.width,
        height: image.height,
        mediaType: "image",
      },
    });
  } else if (gif) {
    const dimensions = getGifDimensions(gif.width, gif.height);

    content.push({
      type: "image",
      attrs: {
        src: gif.src,
        alt: gif.title,
        mediaType: "gif",
        ...(dimensions ?? {}),
      },
    });
  }

  return {
    type: "doc",
    content,
  };
}
