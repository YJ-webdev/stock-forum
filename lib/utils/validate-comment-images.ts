import "server-only";

import { head } from "@vercel/blob";
import type { JSONContent } from "@tiptap/react";

const MAX_IMAGE_DIMENSION = 1600;
const MAX_NODES = 2000;
const MAX_DEPTH = 20;

interface ValidateCommentImagesOptions {
  content: JSONContent | null | undefined;
  uploaderId: string;
  previousContent?: JSONContent | null;
}

function collectMediaNodes(
  content: JSONContent | null | undefined,
): JSONContent[] {
  if (!content) return [];

  const images: JSONContent[] = [];
  const stack = [{ node: content, depth: 0 }];

  let visited = 0;

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) break;

    const { node, depth } = current;

    visited += 1;

    if (
      visited > MAX_NODES ||
      depth > MAX_DEPTH ||
      !node ||
      typeof node !== "object"
    ) {
      throw new Error("Invalid comment content.");
    }

    if (node.type === "image") {
      images.push(node);
    }

    if (node.content !== undefined) {
      if (!Array.isArray(node.content)) {
        throw new Error("Invalid comment content.");
      }

      for (const child of node.content) {
        stack.push({
          node: child,
          depth: depth + 1,
        });
      }
    }
  }

  return images;
}

function getPublicOrigin(): string {
  const value = process.env.BLOB_PUBLIC_ORIGIN;

  if (!value) {
    throw new Error("Image storage is not configured.");
  }

  const url = new URL(value);

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid image storage configuration.");
  }

  return url.origin;
}

function parseMediaUrl(value: unknown): URL {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Invalid image URL.");
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid image URL.");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Invalid image URL.");
  }

  return url;
}

function isValidDimension(value: unknown): boolean {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAX_IMAGE_DIMENSION
  );
}

export async function validateCommentImages({
  content,
  uploaderId,
  previousContent,
}: ValidateCommentImagesOptions): Promise<void> {
  const mediaNodes = collectMediaNodes(content);

  if (mediaNodes.length > 1) {
    throw new Error("Attach only one image or GIF.");
  }

  if (mediaNodes.length === 0) return;

  const node = mediaNodes[0];
  const url = parseMediaUrl(node.attrs?.src);
  const mediaType = node.attrs?.mediaType;

  if (mediaType !== undefined && mediaType !== "image" && mediaType !== "gif") {
    throw new Error("Invalid media type.");
  }

  // Also recognize uploaded paths if a client removes mediaType.
  const looksLikeUpload =
    mediaType === "image" || url.pathname.startsWith("/comment-images/");

  if (!looksLikeUpload) {
    // Preserve the existing GIF path.
    // This does not validate the Klipy provider itself.
    return;
  }

  if (mediaType !== "image") {
    throw new Error("Invalid uploaded image type.");
  }

  const origin = getPublicOrigin();

  if (url.origin !== origin || url.search || url.hash) {
    throw new Error("Invalid uploaded image URL.");
  }

  const pathMatch = url.pathname.match(
    /^\/comment-images\/([^/]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.webp$/i,
  );

  if (!pathMatch) {
    throw new Error("Invalid uploaded image path.");
  }

  const previousImages = collectMediaNodes(previousContent);

  const isExistingAttachment = previousImages.some(
    (previous) =>
      previous.attrs?.mediaType === "image" && previous.attrs?.src === url.href,
  );

  // Existing attachments may have been uploaded by an admin
  // when publishing as a bot.
  if (!isExistingAttachment && pathMatch[1] !== uploaderId) {
    throw new Error("You can only attach images you uploaded.");
  }

  if (
    !isValidDimension(node.attrs?.width) ||
    !isValidDimension(node.attrs?.height)
  ) {
    throw new Error("Invalid image dimensions.");
  }

  let blob: Awaited<ReturnType<typeof head>>;

  try {
    blob = await head(url.href);
  } catch {
    throw new Error(
      "The uploaded image could not be verified. Please try again.",
    );
  }

  if (
    blob.url !== url.href ||
    blob.pathname !== url.pathname.slice(1) ||
    blob.contentType !== "image/webp" ||
    blob.size <= 0
  ) {
    throw new Error("Invalid uploaded image.");
  }
}
