"use server";

import { cookies } from "next/headers";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LANGUAGES } from "@/lib/data/languages";

interface UpdateAccountPreferencesInput {
  name: string;
  image?: string | null;
  nationality: string;
  language: string;
  statusMessage?: string | null;
}

export async function updateAccountPreferences({
  name,
  image,
  nationality,
  language,
  statusMessage,
}: UpdateAccountPreferencesInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error("Display name is required.");
  }

  if (trimmedName.length > 30) {
    throw new Error("Display name must be 30 characters or fewer.");
  }

  if (!nationality) {
    throw new Error("Nationality is required.");
  }

  if (!LANGUAGES.some((item) => item.value === language)) {
    throw new Error("Unsupported language.");
  }

  if (
    statusMessage !== undefined &&
    statusMessage !== null &&
    typeof statusMessage !== "string"
  ) {
    throw new Error("Invalid status message.");
  }

  if (typeof statusMessage === "string" && statusMessage.length > 160) {
    throw new Error("Status message must be 160 characters or fewer.");
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      name: trimmedName,
      image: image ?? null,
      nationality,
      language,
      statusMessage,
    },
    select: {
      id: true,
      name: true,
      image: true,
      nationality: true,
      language: true,
      statusMessage: true,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set("site-language", updatedUser.language, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return updatedUser;
}
