"use client";

export type NewsRegion =
  | "All"
  | "America"
  | "Asia"
  | "Middle_East"
  | "Europe"
  | "Africa"
  | "Global";

export type NewsFilter = NewsRegion | "Market";

interface NewsRegionFiltersProps {
  value: NewsFilter;
  onChange: (value: NewsFilter) => void;
  marketName?: string;
}

const REGIONS: { value: NewsRegion; label: string }[] = [
  { value: "All", label: "All" },
  { value: "America", label: "America" },
  { value: "Europe", label: "Europe" },
  { value: "Asia", label: "Asia" },
  { value: "Middle_East", label: "Middle East" },
  { value: "Africa", label: "Africa" },
  { value: "Global", label: "Global" },
];

export function NewsRegionFilters({
  value,
  onChange,
  marketName,
}: NewsRegionFiltersProps) {
  const options: { value: NewsFilter; label: string }[] = marketName
    ? [
        { value: "Market", label: marketName },
        ...REGIONS.filter((region) => region.value !== "All"),
      ]
    : REGIONS;

  return (
    <div
      role="group"
      aria-label="Filter news"
      className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800"
    >
      {options.map(({ value: option, label }) => {
        const active = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`
              relative shrink-0 cursor-pointer whitespace-nowrap
              px-3 pb-3 text-sm transition-colors
              focus-visible:outline-none focus-visible:ring-2
              focus-visible:ring-inset focus-visible:ring-zinc-400
              ${
                active
                  ? "font-medium text-zinc-950 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              }
            `}
          >
            {label}

            {active && (
              <span
                aria-hidden="true"
                className="absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
