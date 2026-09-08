"use server";

import { signIn, signOut } from "@/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma"; // Add this import

export async function handleSignIn(provider: "google" | "github") {
  await signIn(provider);
}

export async function handleSignOut() {
  await signOut({ redirect: false });
}

export async function registerUser(email: string, name: string) {
  const headerList = await headers();
  // Reads Vercel header or Cloudflare header as fallback
  const countryCode =
    headerList.get("x-vercel-ip-country") ||
    headerList.get("cf-ipcountry") ||
    "US";

  return await prisma.user.create({
    data: {
      name,
      email,
      country: countryCode,
    },
  });
}
