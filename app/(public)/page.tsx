"use client";

import { BullBearVoteCard } from "../components/bull-bear-vote-card";
import { UserPreferenceMarket } from "../components/user-preference-market";
import { VoteSentiment } from "../components/vote-sentiment";
import { useCurrentUser } from "../context/user-context";

export default function Home() {
  const user = useCurrentUser();

  return (
    <div className="flex flex-col items-center font-sans">
      <main className="relative flex w-full flex-1 flex-col items-start">
        <div className="w-full px-4 space-y-4 pt-4">
          <p className="mb-3 text-xs font-normal tracking-wider text-muted-foreground/50">
            My markets
          </p>
          {/* {user && <UserPreferenceMarket />} */}
          <BullBearVoteCard />
          <VoteSentiment />
        </div>
      </main>
    </div>
  );
}
