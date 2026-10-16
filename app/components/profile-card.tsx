"use client";

import Link from "next/link";

import { useEffect, useState, type ReactElement } from "react";

import { Ban, RotateCcw } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  getUserProfileCard,
  type UserProfileCardData,
} from "@/app/actions/profile";

import { resolveLanguage } from "@/lib/data/languages";

import { HISTORY_LABELS, PROFILE_CARD_LABELS } from "@/lib/data/translations";
import { BanUserDialog } from "./ban-user-dialog";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface ProfileUser {
  id: string;
  name: string;
  image: string | null;
  isBanned?: boolean;
}

interface ProfileCardProps {
  userId: string;
  name?: string | null;
  image?: string | null;
  currentUserId?: string | null;
  language?: string | null;

  isAdmin?: boolean;
  onBanRequest?: (target: ProfileUser) => void;
}

interface UserProfileTriggerProps {
  target: ProfileUser;

  currentUserId?: string;
  language?: string | null;

  children: ReactElement;

  open?: boolean;
  onOpenChange?: (open: boolean) => void;

  isAdmin?: boolean;
  onBanRequest?: (target: ProfileUser) => void;
}

// -----------------------------------------------------------------------------
// CACHE
// Follow status belongs to the viewer, so include their ID in the key.
// -----------------------------------------------------------------------------

const PROFILE_CACHE_TIME = 30 * 1000;
const MAX_CACHE_ENTRIES = 100;

interface ProfileCacheEntry {
  data: UserProfileCardData;
  fetchedAt: number;
}

const profileCache = new Map<string, ProfileCacheEntry>();

function getCacheKey(userId: string, viewerId: string | null) {
  return JSON.stringify([userId, viewerId]);
}

function saveCache(key: string, data: UserProfileCardData, fetchedAt: number) {
  profileCache.delete(key);

  profileCache.set(key, {
    data,
    fetchedAt,
  });

  while (profileCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = profileCache.keys().next().value;

    if (oldestKey === undefined) {
      break;
    }

    profileCache.delete(oldestKey);
  }
}

// -----------------------------------------------------------------------------
// TIER
// -----------------------------------------------------------------------------

const TIER_NAMES: Record<UserProfileCardData["tier"], string> = {
  UNRANKED: "Unranked",
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
};

const TIER_CLASSES: Record<UserProfileCardData["tier"], string> = {
  UNRANKED:
    "border-zinc-100/60 bg-zinc-100 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400",

  BRONZE:
    "border-orange-700/20 bg-orange-700/10 text-orange-700 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-400",

  SILVER:
    "border-zinc-400/30 bg-zinc-400/10 text-zinc-600 dark:border-zinc-100/20 dark:bg-zinc-100/10 dark:text-zinc-100",

  GOLD: "border-amber-600/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-400",

  PLATINUM:
    "border-teal-600/20 bg-teal-500/10 text-teal-700 dark:border-teal-400/20 dark:bg-teal-400/10 dark:text-teal-400",

  DIAMOND:
    "border-sky-600/20 bg-sky-500/10 text-sky-700 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-400",
};

// -----------------------------------------------------------------------------
// PROFILE TRIGGER / POPOVER
// -----------------------------------------------------------------------------

