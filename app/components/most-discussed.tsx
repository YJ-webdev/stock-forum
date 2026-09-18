import { Heart, MessageCircle } from "lucide-react";
import Link from "next/link";

const MOST_DISCUSSION = [
  {
    id: "1",
    symbol: "^GSPC",
    displaySymbol: "SPX",
    comment:
      "Rate cuts are already priced in. I don't see much upside from here.",
    likes: 128,
    replies: 34,
  },
  {
    id: "2",
    symbol: "^N225",
    displaySymbol: "N225",
    comment: "Foreign buying has been incredibly strong this week.",
    likes: 94,
    replies: 21,
  },
  {
    id: "3",
    symbol: "BTC-USD",
    displaySymbol: "BTC",
    comment: "This breakout looks much healthier than the previous one.",
    likes: 76,
    replies: 18,
  },
  {
    id: "4",
    symbol: "GC=F",
    displaySymbol: "GOLD",
    comment:
      "Gold holding this level despite the dollar strength is interesting.",
    likes: 61,
    replies: 12,
  },
];

export function MostDiscussed() {
  return (
    <div className="flex flex-col gap-2.5">
      {MOST_DISCUSSION.map((item) => (
        <Link
          key={item.id}
          href={`/market?symbol=${encodeURIComponent(item.symbol)}`}
          className="
              block rounded-xl
              bg-zinc-100/70 px-3.5 py-3.5
              transition-colors
              hover:bg-zinc-200/70
              dark:bg-zinc-800/45
              dark:hover:bg-zinc-800/75
            "
        >
          {/* Asset */}
          <div className="mb-2">
            <span
              className="
    inline-flex rounded-full
    bg-zinc-200/80 px-2.5 py-1
    text-[12px] font-medium text-zinc-600
    dark:bg-zinc-700/60 dark:text-zinc-300
  "
            >
              {item.displaySymbol}
            </span>
          </div>

          {/* Comment */}
          <p
            className="
                line-clamp-2
                text-[15px] font-medium leading-[21px]
                text-zinc-900 dark:text-zinc-200
              "
          >
            {item.comment}
          </p>

          {/* Stats */}
          <div
            className="
                mt-3 flex items-center gap-3
                text-[12px] text-zinc-500
                dark:text-zinc-500
              "
          >
            <span className="flex items-center gap-1">
              <Heart className="h-3.5 w-3.5" />
              {item.likes}
            </span>

            <span className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              {item.replies}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
