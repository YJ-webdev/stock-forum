"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import { useRouter } from "next/navigation";
import { Camera, Globe2, Languages, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";

import { NATIONALITIES } from "@/lib/data/nationalities";
import { LANGUAGES, resolveLanguage } from "@/lib/data/languages";

import {
  ACCOUNT_LABELS,
  PROFILE_STATUS_PLACEHOLDERS,
} from "@/lib/data/translations";

import { updateAccountPreferences } from "@/app/actions/update-account-preferences";
import { updateAccountLanguage } from "@/app/actions/update-account-language";
import { uploadAvatar } from "@/app/actions/upload-avatar";

import { useCurrentUser, useSetCurrentUser } from "@/app/context/user-context";

// -----------------------------------------------------------------------------
// TYPES / CONSTANTS
// -----------------------------------------------------------------------------

interface AccountPanelProps {
  setOnAccount: Dispatch<SetStateAction<boolean>>;
  onNavigate?: () => void;
}

type CurrentUser = NonNullable<ReturnType<typeof useCurrentUser>>;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_STATUS_LENGTH = 160;

// -----------------------------------------------------------------------------
// PANEL
// -----------------------------------------------------------------------------

export function AccountPanel({ setOnAccount, onNavigate }: AccountPanelProps) {
  const user = useCurrentUser();

  if (!user) {
    return null;
  }

  return (
    <AccountPanelForm
      key={user.id}
      user={user}
      setOnAccount={setOnAccount}
      onNavigate={onNavigate}
    />
  );
}

function AccountPanelForm({
  user,
  setOnAccount,
  onNavigate,
}: AccountPanelProps & {
  user: CurrentUser;
}) {
  const setCurrentUser = useSetCurrentUser();
  const router = useRouter();

  const uiLanguage = resolveLanguage(user.language);
  const labels = ACCOUNT_LABELS[uiLanguage];
  const statusPlaceholder = PROFILE_STATUS_PLACEHOLDERS[uiLanguage];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name ?? "");
  const [image, setImage] = useState(user.image ?? "");
  const [statusMessage, setStatusMessage] = useState(user.statusMessage ?? "");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [nationality, setNationality] = useState(user.nationality ?? "");
  const [language, setLanguage] = useState(user.language ?? "en");

  const [savedName, setSavedName] = useState(user.name ?? "");
  const [savedImage, setSavedImage] = useState(user.image ?? "");
  const [savedStatusMessage, setSavedStatusMessage] = useState(
    user.statusMessage ?? "",
  );

  const [savedNationality, setSavedNationality] = useState(
    user.nationality ?? "",
  );

  const [savedLanguage, setSavedLanguage] = useState(user.language ?? "en");

  const [isPending, startTransition] = useTransition();

  const countries = useMemo(() => {
    const displayNames =
      typeof Intl.DisplayNames === "function"
        ? new Intl.DisplayNames([uiLanguage], { type: "region" })
        : null;

    return NATIONALITIES.map((country) => ({
      ...country,
      label:
        displayNames && /^[a-z]{2}$/i.test(country.value)
          ? (displayNames.of(country.value.toUpperCase()) ?? country.label)
          : country.label,
    }));
  }, [uiLanguage]);

  const displayedImage = previewUrl ?? image;

  const hasChanges =
    name !== savedName ||
    image !== savedImage ||
    nationality !== savedNationality ||
    statusMessage !== savedStatusMessage ||
    selectedFile !== null;

  // ---------------------------------------------------------------------------
  // AVATAR
  // ---------------------------------------------------------------------------

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleAvatarClick = () => {
    if (isPending) {
      return;
    }

    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(labels.invalid_image_type);
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error(labels.image_too_large);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // ---------------------------------------------------------------------------
  // LANGUAGE
  // ---------------------------------------------------------------------------

  const handleLanguageChange = (value: string | null) => {
    if (
      !value ||
      isPending ||
      value === savedLanguage ||
      !LANGUAGES.some((item) => item.value === value)
    ) {
      return;
    }

    const previousLanguage = savedLanguage;
    const userId = user.id;

    setLanguage(value);

    setCurrentUser((previous) =>
      previous?.id === userId ? { ...previous, language: value } : previous,
    );

    startTransition(async () => {
      try {
        const updatedUser = await updateAccountLanguage(value);
        const nextLanguage = updatedUser.language ?? "en";

        setLanguage(nextLanguage);
        setSavedLanguage(nextLanguage);

        setCurrentUser((previous) =>
          previous?.id === userId
            ? { ...previous, language: nextLanguage }
            : previous,
        );

        router.refresh();

        toast.success(ACCOUNT_LABELS[resolveLanguage(nextLanguage)].updated);
      } catch (error) {
        setLanguage(previousLanguage);

        setCurrentUser((previous) =>
          previous?.id === userId
            ? { ...previous, language: previousLanguage }
            : previous,
        );

        console.error("Failed to update language:", error);

        toast.error(
          ACCOUNT_LABELS[resolveLanguage(previousLanguage)].update_failed,
        );
      }
    });
  };

  // ---------------------------------------------------------------------------
  // SAVE
  // ---------------------------------------------------------------------------

  const handleSave = () => {
    if (isPending || !hasChanges) {
      return;
    }

    const trimmedName = name.trim();
    const trimmedStatusMessage = statusMessage.trim();

    if (!trimmedName) {
      toast.error(labels.name_required);
      return;
    }

    if (trimmedName.length > 30) {
      toast.error(labels.name_too_long);
      return;
    }

    if (!nationality) {
      toast.error(labels.nationality_required);
      return;
    }

    if (statusMessage.length > MAX_STATUS_LENGTH) {
      toast.error(labels.update_failed);
      return;
    }

    startTransition(async () => {
      try {
        let nextImage = image;

        if (selectedFile) {
          const formData = new FormData();
          formData.append("file", selectedFile);

          const uploaded = await uploadAvatar(formData);
          nextImage = uploaded.url;
        }

        const updatedUser = await updateAccountPreferences({
          name: trimmedName,
          image: nextImage || null,
          nationality,
          language: savedLanguage,
          statusMessage: trimmedStatusMessage || null,
        });

        const nextName = updatedUser.name ?? "";
        const nextSavedImage = updatedUser.image ?? "";
        const nextNationality = updatedUser.nationality ?? "";
        const nextStatusMessage = updatedUser.statusMessage ?? "";

        setName(nextName);
        setImage(nextSavedImage);
        setNationality(nextNationality);
        setStatusMessage(nextStatusMessage);

        setSavedName(nextName);
        setSavedImage(nextSavedImage);
        setSavedNationality(nextNationality);
        setSavedStatusMessage(nextStatusMessage);

        setSelectedFile(null);
        setPreviewUrl(null);

        setCurrentUser((previous) =>
          previous?.id === user.id
            ? {
                ...previous,
                name: updatedUser.name,
                image: updatedUser.image,
                nationality: updatedUser.nationality,
                statusMessage: updatedUser.statusMessage,
              }
            : previous,
        );

        router.refresh();

        toast.success(ACCOUNT_LABELS[resolveLanguage(savedLanguage)].updated);

        onNavigate?.();
      } catch (error) {
        console.error("Failed to update account:", error);
        toast.error(labels.update_failed);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <section
      aria-labelledby="account-settings-heading"
      className="flex h-full min-h-0 w-full flex-col"
    >
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-1.5">
        <h2
          id="account-settings-heading"
          className="text-xs font-normal tracking-wider text-muted-foreground/50"
        >
          {labels.settings}
        </h2>

        <button
          type="button"
          onClick={() => setOnAccount(false)}
          aria-label={labels.close}
          className="
            flex size-8 cursor-pointer items-center justify-center
            rounded-md text-zinc-500 transition-colors
            hover:bg-zinc-100 hover:text-zinc-900
            dark:text-zinc-400 dark:hover:bg-zinc-800
            dark:hover:text-zinc-100
          "
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="hide-scrollbar my-2 min-h-0 flex-1 overflow-y-auto px-5">
        {/* Avatar / name */}
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isPending}
              className="hidden"
              aria-label={labels.change_avatar}
            />

            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isPending}
              aria-label={labels.change_avatar}
              className="
                group relative block size-16 cursor-pointer
                overflow-hidden rounded-full outline-none
                ring-offset-2
                focus-visible:ring-2 focus-visible:ring-zinc-400
                disabled:cursor-default
              "
            >
              <Avatar className="size-16">
                <AvatarImage
                  src={displayedImage || undefined}
                  alt={name || labels.display_name}
                  className="object-cover"
                />

                <AvatarFallback className="text-lg">
                  {(name || "U").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div
                className="
                  absolute inset-0 flex items-center justify-center
                  rounded-full bg-black/0 transition-colors
                  group-hover:bg-black/50
                  group-focus-visible:bg-black/50
                "
              >
                <Camera
                  aria-hidden="true"
                  className="
                    size-5 text-white opacity-0 transition-opacity
                    group-hover:opacity-100
                    group-focus-visible:opacity-100
                  "
                />
              </div>
            </button>

            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isPending}
              className="
                w-full cursor-pointer text-center
                text-[12px] font-medium text-zinc-500
                transition-colors hover:text-zinc-900
                disabled:cursor-default
                dark:text-zinc-400 dark:hover:text-zinc-100
              "
            >
              {labels.change}
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <label
              htmlFor="display-name"
              className="mb-2 block text-[14px] font-medium text-zinc-800 dark:text-zinc-200"
            >
              {labels.display_name}
            </label>

            <Input
              id="display-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={30}
              disabled={isPending}
              placeholder={labels.name_placeholder}
              className="text-[14px]"
            />

            <p className="mt-1.5 text-end text-[11px] text-zinc-400 dark:text-zinc-500">
              {name.length}/30
            </p>
          </div>
        </div>

        {/* Public profile message */}
        <div className="mt-4">
          <label htmlFor="account-status-message" className="sr-only">
            {statusPlaceholder}
          </label>

          <textarea
            id="account-status-message"
            rows={3}
            value={statusMessage}
            onChange={(event) => setStatusMessage(event.target.value)}
            maxLength={MAX_STATUS_LENGTH}
            disabled={isPending}
            placeholder={statusPlaceholder}
            aria-describedby="account-status-message-count"
            className="
              block min-h-24 w-full resize-none
              rounded-lg border border-zinc-200
              bg-transparent px-3 py-2.5
              text-[14px] leading-6 text-zinc-800
              placeholder:text-zinc-400
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-zinc-400
              disabled:opacity-50
              dark:border-zinc-700 dark:text-zinc-200
              dark:placeholder:text-zinc-500
            "
          />

          <p
            id="account-status-message-count"
            className="mt-1.5 text-end text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500"
          >
            {statusMessage.length}/{MAX_STATUS_LENGTH}
          </p>
        </div>

        {/* Email */}
        {user.email && (
          <div>
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
              {labels.email}
            </p>

            <p className="mt-0.5 truncate text-[13px] text-zinc-600 dark:text-zinc-300">
              {user.email}
            </p>
          </div>
        )}

        <Separator className="mt-5 mb-7" />

        {/* Nationality */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2">
            <Globe2
              className="size-4 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />

            <label
              htmlFor="account-nationality"
              className="text-[14px] font-medium text-zinc-800 dark:text-zinc-200"
            >
              {labels.nationality}
            </label>
          </div>

          <Select
            value={nationality}
            disabled={isPending}
            onValueChange={(value) => {
              if (value !== null) {
                setNationality(value);
              }
            }}
          >
            <SelectTrigger
              id="account-nationality"
              aria-describedby="account-nationality-description"
              className="w-full text-[14px]"
            >
              <SelectValue>
                {countries.find((country) => country.value === nationality)
                  ?.label ?? labels.select_nationality}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.value} value={country.value}>
                  {country.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p
            id="account-nationality-description"
            className="mt-2 text-[12px] leading-5 text-zinc-500 dark:text-zinc-400"
          >
            {labels.nationality_description}
          </p>
        </div>

        {/* Language */}
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Languages
              className="size-4 text-zinc-500 dark:text-zinc-400"
              aria-hidden="true"
            />

            <label
              htmlFor="account-language"
              className="text-[14px] font-medium text-zinc-800 dark:text-zinc-200"
            >
              {labels.language}
            </label>
          </div>

          <Select
            value={language}
            disabled={isPending}
            onValueChange={handleLanguageChange}
          >
            <SelectTrigger
              id="account-language"
              aria-describedby="account-language-description"
              className="w-full text-[14px]"
            >
              <SelectValue>
                {LANGUAGES.find((item) => item.value === language)?.label ??
                  labels.select_language}
              </SelectValue>
            </SelectTrigger>

            <SelectContent>
              {LANGUAGES.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <p
            id="account-language-description"
            className="mt-2 text-[12px] leading-5 text-zinc-500 dark:text-zinc-400"
          >
            {labels.language_description}
          </p>
        </div>
      </div>

      {/* Save */}
      <div className="ms-auto mt-auto shrink-0 px-5 pb-5">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="px-5 py-4 text-[15px]"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="
                  size-3.5 animate-spin rounded-full
                  border-2 border-current/40 border-t-current
                "
              />
              {labels.saving}
            </span>
          ) : (
            labels.save
          )}
        </Button>
      </div>
    </section>
  );
}
