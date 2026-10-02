import type { JSONContent } from "@tiptap/react";

export function CommentContent({ content }: { content: JSONContent }) {
  return (
    <div
      className="
        mt-0.5
        min-w-0
        space-y-2
        text-[15px]
        leading-6
        text-zinc-900
        wrap-anywhere
        dark:text-zinc-200
      "
    >
      {content.content?.map((node, index) => {
        // ---------------------------------------------------------------------
        // PARAGRAPH
        // ---------------------------------------------------------------------

        if (node.type === "paragraph") {
          if (!node.content?.length) {
            return null;
          }

          return (
            <p key={index} className="min-w-0 whitespace-pre-wrap">
              {node.content.map((child, childIndex) => {
                if (child.type === "hardBreak") {
                  return <br key={childIndex} />;
                }

                if (child.type === "text") {
                  return child.text ?? "";
                }

                return null;
              })}
            </p>
          );
        }

        // ---------------------------------------------------------------------
        // IMAGE / GIF
        // ---------------------------------------------------------------------

        if (node.type === "image" && node.attrs?.src) {
          const src = String(node.attrs.src);
          const alt = String(node.attrs.alt ?? "GIF");

          return (
            <img
              key={index}
              src={src}
              alt={alt}
              className="
                block
                h-auto
                max-h-64
                max-w-56
                rounded-xl
                object-contain
              "
            />
          );
        }

        return null;
      })}
    </div>
  );
}
