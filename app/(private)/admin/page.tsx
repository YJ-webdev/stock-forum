import { getBotUsers } from "@/app/actions/user-bot";
import { UserBot } from "@/app/components/admin/user-bot";

import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const bots = await getBotUsers();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4">
      <UserBot bots={bots} currentUser={session.user} />
    </main>
  );
}
