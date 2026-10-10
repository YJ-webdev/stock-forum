"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Camera, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { updateBotProfile } from "@/app/actions/user-bot";

type BotProfile = Awaited<ReturnType<typeof updateBotProfile>>;

interface EditBotUserProps {
  bot: BotProfile;
  disabled?: boolean;
  onUpdated: (bot: BotProfile) => void;
  onBusyChange?: (busy: boolean) => void;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

export function EditBotUser({
  bot,
  disabled = false,
  onUpdated,
  onBusyChange,
}: EditBotUserProps) {
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(bot.name ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const busy = disabled || isPending;
  const displayedImage = previewUrl ?? bot.image;

  const hasChanges = name.trim() !== (bot.name ?? "") || selectedFile !== null;

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function openForm() {
    setName(bot.name ?? "");
    setSelectedFile(null);
    setOpen(true);
  }

  function closeForm() {
    if (busy) return;

    setOpen(false);
    setSelectedFile(null);
    setName(bot.name ?? "");
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Use a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be 3 MB or smaller.");
      return;
    }

    setSelectedFile(file);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || submittingRef.current || !hasChanges) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Enter a bot name.");
      return;
    }

    if (trimmedName.length > 30) {
      toast.error("Name must be 30 characters or fewer.");
      return;
    }

    submittingRef.current = true;
    setIsPending(true);
    onBusyChange?.(true);

    let updatedBot: BotProfile;

    try {
      const formData = new FormData();

      formData.set("botUserId", bot.id);
      formData.set("name", trimmedName);

      if (selectedFile) {
        formData.set("file", selectedFile);
      }

      updatedBot = await updateBotProfile(formData);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update bot profile.",
      );

      return;
    } finally {
      submittingRef.current = false;
      setIsPending(false);
      onBusyChange?.(false);
    }

    setName(updatedBot.name ?? "");
    setSelectedFile(null);
    setOpen(false);

    onUpdated(updatedBot);
    toast.success("Bot profile updated.");
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        aria-expanded={open}
        aria-controls={`${id}-form`}
        onClick={() => {
          if (open) {
            closeForm();
          } else {
            openForm();
          }
        }}
        className="cursor-pointer rounded-full"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
        Edit profile
      </Button>

      {open && (
        <form
          id={`${id}-form`}
          onSubmit={handleSave}
          className="
            space-y-5 rounded-xl
            border border-zinc-200 p-4
            dark:border-zinc-800
          "
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Edit bot profile</h3>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label="Close edit bot form"
              onClick={closeForm}
              className="size-8"
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            <div className="shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload bot image"
              />

              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change bot image"
                className="
                  group relative block size-16
                  cursor-pointer overflow-hidden rounded-full
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-zinc-400
                  disabled:cursor-default
                "
              >
                <Avatar className="size-16">
                  <AvatarImage
                    src={displayedImage ?? undefined}
                    alt={name || "Bot"}
                    className="object-cover"
                  />

                  <AvatarFallback className="text-lg">
                    {(name.trim() || "Bot").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <span
                  className="
                    absolute inset-0 flex items-center justify-center
                    bg-black/0 transition-colors
                    group-hover:bg-black/40
                    group-focus-visible:bg-black/40
                  "
                >
                  <Camera
                    aria-hidden="true"
                    className="
                      size-5 text-white opacity-0
                      transition-opacity
                      group-hover:opacity-100
                      group-focus-visible:opacity-100
                    "
                  />
                </span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="
                  mt-1 w-full cursor-pointer
                  text-center text-xs text-zinc-500
                "
              >
                Change
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <label
                htmlFor={`${id}-name`}
                className="mb-2 block text-sm font-medium"
              >
                Name
              </label>

              <Input
                id={`${id}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={30}
                disabled={busy}
                placeholder="Bot display name"
                required
              />

              <p className="mt-1 text-end text-xs text-zinc-400">
                {name.length}/30
              </p>
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs text-zinc-500">
                {selectedFile.name}
              </p>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setSelectedFile(null)}
              >
                Undo image change
              </Button>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={busy || !hasChanges || !name.trim()}
              className="cursor-pointer"
            >
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
