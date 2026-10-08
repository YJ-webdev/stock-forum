"use client";

import { ChangeEvent, useEffect, useRef, useState, useTransition } from "react";
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
import { LANGUAGES } from "@/lib/data/languages";

import { updateAccountPreferences } from "@/app/actions/update-account-preferences";
import { uploadAvatar } from "@/app/actions/upload-avatar";

import { useCurrentUser, useSetCurrentUser } from "../context/user-context";

interface AccountPanelProps {
  setOnAccount: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AccountPanel({ setOnAccount }: AccountPanelProps) {
  const user = useCurrentUser();
  const setCurrentUser = useSetCurrentUser();

  if (!user) {
    return null;
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialName = user.name ?? "";
  const initialImage = user.image ?? "";
  const initialNationality = user.nationality ?? "";
  const initialLanguage = user.language ?? "en";

  const [name, setName] = useState(initialName);
  const [image, setImage] = useState(initialImage);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [nationality, setNationality] = useState(initialNationality);
  const [language, setLanguage] = useState(initialLanguage);

  const [savedName, setSavedName] = useState(initialName);
  const [savedImage, setSavedImage] = useState(initialImage);
  const [savedNationality, setSavedNationality] = useState(initialNationality);
  const [savedLanguage, setSavedLanguage] = useState(initialLanguage);

  const [isPending, startTransition] = useTransition();

  const displayedImage = previewUrl ?? image;

  const hasChanges =
    name !== savedName ||
    image !== savedImage ||
    nationality !== savedNationality ||
    language !== savedLanguage ||
    selectedFile !== null;

  /*
   * Revoke the temporary browser URL whenever the
   * selected image changes or the component unmounts.
   */
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

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed.");

      event.target.value = "";

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("Image must be smaller than 5 MB.");

      event.target.value = "";

      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const nextPreviewUrl = URL.createObjectURL(file);

    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);

    // Allows selecting the same file again.
    event.target.value = "";
  };

  const handleSave = () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Please enter a display name.");
      return;
    }

    if (trimmedName.length > 30) {
      toast.error("Display name must be 30 characters or fewer.");
      return;
    }

    if (!nationality) {
      toast.error("Please select your nationality.");
      return;
    }

    if (!language) {
      toast.error("Please select your language.");
      return;
    }

    startTransition(async () => {
      try {
        let nextImage = image;

        /*
         * Upload only when Save changes is pressed.
         * Selecting an image only creates a local preview.
         */
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

        setName(updatedUser.name ?? "");
        setImage(updatedUser.image ?? "");

        setSavedName(updatedUser.name ?? "");
        setSavedImage(updatedUser.image ?? "");
        setSavedNationality(updatedUser.nationality ?? "");
        setSavedLanguage(updatedUser.language);

        setSelectedFile(null);

        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          setPreviewUrl(null);
        }

        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                name: updatedUser.name,
                image: updatedUser.image,
                nationality: updatedUser.nationality,
                language: updatedUser.language,
              }
            : prev,
        );

        toast.success("Account updated.");
      } catch (error) {
        console.error(error);

        toast.error(
          error instanceof Error ? error.message : "Failed to update account.",
        );
      }
    });
  };

  return (
    <section
      aria-labelledby="account-settings-heading"
      className="flex h-full min-h-0 w-full flex-col px-5 pt-3 pb-4"
    >
      <div className="flex shrink-0 items-start justify-between">
        <h2
          id="account-settings-heading"
          className="mt-1 text-xs font-normal tracking-wider text-muted-foreground/50"
        >
          Settings
        </h2>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOnAccount(false)}
          className="size-8"
          aria-label="Close settings"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* CONTENT */}
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div className="">
          {/* PROFILE */}
          <div className="">
            <div className="flex items-center gap-4">
              {/* AVATAR */}
              <div className="shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={handleAvatarClick}
                  disabled={isPending}
                  className="
                    group
                    relative
                    block
                    size-16
                    overflow-hidden
                    rounded-full
                    outline-none
                    ring-offset-2
                    focus-visible:ring-2
                    focus-visible:ring-zinc-400
                    disabled:cursor-default
                  "
                  aria-label="Change profile picture"
                >
                  <Avatar className="size-16">
                    <AvatarImage
                      src={displayedImage || undefined}
                      alt={name || "User"}
                      className="object-cover"
                    />

                    <AvatarFallback className="text-lg">
                      {(name || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  {/* Discord-style hover */}
                  <div
                    className="
                      absolute
                      inset-0
                      flex
                      items-center
                      justify-center
                      rounded-full
                      bg-black/0
                      transition-colors
                      group-hover:bg-black/50
                      group-focus-visible:bg-black/50
                    "
                  >
                    <Camera
                      className="
                        size-5
                        text-white
                        opacity-0
                        transition-opacity
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
                    w-full
                    cursor-pointer
                    text-center
                    text-[12px]
                    font-medium
                    text-zinc-500
                    transition-colors
                    hover:text-zinc-900
                    disabled:cursor-default
                    dark:text-zinc-400
                    dark:hover:text-zinc-100
                  "
                >
                  Change
                </button>
              </div>

              {/* NAME */}
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="display-name"
                  className="mb-2 block text-[14px] font-medium text-zinc-800 dark:text-zinc-200"
                >
                  Display name
                </label>

                <Input
                  id="display-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={30}
                  disabled={isPending}
                  placeholder="Your name"
                  className="text-[14px]"
                />

                <p className="mt-1.5 text-right text-[11px] text-zinc-400 dark:text-zinc-500">
                  {name.length}/30
                </p>
              </div>
            </div>

            {user.email && (
              <div className="mt-4">
                <p className="text-[12px] text-zinc-400 dark:text-zinc-500">
                  Email
                </p>

                <p className="mt-0.5 truncate text-[13px] text-zinc-600 dark:text-zinc-300">
                  {user.email}
                </p>
              </div>
            )}
          </div>

          <Separator className="mb-7" />

          {/* NATIONALITY */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <Globe2 className="size-4 text-zinc-500 dark:text-zinc-400" />

              <label className="text-[14px] font-medium text-zinc-800 dark:text-zinc-200">
                Nationality
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
              <SelectTrigger className="w-full text-[14px]">
                <SelectValue>
                  {NATIONALITIES.find(
                    (country) => country.value === nationality,
                  )?.label ?? "Select your nationality"}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {NATIONALITIES.map((country) => (
                  <SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="mt-2 text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
              Used to show country-level market sentiment.
            </p>
          </div>

          {/* LANGUAGE */}
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Languages className="size-4 text-zinc-500 dark:text-zinc-400" />

              <label className="text-[14px] font-medium text-zinc-800 dark:text-zinc-200">
                Language
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
              <SelectTrigger className="w-full text-[14px]">
                <SelectValue>
                  {LANGUAGES.find((item) => item.value === language)?.label ??
                    "Select your language"}
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

            <p className="mt-2 text-[12px] leading-5 text-zinc-500 dark:text-zinc-400">
              Used for content and interface preferences.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="shrink-0 border-zinc-200 dark:border-zinc-800 ml-auto mt-auto ">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="px-5 py-4 text-[15px]"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span
                className="
                  size-3.5
                  animate-spin
                  rounded-full
                  border-2
                  border-white/40
                  border-t-white
                "
              />
              Saving...
            </span>
          ) : (
            "Save changes"
          )}
        </Button>
      </div>
    </section>
  );
}
