"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createMarketAsset(formData: FormData) {
  const file = formData.get("logo") as File;
  const symbol = formData.get("symbol") as string;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const lastPrice = parseFloat((formData.get("lastPrice") as string) || "0");
  const change = parseFloat((formData.get("change") as string) || "0");
  const changePercent = parseFloat(
    (formData.get("changePercent") as string) || "0",
  );
  const high = parseFloat((formData.get("high") as string) || "0");
  const low = parseFloat((formData.get("low") as string) || "0");
  const volume = (formData.get("volume") as string) || "0";

  if (!file || file.size === 0) {
    throw new Error("Logo image file is required.");
  }

  // 1. Upload file to Vercel Blob Storage
  const blob = await put(`logos/${symbol.toLowerCase()}-${file.name}`, file, {
    access: "public",
  });

  // 2. Create record in Prisma Database
  const asset = await prisma.marketAsset.create({
    data: {
      symbol,
      name,
      category,
      logoUrl: blob.url,
      lastPrice,
      change,
      changePercent,
      high,
      low,
      volume,
    },
  });

  revalidatePath("/");
  return asset;
}
