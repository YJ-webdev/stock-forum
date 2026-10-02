import { UserPreferenceMarket } from "../components/user-preference-market";
import { VoteSentiment } from "../components/vote-sentiment";

export default async function Home() {
  return (
    <div className="flex flex-col items-center font-sans">
      <main className="relative flex w-full flex-1 flex-col items-start ">
        <div className="w-full pt-4 space-y-4">
          <UserPreferenceMarket />
          <VoteSentiment />
        </div>
      </main>
    </div>
  );
}
