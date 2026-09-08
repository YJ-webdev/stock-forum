"use server";

import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Role } from "@/generated/prisma/enums";

// Helper function to assert admin rights on every action execution
async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    throw new Error("Unauthorized: Admin privileges required.");
  }
  return session;
}

export async function createMarketAssetAction(formData: FormData) {
  await assertAdmin();

  const symbol = (formData.get("symbol") as string).toUpperCase().trim();
  const name = (formData.get("name") as string).trim();
  const category = (formData.get("category") as string).trim();
  const lastPrice = parseFloat((formData.get("lastPrice") as string) || "0");
  const changePercent = parseFloat(
    (formData.get("changePercent") as string) || "0",
  );
  const high = parseFloat((formData.get("high") as string) || "0");
  const low = parseFloat((formData.get("low") as string) || "0");
  const volume = (formData.get("volume") as string) || "0M";
  const logoFile = formData.get("logo") as File;

  if (!logoFile || logoFile.size === 0) {
    throw new Error("A logo image file is required.");
  }

  // 1. Upload asset logo directly to Vercel Blob Storage
  const blob = await put(
    `logos/${symbol.toLowerCase()}-${logoFile.name}`,
    logoFile,
    {
      access: "public",
    },
  );

  // 2. Create database record via Prisma
  await prisma.marketAsset.create({
    data: {
      symbol,
      name,
      category,
      lastPrice,
      change: (lastPrice * changePercent) / 100,
      changePercent,
      high,
      low,
      volume,
      logoUrl: blob.url,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin");
}

export async function deleteMarketAssetAction(id: string, logoUrl: string) {
  await assertAdmin();

  // 1. Remove database entry
  await prisma.marketAsset.delete({
    where: { id },
  });

  // 2. Clean up logo asset from Vercel Blob Storage
  if (logoUrl) {
    try {
      await del(logoUrl);
    } catch (e) {
      console.warn("Failed to delete blob image from storage:", e);
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
}
