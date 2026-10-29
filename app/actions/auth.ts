"use server";

import { signIn, signOut } from "@/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma"; // Add this import

export async function handleSignIn(
  provider: "google" | "github" | "facebook" | "twitter",
) {
  await signIn(provider);
}

export async function handleSignOut() {
  await signOut({ redirect: false });
}
