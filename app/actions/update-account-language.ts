// app/actions/update-account-language.ts

"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LANGUAGES } from "@/lib/data/languages";

export async function updateAccountLanguage(language: string) {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!LANGUAGES.some((item) => item.value === language)) {
    throw new Error("Invalid language");
  }

  return prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      language,
    },
    select: {
      language: true,
    },
  });
}
