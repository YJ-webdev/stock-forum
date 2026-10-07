"use client";

import { useEffect, useRef, useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { regenerateAiCountryBrief } from "@/app/actions/ai-country-brief";

const TEST_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "EU", name: "Euro area" },
  { code: "GB", name: "United Kingdom" },
] as const;

type CountryCode = (typeof TEST_COUNTRIES)[number]["code"];

interface TestResult {
  country: CountryCode;
  coverageDate: string;

  brief: {
    summary: string;
    keyFactors: string[];
  };

  sources: {
    title: string;
    url: string;
  }[];

  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    webSearchCalls: number;
  };
}

type StoredResults = Partial<Record<CountryCode, TestResult>>;

const STORAGE_KEY = "ai-country-brief-test-results-v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCountryCode(value: unknown): value is CountryCode {
  return TEST_COUNTRIES.some((country) => country.code === value);
}

function isSafeUrl(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);

    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

function isValidCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isTestResult(value: unknown): value is TestResult {
  if (
    !isRecord(value) ||
    !isCountryCode(value.country) ||
    typeof value.coverageDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.coverageDate)
  ) {
    return false;
  }

  const brief = value.brief;
  const usage = value.usage;

  return (
    isRecord(brief) &&
    typeof brief.summary === "string" &&
    brief.summary.trim().length > 0 &&
    Array.isArray(brief.keyFactors) &&
    brief.keyFactors.every((factor: unknown) => typeof factor === "string") &&
    Array.isArray(value.sources) &&
    value.sources.every(
      (source: unknown) =>
        isRecord(source) &&
        typeof source.title === "string" &&
        isSafeUrl(source.url),
    ) &&
    isRecord(usage) &&
    isValidCount(usage.inputTokens) &&
    isValidCount(usage.outputTokens) &&
    isValidCount(usage.totalTokens) &&
    isValidCount(usage.webSearchCalls)
  );
}

function getSkipMessage(reason: string) {
  switch (reason) {
    case "disabled":
      return "Enable this country in Country briefs first.";

    case "no_supported_news":
      return "No supported news was returned. The existing brief was kept.";

    case "already_published":
      return "A brief already exists for this coverage period.";

    case "setting_or_brief_changed":
      return "The setting or brief changed during generation. Please check its current status.";

    default:
      return "Generation was skipped.";
  }
}

export function AiBriefTest() {
  const [country, setCountry] = useState<CountryCode>("US");
  const [results, setResults] = useState<StoredResults>({});
  const [isPending, setIsPending] = useState(false);

  const generationLock = useRef(false);
  const resultsRef = useRef<StoredResults>({});

  const selectedCountry = TEST_COUNTRIES.find((item) => item.code === country)!;

  const result = results[country];

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) {
        return;
      }

      const parsed: unknown = JSON.parse(stored);

      if (!isRecord(parsed)) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const restored: StoredResults = {};

      for (const item of TEST_COUNTRIES) {
        const saved = parsed[item.code];

        if (isTestResult(saved) && saved.country === item.code) {
          restored[item.code] = saved;
        }
      }

      resultsRef.current = restored;
      setResults(restored);
    } catch (error) {
      console.error("Could not restore country brief tests:", error);
    }
  }, []);

  const handleGenerate = async () => {
    if (generationLock.current) {
      return;
    }

    generationLock.current = true;
    setIsPending(true);

    const targetCountry = country;
    const targetName = selectedCountry.name;

    try {
      const generated = await regenerateAiCountryBrief(targetCountry);

      if (generated.status !== "updated") {
        toast.info(getSkipMessage(generated.reason));
        return;
      }

      const nextResult: TestResult = {
        country: targetCountry,
        coverageDate: generated.coverageDate,
        brief: generated.result.brief,
        sources: generated.result.sources,
        usage: generated.result.usage,
      };

      const nextResults: StoredResults = {
        ...resultsRef.current,
        [targetCountry]: nextResult,
      };

      resultsRef.current = nextResults;
      setResults(nextResults);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResults));
      } catch (error) {
        console.error("Could not cache country brief test:", error);
      }

      toast.success(`${targetName} brief generated and saved.`);
    } catch (error) {
      console.error("Country brief test failed:", error);
      toast.error(`Could not generate the ${targetName} brief.`);
    } finally {
      generationLock.current = false;
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-xl border bg-background">
      <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">Test AI Country Brief</h2>

          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Generate one enabled country and replace its saved brief.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={country}
            onChange={(event) => {
              const value = event.target.value;

              if (isCountryCode(value)) {
                setCountry(value);
              }
            }}
            disabled={isPending}
            aria-label="Country to generate"
            className="h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-50"
          >
            {TEST_COUNTRIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled
            title="Temporarily unavailable"
            onClick={() => void handleGenerate()}
            className="flex h-9 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FlaskConical aria-hidden="true" className="h-4 w-4" />
            Generate
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">{selectedCountry.name}</span>

            <span className="text-xs text-muted-foreground">
              As of{" "}
              <time dateTime={result.coverageDate}>{result.coverageDate}</time>
            </span>
          </div>

          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Summary
            </h3>

            <p className="whitespace-pre-line text-sm leading-6">
              {result.brief.summary}
            </p>
          </section>

          {result.brief.keyFactors.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Key factors
              </h3>

              <ul className="space-y-2">
                {result.brief.keyFactors.map((factor, index) => (
                  <li
                    key={`${result.country}-${index}`}
                    className="flex gap-2 text-sm leading-6"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-foreground"
                    />

                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.sources.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sources
              </h3>

              <div className="space-y-2">
                {result.sources.map((source, index) => (
                  <a
                    key={`${source.url}-${index}`}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block wrap-break-word text-xs text-muted-foreground transition-colors hover:text-foreground hover:underline"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="border-t pt-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Usage
            </h3>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <UsageItem label="Input" value={result.usage.inputTokens} />

              <UsageItem label="Output" value={result.usage.outputTokens} />

              <UsageItem label="Total" value={result.usage.totalTokens} />

              <UsageItem
                label="Web searches"
                value={result.usage.webSearchCalls}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function UsageItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>

      <div className="mt-0.5 text-sm font-medium">{value.toLocaleString()}</div>
    </div>
  );
}
