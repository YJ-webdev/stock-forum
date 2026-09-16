"use client";

import { useState, useTransition } from "react";
import { Globe2, Languages, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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

interface AccountPanelProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    nationality?: string | null;
    language?: string | null;
  };
}

export function AccountPanel({ user }: AccountPanelProps) {
  const [nationality, setNationality] = useState<string>(
    user.nationality ?? "",
  );

  const [language, setLanguage] = useState<string>(user.language ?? "en");

  const [isPending, startTransition] = useTransition();

  const originalNationality = user.nationality ?? "";
  const originalLanguage = user.language ?? "en";

  const hasChanges =
    nationality !== originalNationality || language !== originalLanguage;

  const handleSave = () => {
    if (!nationality) {
      toast.error("Please select your nationality.");
      return;
    }

    startTransition(async () => {
      try {
        /*
         * We'll replace this with the Prisma
         * updateAccountPreferences server action.
         */
        console.log({
          nationality,
          language,
        });

        toast.success("Account preferences updated.");
      } catch (error) {
        console.error(error);

        toast.error("Failed to update account.");
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col pt-4">
      {/* HEADER */}
      <div className="shrink-0 pb-5">
        <div className="flex items-center gap-2">
          <UserRound className="size-4 text-zinc-500 dark:text-zinc-400" />

          <h2 className="text-[16px] font-medium text-zinc-900 dark:text-zinc-100">
            Account
          </h2>
        </div>

        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          Manage your profile and regional preferences.
        </p>
      </div>

      <Separator />

      {/* CONTENT */}
      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto py-5">
        {/* PROFILE */}
        <div className="mb-7">
          <p className="mb-3 text-[12px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Profile
          </p>

          <div>
            <p className="text-[15px] text-zinc-900 dark:text-zinc-100">
              {user.name || "User"}
            </p>

            {user.email && (
              <p className="mt-0.5 text-[13px] text-zinc-500 dark:text-zinc-400">
                {user.email}
              </p>
            )}
          </div>
        </div>

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
            onValueChange={(value) => {
              if (value !== null) {
                setNationality(value);
              }
            }}
          >
            <SelectTrigger className="w-full text-[14px]">
              <SelectValue placeholder="Select nationality" />
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
            onValueChange={(value) => {
              if (value !== null) {
                setLanguage(value);
              }
            }}
          >
            <SelectTrigger className="w-full text-[14px]">
              <SelectValue placeholder="Select language" />
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

      {/* FOOTER */}
      <div className="shrink-0 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <Button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges || isPending}
          className="w-full text-[14px]"
        >
          {isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
