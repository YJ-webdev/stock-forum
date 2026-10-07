"use server";

import { auth } from "@/auth";
import {
  BRIEF_COUNTRIES,
  getBriefCountryConfig,
} from "@/lib/ai/brief-countries";
import { generateAndSaveCountryBrief } from "@/lib/ai/update-country-brief";

import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
}

function parseBriefContent(
  content: string,
): { summary: string; keyFactors: string[] } | null {
  try {
    const parsed: unknown = JSON.parse(content);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    const value = parsed as Record<string, unknown>;

    if (
      typeof value.summary !== "string" ||
      !value.summary.trim() ||
      !Array.isArray(value.keyFactors) ||
      !value.keyFactors.every((factor: unknown) => typeof factor === "string")
    ) {
      return null;
    }

    return {
      summary: value.summary.trim(),
      keyFactors: value.keyFactors
        .map((factor: string) => factor.trim())
        .filter(Boolean),
    };
  } catch {
    return null;
  }
}

function parseBriefSources(value: unknown): { title: string; url: string }[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item: unknown) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return [];
    }

    const source = item as Record<string, unknown>;

    if (typeof source.title !== "string" || typeof source.url !== "string") {
      return [];
    }

    try {
      const url = new URL(source.url);

      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      ) {
        return [];
      }

      return [
        {
          title: source.title.trim() || url.hostname,
          url: url.href,
        },
      ];
    } catch {
      return [];
    }
  });
}

// Public home-page read.
export async function getHomeCountryBriefs() {
  const saved = await prisma.countryAiBrief.findMany({
    where: {
      enabled: true,
      content: { not: null },
      coverageDate: { not: null },
      publishedAt: { not: null },
    },
    select: {
      country: true,
      content: true,
      sources: true,
      coverageDate: true,
      publishedAt: true,
    },
  });

  const savedByCountry = new Map(saved.map((item) => [item.country, item]));

  return BRIEF_COUNTRIES.flatMap((config) => {
    const item = savedByCountry.get(config.country);

    // 여기: 기존 null 검사 교체
    if (!item?.content || !item.coverageDate || !item.publishedAt) {
      return [];
    }

    const brief = parseBriefContent(item.content);

    if (!brief || !brief.summary.trim()) {
      return [];
    }

    return [
      {
        country: config.country,
        name: config.name,
        coverageDate: item.coverageDate,
        publishedAt: item.publishedAt.toISOString(),
        brief: {
          summary: brief.summary,
          keyFactors: brief.keyFactors,
        },
        sources: parseBriefSources(item.sources).map((source) => ({
          title: source.title,
          url: source.url,
        })),
      },
    ];
  });
}

// Admin country settings and generation status.
export async function getAiBriefCountries() {
  await requireAdmin();

  const records = await prisma.countryAiBrief.findMany({
    select: {
      country: true,
      enabled: true,
      coverageDate: true,
      publishedAt: true,
      lastCheckedAt: true,
    },
  });

  const recordByCountry = new Map(
    records.map((record) => [record.country, record]),
  );

  return BRIEF_COUNTRIES.map((config) => {
    const record = recordByCountry.get(config.country);

    return {
      country: config.country,
      name: config.name,
      region: config.region,
      indices: config.indices,
      enabled: record?.enabled ?? false,
      coverageDate: record?.coverageDate ?? null,
      publishedAt: record?.publishedAt ?? null,
      lastCheckedAt: record?.lastCheckedAt ?? null,
    };
  });
}

export async function setAiCountryBriefEnabled(
  country: string,
  enabled: boolean,
) {
  await requireAdmin();
  getBriefCountryConfig(country);

  return prisma.countryAiBrief.upsert({
    where: { country },

    create: {
      country,
      enabled,
    },

    update: {
      enabled,
    },

    select: {
      country: true,
      enabled: true,
    },
  });
}

export async function regenerateAiCountryBrief(country: string) {
  await requireAdmin();
  getBriefCountryConfig(country);

  return generateAndSaveCountryBrief(country, true);
}
