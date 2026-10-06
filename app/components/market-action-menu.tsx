"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent,
} from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { EllipsisVertical, Link, Pin, PinOff } from "lucide-react";
import { PiShareFat } from "react-icons/pi";
import { toast } from "sonner";

import { useCurrentUser } from "@/app/context/user-context";
import { toggleMarketWatchlist } from "@/app/actions/watchlist";

type SharePlatform =
  | "X"
  | "Facebook"
  | "Reddit"
  | "LinkedIn"
  | "WhatsApp"
  | "Telegram";

const SHARE_PLATFORMS: SharePlatform[] = [
  "X",
  "Facebook",
  "Reddit",
  "LinkedIn",
  "WhatsApp",
  "Telegram",
];

interface MarketActionsMenuProps {
  symbol: string;
  marketName: string;
  initialIsWatchlist: boolean;
}

export const MarketActionsMenu = ({
  symbol,
  marketName,
  initialIsWatchlist,
}: MarketActionsMenuProps) => {
  const user = useCurrentUser();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isWatchlist, setIsWatchlist] = useState(initialIsWatchlist);

  const [isWatchlistPending, startWatchlistTransition] = useTransition();

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchlistRequestRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Hover menu
  // ---------------------------------------------------------------------------

  const cancelMenuClose = () => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMenuEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;

    cancelMenuClose();
    setMenuOpen(true);
  };

  const handleMenuLeave = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;

    cancelMenuClose();

    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      closeTimerRef.current = null;
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Watchlist
  // ---------------------------------------------------------------------------

  const handleToggleWatchlist = () => {
    if (!user) {
      toast.error("Log in to manage your watchlist.");
      return;
    }

    if (watchlistRequestRef.current) return;

    watchlistRequestRef.current = true;

    const previousIsWatchlist = isWatchlist;
    const nextIsWatchlist = !previousIsWatchlist;

    setIsWatchlist(nextIsWatchlist);

    const toastId = toast.success(
      nextIsWatchlist
        ? `${marketName} added to your watchlist.`
        : `${marketName} removed from your watchlist.`,
    );

    startWatchlistTransition(async () => {
      try {
        // The server checks the limit when adding.
        const result = await toggleMarketWatchlist(symbol);

        setIsWatchlist(result.isWatchlist);

        toast.success(
          result.isWatchlist
            ? `${marketName} added to your watchlist.`
            : `${marketName} removed from your watchlist.`,
          { id: toastId },
        );
      } catch (error) {
        setIsWatchlist(previousIsWatchlist);

        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to update watchlist.",
          { id: toastId },
        );
      } finally {
        watchlistRequestRef.current = false;
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Share
  // ---------------------------------------------------------------------------

  const getShareUrl = () =>
    new URL(`/${encodeURIComponent(symbol)}`, window.location.origin).href;

  const handleShare = (platform: SharePlatform) => {
    const pageUrl = getShareUrl();
    const title = `${marketName} | BullBearVote`;

    const url = encodeURIComponent(pageUrl);
    const text = encodeURIComponent(title);
    const message = encodeURIComponent(`${title}\n${pageUrl}`);

    const shareUrls: Record<Exclude<SharePlatform, "KakaoTalk">, string> = {
      X: `https://twitter.com/intent/tweet?url=${url}&text=${text}`,
      Facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      Reddit: `https://www.reddit.com/submit?url=${url}&title=${text}`,
      LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      WhatsApp: `https://wa.me/?text=${message}`,
      Telegram: `https://t.me/share/url?url=${url}&text=${text}`,
    };

    window.open(shareUrls[platform], "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());

      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy the link.");
    }
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <>
      <DropdownMenu
        open={menuOpen}
        onOpenChange={(open) => {
          cancelMenuClose();
          setMenuOpen(open);
        }}
        modal={false}
      >
        <DropdownMenuTrigger aria-label={`Options for ${marketName}`}>
          <EllipsisVertical
            className="h-5 w-5 cursor-pointer text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-300"
            strokeWidth={1.5}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-fit min-w-0">
          <DropdownMenuGroup>
            <DropdownMenuItem
              disabled={isWatchlistPending}
              onClick={handleToggleWatchlist}
              className="cursor-pointer whitespace-nowrap tracking-wide"
            >
              {isWatchlist ? (
                <PinOff className="h-4 w-4" strokeWidth={1.5} />
              ) : (
                <Pin className="h-4 w-4" strokeWidth={1.5} />
              )}

              {isWatchlistPending
                ? "Updating..."
                : isWatchlist
                  ? "Remove from my watchlist"
                  : "Add to my watchlist"}
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="cursor-pointer gap-2">
                <PiShareFat className="h-4 w-4" />
                Share
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent
                className="min-w-40"
                onPointerEnter={handleMenuEnter}
                onPointerLeave={handleMenuLeave}
              >
                <DropdownMenuGroup>
                  {SHARE_PLATFORMS.map((platform) => (
                    <DropdownMenuItem
                      key={platform}
                      className="cursor-pointer"
                      onClick={() => handleShare(platform)}
                    >
                      {platform}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuItem
              onClick={handleCopyLink}
              className="cursor-pointer"
            >
              <Link className="h-4 w-4" strokeWidth={1.5} />
              Copy link
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
