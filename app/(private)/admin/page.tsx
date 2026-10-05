import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { getAiBriefCountries } from "@/app/actions/ai-country-brief";
import { AiBriefCountryManager } from "@/app/components/ai-brief-country-manager";
import { AiBriefTest } from "./_components/ai-brief-test";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/");
  }

  const countries = await getAiBriefCountries();

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-8">
      <AiBriefCountryManager countries={countries} />

      <AiBriefTest />
    </main>
  );
}
