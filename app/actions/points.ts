"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const STARTING_POINTS = 10000;

export async function getMyPointBalance() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const balance = await prisma.pointBalance.upsert({
    where: {
      userId: session.user.id,
    },
    update: {},
    create: {
      userId: session.user.id,
      points: STARTING_POINTS,
    },
    select: {
      points: true,
    },
  });

  return balance.points;
}
