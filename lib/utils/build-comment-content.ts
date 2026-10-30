import type { JSONContent } from "@tiptap/react";

interface CommentGif {
  src: string;
  title: string;
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
    content.push({
      type: "image",
      attrs: {
        src: gif.src,
        alt: gif.title,
      },
    });
  }

  return {
    type: "doc",
    content,
  };
}
