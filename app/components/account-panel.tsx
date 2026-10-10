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
import { ACCOUNT_LABELS } from "@/lib/data/translations";

import { updateAccountPreferences } from "@/app/actions/update-account-preferences";
import { uploadAvatar } from "@/app/actions/upload-avatar";

import { useCurrentUser, useSetCurrentUser } from "../context/user-context";

interface AccountPanelProps {
  setOnAccount: Dispatch<SetStateAction<boolean>>;
}

type CurrentUser = NonNullable<ReturnType<typeof useCurrentUser>>;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function AccountPanel({ setOnAccount }: AccountPanelProps) {
  const user = useCurrentUser();

  if (!user) {
    return null;
  }

  return <AccountPanelForm user={user} setOnAccount={setOnAccount} />;
}

function AccountPanelForm({
  user,
  setOnAccount,
}: AccountPanelProps & {
  user: CurrentUser;
}) {
  const setCurrentUser = useSetCurrentUser();
  const router = useRouter();

  const uiLanguage = resolveLanguage(user.language);
  const labels = ACCOUNT_LABELS[uiLanguage];

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name ?? "");
  const [image, setImage] = useState(user.image ?? "");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [nationality, setNationality] = useState(user.nationality ?? "");
  const [language, setLanguage] = useState(user.language ?? "en");

  const [savedName, setSavedName] = useState(user.name ?? "");
  const [savedImage, setSavedImage] = useState(user.image ?? "");
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
    language !== savedLanguage ||
    selectedFile !== null;

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

    // Allows selecting the same file again.
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

  const handleSave = () => {
    if (isPending || !hasChanges) {
      return;
    }

    const trimmedName = name.trim();

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

    if (!language) {
      toast.error(labels.language_required);
      return;
    }

    startTransition(async () => {
      try {
        let nextImage = image;

        // Upload only when Save changes is pressed.
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
          language,
        });

        const nextName = updatedUser.name ?? "";
        const nextSavedImage = updatedUser.image ?? "";
        const nextNationality = updatedUser.nationality ?? "";
        const nextLanguage = updatedUser.language ?? "en";

        setName(nextName);
        setImage(nextSavedImage);
        setNationality(nextNationality);
        setLanguage(nextLanguage);

        setSavedName(nextName);
        setSavedImage(nextSavedImage);
        setSavedNationality(nextNationality);
        setSavedLanguage(nextLanguage);

        setSelectedFile(null);
        setPreviewUrl(null);

        setCurrentUser((previous) =>
          previous
            ? {
                ...previous,
                name: updatedUser.name,
                image: updatedUser.image,
                nationality: updatedUser.nationality,
                language: updatedUser.language,
              }
            : previous,
        );

        router.refresh();

        const nextLabels = ACCOUNT_LABELS[resolveLanguage(nextLanguage)];

        toast.success(nextLabels.updated);
      } catch (error) {
        console.error("Failed to update account:", error);
        toast.error(labels.update_failed);
      }
    });
  };

  return (
    <section
      aria-labelledby="account-settings-heading"
      className="flex h-full min-h-0 w-full flex-col px-4 pt-3 pb-4"
    >
      <div className="flex shrink-0 items-start justify-between">
        <h2
          id="account-settings-heading"
          className="mt-1 text-xs font-normal tracking-wider text-muted-foreground/50"
        >
          {labels.settings}
        </h2>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOnAccount(false)}
          className="size-8"
          aria-label={labels.close}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto px-1">
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
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

        {user.email && (
          <div className="mt-4">
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
              {labels.email}
            </p>

            <p className="mt-0.5 truncate text-[13px] text-zinc-600 dark:text-zinc-300">
              {user.email}
            </p>
          </div>
        )}

        <Separator className="mb-7" />

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
            onValueChange={(value) => {
              if (value !== null) {
                setLanguage(value);
              }
            }}
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

      <div className="ms-auto mt-auto shrink-0">
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
                  border-2 border-white/40 border-t-white
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
