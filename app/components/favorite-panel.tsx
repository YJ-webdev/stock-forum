import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import React from "react";

export const FavoritePanel = ({
  setOnFavotites,
}: {
  setOnFavotites: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="
            flex shrink-0 items-center justify-between
            py-3 px-4
           
          "
      >
        <p className="text-xs -translate-y-1 font-normal tracking-wider text-muted-foreground/50">
          Favorite markets
        </p>
        <div className="shrink-0">
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setOnFavotites(false)}
              className="size-8 ml-auto"
              aria-label="Close account"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

function PanelLoader() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center">
      <div
        className="
          size-5
          animate-spin
          rounded-full
          border-2
          border-zinc-200
          border-t-zinc-700
          dark:border-zinc-700
          dark:border-t-zinc-200
        "
      />
    </div>
  );
}
