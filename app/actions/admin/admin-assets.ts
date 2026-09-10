"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma/enums";

async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Admin privileges required.");
  }
}

export async function createMarketAssetAction(formData: FormData) {
  await assertAdmin();

  const symbol = (formData.get("symbol") as string).toUpperCase().trim();
  const name = (formData.get("name") as string).trim();
  const category = (formData.get("category") as string).trim();
  const logoFile = formData.get("logo") as File;

  if (!logoFile || logoFile.size === 0) {
    throw new Error("A logo image file is required.");
  }

  // 1. Upload logo image to Vercel Blob
  const blob = await put(
    `logos/${symbol.toLowerCase()}-${logoFile.name}`,
    logoFile,
    {
      access: "public",
    },
  );

  // 2. Save only metadata to Database (Prices will be pulled via API/SSE)
  await prisma.marketAsset.create({
    data: {
      symbol,
      name,
      category,
      logoUrl: blob.url,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteMarketAssetAction(id: string, logoUrl: string) {
  await assertAdmin();

  await prisma.marketAsset.delete({ where: { id } });

  if (logoUrl) {
    try {
      await del(logoUrl);
    } catch (_err) {
      console.error("Failed to delete blob storage image:", _err);
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
}
