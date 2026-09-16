// lib/utils/post-content.ts

type PostContentNode = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: PostContentNode[];
};

export function getFirstImage(
  content: PostContentNode | null | undefined,
): string | null {
  if (!content) return null;

  if (
    content.type === "image" &&
    content.attrs &&
    typeof content.attrs["src"] === "string"
  ) {
    return content.attrs["src"];
  }

  if (Array.isArray(content.content)) {
    for (const node of content.content) {
      const src = getFirstImage(node);

      if (src) {
        return src;
      }
    }
  }

  return null;
}
