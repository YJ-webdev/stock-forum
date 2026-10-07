"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  getAiBriefCountries,
  regenerateAiCountryBrief,
  setAiCountryBriefEnabled,
} from "@/app/actions/ai-country-brief";

type BriefCountry = Awaited<ReturnType<typeof getAiBriefCountries>>[number];

interface AiBriefCountryManagerProps {
  countries: BriefCountry[];
}

const NAV_ITEMS = [
  { key: "America", label: "America" },
  { key: "Asia", label: "Asia Pacific" },
  { key: "Europe", label: "Europe" },
  { key: "Middle_East", label: "Middle East" },
  { key: "Africa", label: "Africa" },
] as const;

type NavKey = (typeof NAV_ITEMS)[number]["key"];

export function AiBriefCountryManager({
  countries,
}: AiBriefCountryManagerProps) {
  const [items, setItems] = useState(countries);
  const [activeTab, setActiveTab] = useState<NavKey>("America");
  const [pendingCountries, setPendingCountries] = useState<Set<string>>(
    new Set(),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCountry, setGeneratingCountry] = useState<string | null>(
    null,
  );

  const generationLock = useRef(false);
  const toggleLocks = useRef(new Set<string>());

  const enabledCountries = items.filter((item) => item.enabled);
  const filteredCountries = items.filter((item) => item.region === activeTab);

  const activeEnabledCount = filteredCountries.filter(
    (item) => item.enabled,
  ).length;

  const activeLabel =
    NAV_ITEMS.find((item) => item.key === activeTab)?.label ?? activeTab;

  const updateEnabled = (country: string, enabled: boolean) => {
    setItems((current) =>
      current.map((item) =>
        item.country === country ? { ...item, enabled } : item,
      ),
    );
  };

  const handleToggle = async (item: BriefCountry) => {
    if (generationLock.current || toggleLocks.current.has(item.country)) {
      return;
    }

    const previousEnabled = item.enabled;
    const nextEnabled = !previousEnabled;

    toggleLocks.current.add(item.country);

    setPendingCountries((current) => {
      const next = new Set(current);
      next.add(item.country);
      return next;
    });

    updateEnabled(item.country, nextEnabled);

    try {
      const saved = await setAiCountryBriefEnabled(item.country, nextEnabled);

      updateEnabled(saved.country, saved.enabled);
    } catch (error) {
      updateEnabled(item.country, previousEnabled);
      console.error(error);
      toast.error(`Could not update ${item.name}.`);
    } finally {
      toggleLocks.current.delete(item.country);

      setPendingCountries((current) => {
        const next = new Set(current);
        next.delete(item.country);
        return next;
      });
    }
  };

  const handleGenerate = async () => {
    if (
      generationLock.current ||
      toggleLocks.current.size > 0 ||
      enabledCountries.length === 0
    ) {
      return;
    }

    generationLock.current = true;
    setIsGenerating(true);

    // Includes enabled countries across all tabs.
    const targets = [...enabledCountries];

    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      for (const country of targets) {
        setGeneratingCountry(country.name);

        try {
          const generated = await regenerateAiCountryBrief(country.country);

          if (generated.status === "updated") {
            updatedCount += 1;
          } else {
            skippedCount += 1;
          }
        } catch (error) {
          failedCount += 1;
          console.error(`[Country brief] Failed: ${country.country}`, error);
        }
      }

      const message = [
        `${updatedCount} generated`,
        skippedCount > 0 ? `${skippedCount} skipped` : null,
        failedCount > 0 ? `${failedCount} failed` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      if (failedCount > 0) {
        toast.error(message);
      } else {
        toast.success(message);
      }

      try {
        const refreshed = await getAiBriefCountries();
        setItems(refreshed);
      } catch (error) {
        console.error(error);
        toast.error("Could not refresh brief status.");
      }
    } finally {
      generationLock.current = false;
      setIsGenerating(false);
      setGeneratingCountry(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Country briefs</h2>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            One brief per country. Manual generation replaces the existing brief
            for the same coverage period.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            isGenerating ||
            pendingCountries.size > 0 ||
            enabledCountries.length === 0
          }
          className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? (
            <>
              <Loader2
                aria-hidden="true"
                className="h-4 w-4 shrink-0 animate-spin"
              />
              <span>Generating {generatingCountry ?? "brief"}...</span>
            </>
          ) : (
            <>
              <Sparkles aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span>
                Generate enabled countries ({enabledCountries.length})
              </span>
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max items-center gap-1 border-b">
          {NAV_ITEMS.map((nav) => {
            const isActive = activeTab === nav.key;
            const enabledCount = items.filter(
              (item) => item.region === nav.key && item.enabled,
            ).length;

            return (
              <button
                key={nav.key}
                type="button"
                onClick={() => setActiveTab(nav.key)}
                aria-pressed={isActive}
                className={`relative flex h-10 cursor-pointer items-center gap-1.5 px-3 text-sm transition-colors ${
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{nav.label}</span>

                {enabledCount > 0 && (
                  <span
                    className={`flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {enabledCount}
                  </span>
                )}

                {isActive && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 bg-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        {filteredCountries.length > 0 ? (
          <div className="divide-y">
            {filteredCountries.map((item) => {
              const isSaving = pendingCountries.has(item.country);

              return (
                <div
                  key={item.country}
                  className="flex min-h-20 items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{item.name}</span>

                      <span className="text-xs text-muted-foreground">
                        {item.country}
                      </span>
                    </div>

                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {item.indices
                        .map(
                          (index: { symbol: string; name: string }) =>
                            index.name,
                        )

                        .join(" · ")}
                    </p>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.coverageDate ? (
                        <>
                          Coverage:{" "}
                          <time dateTime={item.coverageDate}>
                            {item.coverageDate}
                          </time>{" "}
                          (UTC)
                        </>
                      ) : (
                        "No brief yet"
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={item.enabled}
                    aria-label={`AI market brief for ${item.name}`}
                    title="Temporarily unavailable"
                    disabled
                    className={`relative h-6 w-11 shrink-0 cursor-not-allowed rounded-full opacity-50 ${
                      item.enabled
                        ? "bg-emerald-500"
                        : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm ${
                        item.enabled ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    >
                      {item.enabled && (
                        <Check
                          aria-hidden="true"
                          className="h-3 w-3 text-emerald-600"
                        />
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No countries in this region.
          </p>
        )}
      </div>

      <div className="text-right text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {enabledCountries.length}
        </span>{" "}
        countries enabled
      </div>
    </div>
  );
}
