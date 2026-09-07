import { auth } from "@/auth"; // or your auth session provider (e.g. Supabase, Clerk, NextAuth)
import LayoutShell from "./components/layout-shell";

export default async function Home() {
  // Fetch session directly on the server
  const session = await auth();

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image, // URL to your Google or GitHub profile avatar
      }
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="relative flex flex-col flex-1 w-full items-start bg-white dark:bg-black">
        <LayoutShell user={user} />
      </main>
    </div>
  );
}
