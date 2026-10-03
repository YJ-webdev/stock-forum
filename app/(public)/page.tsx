"use client";

import { UserPreferenceMarket } from "../components/user-preference-market";
import { VoteSentiment } from "../components/vote-sentiment";
import { useCurrentUser } from "../context/user-context";

export default function Home() {
  const user = useCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col items-center font-sans">
      <main className="relative flex w-full flex-1 flex-col items-start">
        <div className="w-full space-y-4 pt-4">
          <UserPreferenceMarket />
          <VoteSentiment />
        </div>
      </main>
    </div>
  );
}
