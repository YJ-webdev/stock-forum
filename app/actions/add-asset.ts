"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createMarketAsset(formData: FormData) {
  const symbol = (formData.get("symbol") as string).toUpperCase();
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const lastPrice = parseFloat((formData.get("lastPrice") as string) || "0");
  const changePercent = parseFloat(
    (formData.get("changePercent") as string) || "0",
  );
  const high = parseFloat((formData.get("high") as string) || "0");
  const low = parseFloat((formData.get("low") as string) || "0");
  const volume = (formData.get("volume") as string) || "0M";
  const logoFile = formData.get("logo") as File;

  if (!logoFile || logoFile.size === 0) {
    throw new Error("Logo image file is required");
  }

  // 1. Upload logo to Vercel Blob Storage
  const blob = await put(
    `logos/${symbol.toLowerCase()}-${logoFile.name}`,
    logoFile,
    {
      access: "public",
    },
  );

  // 2. Create asset in PostgreSQL database via Prisma
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
      logoUrl: blob.url, // Store the public Vercel Blob URL
    },
  });

  // 3. Revalidate paths to update live UI
  revalidatePath("/");
  revalidatePath("/admin");
}
