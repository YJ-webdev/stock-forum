// app/components/home-ai-brief.tsx

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
  const availableBriefs = briefs.filter(
    (item) => item.brief.summary.trim().length > 0,
  );

  if (availableBriefs.length === 0) {
    return null;
  }

  return (
    <div className="w-full px-4 text-zinc-900 dark:text-zinc-300">
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {availableBriefs.map((item) => {
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
            <article
              key={item.country}
              className="grid gap-4 py-6  text-zinc-800 dark:font-light dark:text-zinc-300 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)] md:gap-8"
            >
              {/* Country */}
              <div className="min-w-0">
                {/* <span className="outfit text-sm font-normal">
                  {item.country}
                </span> */}

                <h3 className="outfit text-[26px] font-semibold text-gray-500/50 dark:text-zinc-600">
                  {item.name}
                </h3>

                {coverageLabel && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span>
                      As of
                      <time dateTime={item.coverageDate}>{coverageLabel}</time>
                    </span>
                  </p>
                )}
              </div>

              {/* Brief */}
              <div className="min-w-0 space-y-4">
                <p className="whitespace-pre-line text-[15px] leading-6.5 tracking-[0.02em]">
                  {item.brief.summary}
                </p>

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

                {sourceLogos.length > 0 && (
                  <div className="flex justify-end">
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
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
