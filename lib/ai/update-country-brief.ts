import "server-only";

import { getBriefCountryConfig } from "@/lib/ai/brief-countries";
import { generateCountryBrief } from "@/lib/ai/generate-country-brief";
import { prisma } from "@/lib/prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function getCompletedResearchPeriod(now = new Date()) {
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const periodStart = new Date(periodEnd.getTime() - ONE_DAY_MS);

  return {
    coverageDate: periodStart.toISOString().slice(0, 10),
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
  };
}

export async function generateAndSaveCountryBrief(
  country: string,
  force = false,
) {
  const config = getBriefCountryConfig(country);
  const period = getCompletedResearchPeriod();

  const existing = await prisma.countryAiBrief.findUnique({
    where: {
      country: config.country,
    },

    select: {
      enabled: true,
      content: true,
      coverageDate: true,
    },
  });

  // Manual generation also respects the enabled setting.
  if (!existing?.enabled) {
    return {
      status: "skipped" as const,
      reason: "disabled" as const,
      country: config.country,
      coverageDate: period.coverageDate,
    };
  }

  if (
    !force &&
    existing.content?.trim() &&
    existing.coverageDate &&
    existing.coverageDate >= period.coverageDate
  ) {
    await prisma.countryAiBrief.update({
      where: {
        country: config.country,
      },

      data: {
        lastCheckedAt: new Date(),
      },
    });

    return {
      status: "skipped" as const,
      reason: "already_published" as const,
      country: config.country,
      coverageDate: existing.coverageDate,
    };
  }

  const result = await generateCountryBrief({
    country: config.country,
    countryName: config.name,
    indices: config.indices,
    ...period,
  });

  if (!result.brief.summary.trim()) {
    await prisma.countryAiBrief.updateMany({
      where: {
        country: config.country,
      },
      data: {
        lastCheckedAt: new Date(),
      },
    });

    return {
      status: "skipped" as const,
      reason: "no_supported_news" as const,
      country: config.country,
      coverageDate: period.coverageDate,
    };
  }

  const now = new Date();

  // Avoid overwriting a newer coverage period.
  // Non-forced writes also check that another request has not
  // already published this period.
  const saved = await prisma.countryAiBrief.updateMany({
    where: {
      country: config.country,
      enabled: true,

      ...(force
        ? {
            OR: [
              { coverageDate: null },
              { coverageDate: { lte: period.coverageDate } },
            ],
          }
        : {
            OR: [
              { coverageDate: null },
              { coverageDate: { lt: period.coverageDate } },
              {
                coverageDate: period.coverageDate,
                content: null,
              },
              {
                coverageDate: period.coverageDate,
                content: "",
              },
            ],
          }),
    },

    data: {
      content: JSON.stringify(result.brief),

      sources: result.sources.map((source) => ({
        title: source.title,
        url: source.url,
      })),

      coverageDate: period.coverageDate,
      publishedAt: now,
      lastCheckedAt: now,
    },
  });

  if (saved.count === 0) {
    return {
      status: "skipped" as const,
      reason: "setting_or_brief_changed" as const,
      country: config.country,
      coverageDate: period.coverageDate,
    };
  }

  return {
    status: "updated" as const,
    country: config.country,
    coverageDate: period.coverageDate,
    result,
  };
}
