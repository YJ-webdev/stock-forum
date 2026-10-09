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
}

export async function updateAccountPreferences({
  name,
  image,
  nationality,
  language,
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

  const updatedUser = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      name: trimmedName,
      image: image ?? null,
      nationality,
      language,
    },
    select: {
      id: true,
      name: true,
      image: true,
      nationality: true,
      language: true,
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
