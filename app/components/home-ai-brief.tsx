// app/components/home-ai-brief.tsx
"use client";

import { useState } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface HomeAIBriefItem {
  country: string;
  name: string;
  region: string;

  coverageDate: string;
  publishedAt: Date | string;

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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

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
  const [openValues, setOpenValues] = useState<string[]>([]);

  const availableBriefs = briefs.filter(
    (item) => item.brief.summary.trim().length > 0,
  );

  if (availableBriefs.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 text-zinc-900 dark:text-zinc-300">
      <Accordion
        multiple={false}
        value={openValues}
        onValueChange={setOpenValues}
        className="w-full"
      >
        {availableBriefs.map((item) => {
          const isOpen = openValues.includes(item.country);
          const coverageLabel = formatCoverageDate(item.coverageDate);

          const seenDomains = new Set<string>();

          const sourceLogos = item.sources.flatMap((source) => {
            const url = getSafeSourceUrl(source.url);

            if (!url) {
              return [];
            }

            const domain = url.hostname.toLowerCase().replace(/^www\./, "");

            if (seenDomains.has(domain)) {
              return [];
            }

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
            <AccordionItem
              key={item.country}
              value={item.country}
              className="grid items-start gap-4 border-zinc-200 py-6 text-zinc-800 last:border-b-0 dark:border-zinc-800 dark:font-light dark:text-zinc-300 md:grid-cols-[260px_minmax(0,1fr)] md:gap-8"
            >
              {/* Country */}
              <div className="min-w-0 pl-4">
                <h3 className="outfit whitespace-nowrap text-[26px] font-semibold text-gray-500/50 dark:text-zinc-600">
                  {item.name}
                </h3>

                {coverageLabel && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    As of{" "}
                    <time dateTime={item.coverageDate}>{coverageLabel}</time>
                  </p>
                )}
              </div>

              {/* Brief */}
              <div className="min-w-0">
                {/* Two-line preview */}
                <div aria-hidden={isOpen} className="max-h-20 overflow-hidden">
                  <p className="m-0 px-4  whitespace-pre-line text-[15px] leading-6.5 tracking-[0.02em]">
                    {item.brief.summary}
                  </p>
                </div>

                {/* Expanded content — remove all default inner padding */}
                <AccordionContent className="m-0! p-0! text-zinc-800 dark:font-light dark:text-zinc-300 [&_div]:mx-0! [&_div]:px-0!">
                  {" "}
                  <div className="space-y-4">
                    <div className="overflow-hidden">
                      <p className="m-0 -mt-20 whitespace-pre-line text-[15px] leading-6.5 tracking-[0.02em]">
                        {item.brief.summary}
                      </p>
                    </div>

                    {item.brief.keyFactors.length > 0 && (
                      <ul className="space-y-2">
                        {item.brief.keyFactors.map((factor, index) => (
                          <li
                            key={`${item.country}-${index}`}
                            className="flex items-start gap-2.5 text-[15px] leading-6"
                          >
                            <span
                              aria-hidden="true"
                              className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-500"
                            />

                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </AccordionContent>

                {/* Text trigger */}
                <AccordionTrigger
                  aria-label={`${isOpen ? "Read less" : "Read more"} about ${item.name}`}
                  className="mt-3 flex items-center px-4 cursor-pointer py-0 justify-between text-xs font-normal text-zinc-500 hover:text-zinc-900 hover:no-underline dark:text-zinc-500 dark:hover:text-zinc-300 "
                >
                  {sourceLogos.length > 0 && (
                    <div className="flex">
                      <div className="isolate flex items-center">
                        {sourceLogos.map((source, index) => (
                          <a
                            key={source.domain}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={source.title}
                            aria-label={source.title}
                            className={`relative z-0 block h-5 w-5 shrink-0 overflow-hidden rounded-full hover:z-10 focus-visible:z-10 ${
                              index > 0 ? "-ml-0.75" : ""
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(source.domain)}&sz=64`}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* {isOpen ? "Read less" : "Read more"} */}
                </AccordionTrigger>
              </div>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