export function UserProfileTrigger({
  target,
  currentUserId,
  language,
  children,
  open,
  onOpenChange,
  isAdmin = false,
  onBanRequest,
}: UserProfileTriggerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<ProfileUser | null>(null);

  const profileOpen = open ?? internalOpen;

  function handleOpenChange(nextOpen: boolean) {
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  }

  function handleBanRequest(selectedUser: ProfileUser) {
    handleOpenChange(false);

    if (onBanRequest) {
      onBanRequest(selectedUser);
      return;
    }

    setBanTarget(selectedUser);
  }

  return (
    <>
      <Popover modal={false} open={profileOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger render={children} />

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={8}
          className="
            w-80 max-w-[calc(100vw-2rem)]
            overflow-hidden rounded-xl p-0
          "
        >
          <ProfileCard
            userId={target.id}
            name={target.name}
            image={target.image}
            currentUserId={currentUserId}
            language={language}
            isAdmin={isAdmin}
            onBanRequest={handleBanRequest}
          />
        </PopoverContent>
      </Popover>

      {banTarget && (
        <BanUserDialog
          key={banTarget.id}
          target={banTarget}
          onClose={() => {
            profileCache.clear();
            setBanTarget(null);
          }}
        />
      )}
    </>
  );
}

// -----------------------------------------------------------------------------
// PROFILE CARD
// -----------------------------------------------------------------------------

export function ProfileCard(props: ProfileCardProps) {
  return (
    <ProfileCardContent
      key={getCacheKey(props.userId, props.currentUserId ?? null)}
      {...props}
    />
  );
}

function ProfileCardContent({
  userId,
  name: initialName,
  image: initialImage,
  currentUserId,
  language: languageProp,
  isAdmin = false,
  onBanRequest,
}: ProfileCardProps) {
  const language = resolveLanguage(languageProp);

  const labels = PROFILE_CARD_LABELS[language];
  const commonLabels = HISTORY_LABELS[language];

  const cacheKey = getCacheKey(userId, currentUserId ?? null);

  const [initialCache] = useState(() => profileCache.get(cacheKey));

  const [profile, setProfile] = useState<UserProfileCardData | null>(
    () => initialCache?.data ?? null,
  );

  const [loading, setLoading] = useState(!initialCache);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const cached = profileCache.get(cacheKey);

    setLoadFailed(false);

    if (cached) {
      setProfile(cached.data);
      setLoading(false);
    } else {
      setLoading(true);
    }

    const isFresh =
      cached !== undefined &&
      Date.now() - cached.fetchedAt < PROFILE_CACHE_TIME;

    if (isFresh && retryKey === 0) {
      return () => {
        cancelled = true;
      };
    }

    async function loadProfile() {
      try {
        const result = await getUserProfileCard(userId);

        if (cancelled) {
          return;
        }

        // Use the authenticated viewer returned by the server.
        const actualKey = getCacheKey(userId, result.viewerId);

        saveCache(actualKey, result, Date.now());
        setProfile(result);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load profile card:", error);
          setLoadFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [userId, cacheKey, retryKey]);

  // ---------------------------------------------------------------------------
  // DISPLAY
  // ---------------------------------------------------------------------------

  const displayName =
    (profile ? profile.name : initialName)?.trim() || commonLabels.user;

  const displayImage = profile ? profile.image : initialImage;

  const isMe = profile
    ? profile.viewerId === profile.id
    : currentUserId === userId;

  const canModerate = isAdmin && !isMe;
  const isBanned = profile?.status === "BANNED";

  return (
    <div className="rounded-xl p-4 text-zinc-800 dark:bg-black dark:text-zinc-200">
      {/* Image / name / tier */}
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-12 shrink-0">
          <AvatarImage
            src={displayImage ?? undefined}
            alt={displayName}
            className="object-cover"
          />

          <AvatarFallback className="bg-olive-500 text-xl font-normal text-white">
            {Array.from(displayName)[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p title={displayName} className="truncate text-[15px] font-semibold">
            {displayName}
          </p>

          <span
            aria-hidden={!profile}
            className={`
              mt-1 inline-flex items-center
              rounded-full border px-2 py-0.5
              text-[11px] font-medium
              ${profile ? TIER_CLASSES[profile.tier] : "invisible"}
            `}
          >
            {profile ? TIER_NAMES[profile.tier] : TIER_NAMES.UNRANKED}
          </span>
        </div>
      </div>

      {/* Initial loading */}
      {loading && !profile && (
        <div
          role="status"
          className="flex min-h-24 items-center justify-center"
        >
          <div
            aria-hidden="true"
            className="
              size-5 animate-spin rounded-full
              border-2 border-zinc-200 border-t-zinc-700
              dark:border-zinc-700 dark:border-t-zinc-200
            "
          />

          <span className="sr-only">{commonLabels.loading}</span>
        </div>
      )}

      {/* Watchlist */}
      {profile && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-normal text-zinc-400 dark:text-zinc-500">
            {labels.interested_markets}
          </p>

          {profile.watchlist.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.watchlist.map((market) => (
                <Link
                  key={market.symbol}
                  href={`/market/${encodeURIComponent(market.symbol)}`}
                  title={market.name}
                  className="
                    inline-flex min-w-0 max-w-full items-center
                    rounded-full border border-zinc-200
                    px-2.5 py-1 text-[11px] font-medium
                    text-zinc-600 transition-colors
                    hover:border-zinc-100 hover:bg-zinc-100
                    hover:text-zinc-900
                    focus-visible:outline-none
                    focus-visible:ring-2 focus-visible:ring-zinc-400
                    dark:border-zinc-700 dark:text-zinc-100
                    dark:hover:border-zinc-600 dark:hover:bg-zinc-800
                    dark:hover:text-zinc-100
                  "
                >
                  <span className="truncate">{market.name}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500">
              {labels.no_markets}
            </p>
          )}
        </div>
      )}

      {/* Status message */}
      {profile?.statusMessage && (
        <p
          className="
            mt-3 whitespace-pre-wrap wrap-break-word px-1
            text-[14px] text-zinc-600 dark:text-zinc-400
          "
        >
          {profile.statusMessage}
        </p>
      )}

      {/* Load error / retry */}
      {loadFailed && (
        <div role="alert" className="mt-4 text-center">
          <p className="text-xs text-rose-500">{commonLabels.load_failed}</p>

          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            disabled={loading}
            className="
              mt-2 inline-flex cursor-pointer items-center gap-1.5
              text-xs text-zinc-500 underline
              hover:text-zinc-900
              disabled:cursor-default disabled:opacity-50
              dark:text-zinc-400 dark:hover:text-zinc-100
            "
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            {commonLabels.retry}
          </button>
        </div>
      )}

      {/* Admin moderation */}
      {canModerate && (
        <div className="-mx-4 -mb-4 mt-4 border-t border-border">
          <button
            type="button"
            disabled={!onBanRequest || loading || loadFailed || !profile}
            onClick={() => {
              if (!profile || loadFailed) return;

              onBanRequest?.({
                id: profile.id,
                name: displayName,
                image: displayImage ?? null,
                isBanned,
              });
            }}
            className={`
        flex min-h-11 w-full cursor-pointer
        items-center justify-center gap-2
        rounded-b-xl px-3 py-2
        text-sm font-medium transition-colors
        focus-visible:outline-none
        focus-visible:ring-2 focus-visible:ring-inset
        disabled:cursor-not-allowed disabled:opacity-50
        ${
          isBanned
            ? `
              text-emerald-600 hover:bg-emerald-50
              focus-visible:ring-emerald-400
              dark:text-emerald-400
              dark:hover:bg-emerald-950/40
            `
            : `
              text-red-600 hover:bg-red-50
              focus-visible:ring-red-400
              dark:text-red-400 dark:hover:bg-red-950/40
            `
        }
      `}
          >
            {isBanned ? (
              <RotateCcw className="size-4" aria-hidden="true" />
            ) : (
              <Ban className="size-4" aria-hidden="true" />
            )}

            {isBanned ? "Unban user" : "Ban user"}
          </button>
        </div>
      )}
    </div>
  );
}
