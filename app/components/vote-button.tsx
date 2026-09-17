import { Button } from "@/components/ui/button";
import type { VoteDirection } from "@/app/actions/market-vote";

interface VoteButtonProps {
  voteDirection: VoteDirection;
  selectedVote: VoteDirection | null;
  isPending: boolean;
  isMarketOpen: boolean;
  onClick?: () => void;
}

export function VoteButton({
  voteDirection,
  selectedVote,
  isPending,
  isMarketOpen,
  onClick,
}: VoteButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={isPending || isMarketOpen}
      className={`
        text-[15px] text-white
        ${voteDirection === "BULL" ? "bg-emerald-600 hover:bg-emerald-600" : "bg-rose-700 hover:bg-rose-700"}
        ${isPending || isMarketOpen ? "opacity-50 cursor-default" : ""}
       
        ${selectedVote === null || selectedVote === voteDirection ? "opacity-100" : "opacity-50"}
        ${!isPending && !isMarketOpen && selectedVote !== voteDirection ? "cursor-pointer hover:opacity-100!" : ""}
   
      `}
    >
      {voteDirection === "BULL" ? "Bullish" : "Bearish"}
    </Button>
  );
}
