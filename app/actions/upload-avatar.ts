"use server";

import { del, put } from "@vercel/blob";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function isVercelBlobUrl(url: string | null | undefined) {
  if (!url) {
    return false;
  }

  try {
    const hostname = new URL(url).hostname;

    return (
      hostname.endsWith(".public.blob.vercel-storage.com") ||
      hostname.endsWith(".blob.vercel-storage.com")
    );
  } catch {
    return false;
  }
}

export async function uploadAvatar(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
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
      image: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  const blob = await put(
    `avatars/${session.user.id}/${crypto.randomUUID()}.${extension}`,
    file,
    {
      access: "public",
      addRandomSuffix: false,
    },
  );

  // Only remove avatars that belong to our Blob storage.
  // Never try to delete the original Google profile image.
  if (user.image && isVercelBlobUrl(user.image) && user.image !== blob.url) {
    try {
      await del(user.image);
    } catch (error) {
      console.error("Failed to delete previous avatar:", error);
    }
  }

  return {
    url: blob.url,
  };
}
