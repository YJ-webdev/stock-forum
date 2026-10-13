export function SideDataLoading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex min-h-0 w-full flex-1 items-center justify-center"
    >
      <div
        aria-hidden="true"
        className="
          size-5 animate-spin rounded-full
          border-2 border-zinc-200 border-t-zinc-700
          dark:border-zinc-700 dark:border-t-zinc-200
        "
      />
    </div>
  );
}
