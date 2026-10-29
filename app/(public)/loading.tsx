export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="w-full min-w-0 px-4 pt-2"
    >
      <span className="sr-only">Loading…</span>

      <div
        aria-hidden="true"
        className="animate-pulse motion-reduce:animate-none"
      >
        <div className="mb-6 h-3 w-64 max-w-full rounded bg-muted" />

        <div className="flex gap-8 overflow-hidden py-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-60 w-44 shrink-0 rounded-xl bg-muted"
            />
          ))}
        </div>

        <div className="mt-9 space-y-6">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex gap-3">
              <div className="size-9 shrink-0 rounded-full bg-muted" />

              <div className="min-w-0 flex-1 space-y-3">
                <div className="h-3 w-28 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
                <div className="h-3 w-2/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
