import { Plus } from "lucide-react";

export const UserPreferenceMarket = () => {
  return (
    <div className="mx-auto w-full max-w-4xl  bg-white dark:bg-zinc-900">
      <p className="mb-3 px-4 text-xs font-normal tracking-wider text-muted-foreground/50">
        My markets
      </p>

      <button
        type="button"
        className="
          mx-4 flex h-44 w-[calc(100%-2rem)]
          cursor-pointer flex-col items-center justify-center gap-2
          rounded-lg border-2 border-dashed border-zinc-200
          text-zinc-500
          transition-colors
          hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700
          dark:border-zinc-700 dark:text-zinc-400
          dark:hover:border-zinc-600 dark:hover:bg-zinc-700/30
          dark:hover:text-zinc-300
        "
      >
        <div
          className="
            flex h-8 w-8 items-center justify-center
            rounded-full bg-zinc-200/70
            dark:bg-zinc-700
          "
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </div>

        <span className="text-[15px] font-medium">
          Add your favorite markets
        </span>

        <span className="text-xs text-muted-foreground/60">
          Customize your market overview
        </span>
      </button>
    </div>
  );
};
