"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Camera, Plus, X } from "lucide-react";
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

import { NATIONALITIES } from "@/lib/data/nationalities";
import { createBotUser } from "@/app/actions/user-bot";

type CreatedBot = Awaited<ReturnType<typeof createBotUser>>;

interface CreateBotUserProps {
  disabled?: boolean;
  onCreated: (bot: CreatedBot) => void;
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const MAX_IMAGE_SIZE = 3 * 1024 * 1024;

export function CreateBotUser({
  disabled = false,
  onCreated,
}: CreateBotUserProps) {
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const busy = disabled || isPending;

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function resetForm() {
    setName("");
    setNationality("");
    setSelectedFile(null);
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

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy || submittingRef.current) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Enter a bot name.");
      return;
    }

    if (!nationality) {
      toast.error("Select a nationality.");
      return;
    }

    submittingRef.current = true;
    setIsPending(true);

    let createdBot: CreatedBot;

    try {
      const formData = new FormData();

      formData.set("name", trimmedName);
      formData.set("nationality", nationality);

      if (selectedFile) {
        formData.set("file", selectedFile);
      }

      createdBot = await createBotUser(formData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create bot.",
      );
      return;
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }

    resetForm();
    setOpen(false);
    toast.success("Bot created with 10,000 points.");
    onCreated(createdBot);
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
        onClick={() => setOpen((value) => !value)}
        className="cursor-pointer rounded-full"
      >
        <Plus className="size-4" aria-hidden="true" />
        Create bot
      </Button>

      {open && (
        <form
          id={`${id}-form`}
          onSubmit={handleCreate}
          className="space-y-5 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Create bot profile</h3>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label="Close create bot form"
              onClick={() => setOpen(false)}
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
                aria-label="Choose bot image"
                className="
                  group relative block size-16 cursor-pointer
                  overflow-hidden rounded-full
                  focus-visible:outline-none
                  focus-visible:ring-2 focus-visible:ring-zinc-400
                  disabled:cursor-default
                "
              >
                <Avatar className="size-16">
                  <AvatarImage
                    src={previewUrl ?? undefined}
                    alt={name || "Bot"}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-[22px] bg-olive-500 text-white font-normal">
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
                      size-5 text-white opacity-0 transition-opacity
                      group-hover:opacity-100
                      group-focus-visible:opacity-100
                    "
                  />
                </span>
              </button>

              {selectedFile && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setSelectedFile(null)}
                  className="mt-1 w-full cursor-pointer text-xs text-zinc-500"
                >
                  Remove
                </button>
              )}
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

          <div className="space-y-2">
            <label
              htmlFor={`${id}-nationality`}
              className="block text-sm font-medium"
            >
              Nationality
            </label>

            <Select
              value={nationality || null}
              disabled={busy}
              onValueChange={(value) => {
                if (value !== null) setNationality(value);
              }}
            >
              <SelectTrigger id={`${id}-nationality`} className="w-full">
                <SelectValue>
                  {NATIONALITIES.find(
                    (country) => country.value === nationality,
                  )?.label ?? "Select nationality"}
                </SelectValue>
              </SelectTrigger>

              <SelectContent>
                {NATIONALITIES.map((country) => (
                  <SelectItem
                    key={country.value}
                    value={country.value}
                    className="cursor-pointer"
                  >
                    {country.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              Starting balance: 10,000 points
            </p>

            <Button
              type="submit"
              disabled={busy || !name.trim() || !nationality}
              className="cursor-pointer"
            >
              {isPending ? "Creating..." : "Create bot"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
