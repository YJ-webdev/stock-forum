import { Ellipsis, Heart, MessageCircle, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { SlLike } from "react-icons/sl";

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
    px-2.5 py-1 border border-zinc-400 dark:border-zinc-600
    text-[12px] font-medium text-zinc-600
     dark:text-zinc-300 bg-transparent
  "
            >
              {item.displaySymbol}
            </span>
          </div>

          {/* Comment */}
          <p
            className="
                line-clamp-2
                text-[15px] font-normal leading-normal
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
            <span className="flex items-center gap-1 ml-auto jakarta">
              <ThumbsUp
                className="h-4 w-4 fill-none text-zinc-600 dark:text-muted dark:fill-zinc-300 "
                strokeWidth={1.5}
              />
              {item.likes}
            </span>

            <span className="flex items-center gap-1 jakarta">
              <MessageCircle
                className="h-4 w-4 fill-none text-zinc-600 dark:text-muted dark:fill-zinc-300 "
                strokeWidth={1.5}
              />
              {item.replies}
            </span>
          </div>
        </Link>
      ))}
      <Ellipsis className="mx-auto h-4 w-4 text-zinc-400 dark:text-zinc-600" />
    </div>
  );
}
