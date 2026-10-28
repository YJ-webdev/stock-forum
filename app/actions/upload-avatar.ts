"use server";

import { put } from "@vercel/blob";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import sharp from "sharp";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadAvatar(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("No image selected.");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WebP images are allowed.");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Image must be smaller than 5 MB.");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const input = Buffer.from(await file.arrayBuffer());

  let optimized: Buffer;

  try {
    const pipeline = sharp(input);
    const metadata = await pipeline.metadata();

    if (
      !metadata.format ||
      !["jpeg", "png", "webp"].includes(metadata.format)
    ) {
      throw new Error("Unsupported image format.");
    }

    optimized = await pipeline
      .rotate()
      .resize({
        width: 192,
        height: 192,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 80,
        effort: 4,
      })
      .toBuffer();
  } catch (error) {
    console.error("Failed to process avatar:", error);

    throw new Error(
      "Unable to process this image. Please choose another JPG, PNG, or WebP image.",
    );
  }

  const blob = await put(
    `avatars/${user.id}/${crypto.randomUUID()}.webp`,
    optimized,
    {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
    },
  );

  // Profile preferences are saved separately.
  // Keep the previous image until that save succeeds.
  return {
    url: blob.url,
  };
}
