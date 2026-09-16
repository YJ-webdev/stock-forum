"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

interface UpdateAccountPreferencesInput {
  nationality: string;
  language: string;
}

export async function updateAccountPreferences({
  nationality,
  language,
}: UpdateAccountPreferencesInput) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("You must be logged in.");
  }

  const cleanNationality = nationality.trim();
  const cleanLanguage = language.trim();

  if (!cleanNationality) {
    throw new Error("Nationality is required.");
  }

  if (!cleanLanguage) {
    throw new Error("Language is required.");
  }

  const user = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      nationality: cleanNationality,
      language: cleanLanguage,
    },
    select: {
      id: true,
      nationality: true,
      language: true,
    },
  });

  return user;
}
