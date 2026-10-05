// app/api/cron/ai-market-brief/route.ts

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { BRIEF_COUNTRIES } from "@/lib/ai/brief-countries";
import { generateAndSaveCountryBrief } from "@/lib/ai/update-country-brief";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface CronResult {
  country: string;
  status: "updated" | "skipped" | "failed";
  coverageDate?: string;
  reason?: string;
}

export async function GET(request: Request) {
  const headers = {
    "Cache-Control": "no-store",
  };

  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[Country AI brief cron] Missing CRON_SECRET.");

    return NextResponse.json(
      { error: "Cron authentication is not configured." },
      { status: 500, headers },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers },
    );
  }

  const startedAt = Date.now();

  try {
    const enabled = await prisma.countryAiBrief.findMany({
      where: {
        enabled: true,
        country: {
          in: BRIEF_COUNTRIES.map((item) => item.country),
        },
      },

      select: {
        country: true,
      },
    });

    const enabledCodes = new Set(enabled.map((item) => item.country));

    const results: CronResult[] = [];

    for (const config of BRIEF_COUNTRIES) {
      const country = config.country;

      if (!enabledCodes.has(country)) {
        results.push({
          country,
          status: "skipped",
          reason: "disabled",
        });

        continue;
      }

      try {
        const generated = await generateAndSaveCountryBrief(country);

        results.push({
          country,
          status: generated.status,

          coverageDate:
            "coverageDate" in generated ? generated.coverageDate : undefined,

          reason: generated.status === "skipped" ? generated.reason : undefined,
        });
      } catch (error) {
        console.error(`[Country AI brief cron] Failed: ${country}`, error);

        results.push({
          country,
          status: "failed",
        });
      }
    }

    const updatedCount = results.filter(
      (item) => item.status === "updated",
    ).length;

    const skippedCount = results.filter(
      (item) => item.status === "skipped",
    ).length;

    const failedCount = results.filter(
      (item) => item.status === "failed",
    ).length;

    const durationMs = Date.now() - startedAt;

    console.info("[Country AI brief cron] Finished", {
      updatedCount,
      skippedCount,
      failedCount,
      durationMs,
    });

    return NextResponse.json(
      {
        success: failedCount === 0,
        updatedCount,
        skippedCount,
        failedCount,
        durationMs,
        results,
      },
      {
        status: failedCount > 0 ? 500 : 200,
        headers,
      },
    );
  } catch (error) {
    console.error("[Country AI brief cron] Failed", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process country AI briefs.",
      },
      {
        status: 500,
        headers,
      },
    );
  }
}
