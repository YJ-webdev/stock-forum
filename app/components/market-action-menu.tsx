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

import { resolveLanguage } from "@/lib/data/languages";
import { MARKET_ACTION_LABELS } from "@/lib/data/translations";

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

  const language = resolveLanguage(user?.language);
  const labels = MARKET_ACTION_LABELS[language];

  const [menuOpen, setMenuOpen] = useState(false);
  const [isWatchlist, setIsWatchlist] = useState(initialIsWatchlist);

  const [isWatchlistPending, startWatchlistTransition] = useTransition();

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchlistRequestRef = useRef(false);

  const formatMarketLabel = (text: string) =>
    text.replace("{market}", marketName);

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
      toast.error(labels.login_required);
      return;
    }

    if (watchlistRequestRef.current) return;

    watchlistRequestRef.current = true;

    const previousIsWatchlist = isWatchlist;
    const nextIsWatchlist = !previousIsWatchlist;

    setIsWatchlist(nextIsWatchlist);

    const toastId = toast.success(
      formatMarketLabel(nextIsWatchlist ? labels.added : labels.removed),
    );

    startWatchlistTransition(async () => {
      try {
        const result = await toggleMarketWatchlist(symbol);

        setIsWatchlist(result.isWatchlist);

        toast.success(
          formatMarketLabel(result.isWatchlist ? labels.added : labels.removed),
          { id: toastId },
        );
      } catch {
        setIsWatchlist(previousIsWatchlist);

        toast.error(labels.update_failed, { id: toastId });
      } finally {
        watchlistRequestRef.current = false;
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Share
  // ---------------------------------------------------------------------------

  const getShareUrl = () =>
    new URL(`/market/${encodeURIComponent(symbol)}`, window.location.origin)
      .href;

  const handleShare = (platform: SharePlatform) => {
    const pageUrl = getShareUrl();
    const title = `${marketName} | BullBearVote`;

    const url = encodeURIComponent(pageUrl);
    const text = encodeURIComponent(title);
    const message = encodeURIComponent(`${title}\n${pageUrl}`);

    const shareUrls: Record<SharePlatform, string> = {
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

      toast.success(labels.link_copied);
    } catch {
      toast.error(labels.copy_failed);
    }
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  return (
    <DropdownMenu
      open={menuOpen}
      onOpenChange={(open) => {
        cancelMenuClose();
        setMenuOpen(open);
      }}
      modal={false}
    >
      <DropdownMenuTrigger
        aria-label={formatMarketLabel(labels.options)}
        className="cursor-pointer"
      >
        <EllipsisVertical
          aria-hidden="true"
          className="
            h-5 w-5 text-zinc-500
            hover:text-zinc-800
            dark:text-zinc-400 dark:hover:text-zinc-300
          "
          strokeWidth={1.5}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-fit min-w-0">
        <DropdownMenuGroup>
          <DropdownMenuItem
            disabled={isWatchlistPending}
            onClick={handleToggleWatchlist}
            className="cursor-pointer pr-6 whitespace-nowrap tracking-wide"
          >
            {isWatchlist ? (
              <PinOff
                aria-hidden="true"
                className="h-4 w-4"
                strokeWidth={1.5}
              />
            ) : (
              <Pin aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            )}

            {isWatchlistPending
              ? labels.updating
              : isWatchlist
                ? labels.remove_watchlist
                : labels.add_watchlist}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2">
              <PiShareFat aria-hidden="true" className="h-4 w-4" />
              {labels.share}
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

          <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
            <Link aria-hidden="true" className="h-4 w-4" strokeWidth={1.5} />
            {labels.copy_link}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
