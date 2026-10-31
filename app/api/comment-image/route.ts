// app/api/comment-image/route.ts

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import sharp from "sharp";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILE_BYTES + 128 * 1024;
const MAX_INPUT_PIXELS = 25_000_000;
const MAX_IMAGE_SIZE = 1600;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return json({ error: "LOGIN_REQUIRED" }, 401);
  }

  // Check the current database state, not only the session.
  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      status: true,
      deletedAt: true,
    },
  });

  if (!user || user.deletedAt) {
    return json({ error: "ACCOUNT_UNAVAILABLE" }, 403);
  }

  if (user.status === "BANNED" || user.status === "MUTED") {
    return json({ error: "CHAT_RESTRICTED" }, 403);
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "INVALID_REQUEST" }, 400);
  }

  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return json({ error: "IMAGE_TOO_LARGE" }, 413);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }

  const files = formData.getAll("file");

  if (files.length !== 1 || !(files[0] instanceof File)) {
    return json({ error: "SELECT_ONE_IMAGE" }, 400);
  }

  const file = files[0];

  if (file.size === 0) {
    return json({ error: "EMPTY_IMAGE" }, 400);
  }

  if (file.size > MAX_FILE_BYTES) {
    return json({ error: "IMAGE_TOO_LARGE" }, 413);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ error: "UNSUPPORTED_IMAGE" }, 415);
  }

  let processed: {
    data: Buffer;
    width: number;
    height: number;
  };

  try {
    const buffer = Buffer.from(await file.arrayBuffer());

    const image = sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: "warning",
    });

    const metadata = await image.metadata();

    // Validate the actual file format as well as its MIME type.
    if (
      !metadata.format ||
      !ALLOWED_FORMATS.has(metadata.format) ||
      !metadata.width ||
      !metadata.height
    ) {
      return json({ error: "UNSUPPORTED_IMAGE" }, 415);
    }

    // Animated media continues to use the existing GIF picker.
    if ((metadata.pages ?? 1) > 1) {
      return json({ error: "ANIMATED_IMAGE_NOT_SUPPORTED" }, 415);
    }

    const { data, info } = await image
      .rotate()
      .resize({
        width: MAX_IMAGE_SIZE,
        height: MAX_IMAGE_SIZE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 85,
        effort: 4,
      })
      .toBuffer({ resolveWithObject: true });

    processed = {
      data,
      width: info.width,
      height: info.height,
    };
  } catch {
    return json({ error: "INVALID_IMAGE" }, 400);
  }

  try {
    const pathname = `comment-images/${session.user.id}/${randomUUID()}.webp`;

    const blob = await put(pathname, processed.data, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    });

    return json({
      image: {
        src: blob.url,
        title: "Image",
        width: processed.width,
        height: processed.height,
        mediaType: "image",
      },
    });
  } catch (error) {
    console.error("Failed to upload comment image:", error);

    return json({ error: "UPLOAD_FAILED" }, 500);
  }
}
