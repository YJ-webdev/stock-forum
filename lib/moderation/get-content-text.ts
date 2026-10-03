type TipTapNode = {
  type?: string;
  text?: string;
  content?: TipTapNode[];
};

function extractTextFromTipTap(node: TipTapNode): string {
  if (node.type === "text") {
    return node.text ?? "";
  }

  if (!Array.isArray(node.content)) {
    return "";
  }

  return node.content.map(extractTextFromTipTap).filter(Boolean).join(" ");
}

export function getContentText(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!content || typeof content !== "object") {
    return "";
  }

  return extractTextFromTipTap(content as TipTapNode)
    .replace(/\s+/g, " ")
    .trim();
}
