// app/components/home-ai-brief.tsx
"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface HomeAIBriefItem {
  country: string;
  name: string;
  coverageDate: string;

  brief: {
    summary: string;
    keyFactors: string[];
  };

  sources: {
    title: string;
    url: string;
  }[];
}

interface HomeAIBriefProps {
  briefs: HomeAIBriefItem[];
}

function formatCoverageDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getSafeSourceUrl(value: string) {
  try {
    const url = new URL(value);

    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

export function HomeAIBrief({ briefs }: HomeAIBriefProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const contentId = useId();

  const availableBriefs = briefs.filter(
    (item) => item.brief.summary.trim().length > 0,
  );

  if (availableBriefs.length === 0) return null;

  const activeCountry = availableBriefs.some(
    (item) => item.country === selectedCountry,
  )
    ? selectedCountry!
    : availableBriefs[0].country;

  return (
    <div className="w-full rounded-xl bg-zinc-100/50 dark:bg-zinc-800/50 px-4 md:px-5 py-3 ">
      <Tabs
        value={activeCountry}
        onValueChange={(value) => {
          setSelectedCountry(value);
        }}
        className="w-full gap-3"
      >
        {/* Tabs + expand button */}
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0 overflow-x-auto">
            <TabsList
              variant="line"
              className="m-0! h-auto! w-max gap-6 rounded-none border-0 bg-transparent! p-0!"
            >
              {availableBriefs.map((item) => (
                <TabsTrigger
                  key={item.country}
                  value={item.country}
                  className="
                    outfit font-normal h-auto flex-none cursor-pointer
                    whitespace-nowrap rounded-none border-0 p-0!
                     text-zinc-400 shadow-none
                    before:hidden after:hidden
                    data-[state=active]:bg-transparent
                    data-[state=active]:text-zinc-900
                    data-[state=active]:shadow-none
                    dark:text-zinc-500
                    dark:data-[state=active]:bg-transparent
                    dark:data-[state=active]:text-zinc-300
                    data-active:bg-transparent
                    data-active:text-zinc-900
                    data-active:shadow-none
                    dark:data-active:bg-transparent
                    dark:data-active:text-zinc-300
                  "
                >
                  {item.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((open) => !open)}
            aria-label={
              isExpanded ? "Collapse market brief" : "Expand market brief"
            }
            aria-expanded={isExpanded}
            aria-controls={`${contentId}-${activeCountry}`}
            className="
  relative flex size-6 shrink-0 cursor-pointer items-center justify-center
  rounded-sm text-zinc-500 transition-colors
  after:absolute after:-inset-2.5 after:content-['']
  hover:text-zinc-900
  focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-zinc-400
  dark:hover:text-zinc-300
"
          >
            {isExpanded ? (
              <Minus className="size-4" strokeWidth={1.5} />
            ) : (
              <Plus className="size-4" strokeWidth={1.5} />
            )}
          </button>
        </div>

        {/* Selected brief */}
        {availableBriefs.map((item) => {
          const coverageLabel = formatCoverageDate(item.coverageDate);
          const seenDomains = new Set<string>();

          const sourceLogos = item.sources.flatMap((source) => {
            const url = getSafeSourceUrl(source.url);

            if (!url) return [];

            const domain = url.hostname.toLowerCase().replace(/^www\./, "");

            if (seenDomains.has(domain)) return [];

            seenDomains.add(domain);

            return [
              {
                title: source.title,
                url: url.href,
                domain,
              },
            ];
          });

          return (
            <TabsContent
              key={item.country}
              value={item.country}
              className="m-0 min-w-0 p-0 outfit font-[350] text-zinc-800 dark:text-zinc-300"
            >
              <div className="text-zinc-800 dark:font-light dark:text-zinc-300">
                <p
                  className={`
                    m-0 text-[15px] leading-6.5 tracking-[0.02em]
                    ${isExpanded ? "whitespace-pre-line" : "truncate"}
                  `}
                >
                  {item.brief.summary}
                </p>

                <div id={`${contentId}-${item.country}`} hidden={!isExpanded}>
                  {item.brief.keyFactors.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {item.brief.keyFactors.map((factor, index) => (
                        <li
                          key={`${item.country}-${index}`}
                          className="flex items-start gap-2.5 text-[15px] leading-6"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-2.5 size-1 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500"
                          />

                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Footer */}
                  {(sourceLogos.length > 0 || coverageLabel) && (
                    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 pb-1">
                      {sourceLogos.length > 0 && (
                        <div className="isolate flex items-center">
                          {sourceLogos.map((source, index) => (
                            <a
                              key={source.domain}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={source.title}
                              aria-label={source.title}
                              className={`relative z-0 block size-5 shrink-0 overflow-hidden rounded-full hover:z-10 focus-visible:z-10 ${
                                index > 0 ? "-ml-0.75" : ""
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(source.domain)}&sz=64`}
                                alt=""
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                className="size-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {coverageLabel && (
                        <p className="text-xs text-muted-foreground">
                          As of{" "}
                          <time dateTime={item.coverageDate}>
                            {coverageLabel}
                          </time>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
