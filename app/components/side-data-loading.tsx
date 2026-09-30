interface SideDataLoadingProps {
  title: string;
}

export function SideDataLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center">
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
