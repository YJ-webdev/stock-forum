"use server";

import { signIn, signOut } from "@/auth";

export async function handleSignIn(provider: "google" | "github") {
  await signIn(provider);
}

export async function handleSignOut() {
  console.log("handleSignOut called"); // check your terminal, not browser console
  await signOut({ redirect: false });
  console.log("signOut finished");
}
