"use client";

import { useEffect, useState, useTransition } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { testGenerateAiMarketBrief } from "@/app/actions/ai-market-brief";

interface TestResult {
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

export function AiBriefTest() {
  const [isPending, startTransition] = useTransition();

  const [result, setResult] = useState<TestResult | null>(null);

  const handleGenerate = () => {
    if (isPending) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await testGenerateAiMarketBrief();

        setResult(response);

        localStorage.setItem("ai-brief-test-result", JSON.stringify(response));
      } catch (error) {
        console.error(error);

        toast.error("Failed to generate test brief.");
      }
    });
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("ai-brief-test-result");

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored) as TestResult;

      setResult(parsed);
    } catch (error) {
      console.error("Failed to restore AI brief test result:", error);

      localStorage.removeItem("ai-brief-test-result");
    }
  }, []);

  return (
    <div className="rounded-xl border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div>
          <h2 className="text-sm font-medium">Test AI Market Brief</h2>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Manually generate one S&P 500 brief.
          </p>
        </div>

        <button
          type="button"
          disabled={isPending}
          onClick={handleGenerate}
          className="
            flex h-9 cursor-pointer
            items-center gap-2
            rounded-md border
            bg-background px-3
            text-sm font-medium
            transition-colors
            hover:bg-muted
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FlaskConical className="h-4 w-4" />
              Generate S&P 500 Test
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-6 p-5">
          {/* Summary */}
          <section>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Summary
            </div>

            <p className="text-sm leading-6">{result.brief.summary}</p>
          </section>

          {/* Key factors */}
          <section>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Key Factors
            </div>

            <ul className="space-y-2">
              {result.brief.keyFactors.map((factor, index) => (
                <li key={index} className="flex gap-2 text-sm leading-6">
                  <span className="mt-2.25 h-1 w-1 shrink-0 rounded-full bg-foreground" />

                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Sources */}
          {result.sources.length > 0 && (
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sources
              </div>

              <div className="space-y-1.5">
                {result.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      block truncate
                      text-xs text-muted-foreground
                      hover:text-foreground
                      hover:underline
                    "
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Usage */}
          <section className="border-t pt-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Usage
            </div>

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
