import { NextRequest, NextResponse } from "next/server";

const KLIPY_API_URL = "https://api.klipy.com/v2";

interface KlipyMediaFormat {
  url?: string;
  preview?: string;
  dims?: [number, number];
}

interface KlipyResult {
  id: string;
  title?: string;
  media_formats?: {
    gif?: KlipyMediaFormat;
    tinygif?: KlipyMediaFormat;
  };
}

interface KlipyResponse {
  results?: KlipyResult[];
  next?: string;
}

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.KLIPY_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "KLIPY_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q")?.trim() ?? "";
    const pos = searchParams.get("pos");

    // Search when q exists.
    // Otherwise show KLIPY's featured GIFs.
    const endpoint = query ? "search" : "featured";

    const params = new URLSearchParams({
      key: apiKey,
      country: "US",
      locale: "en_US",
      contentfilter: "medium",
      media_filter: "gif,tinygif",
      limit: "24",
    });

    if (query) {
      params.set("q", query);
    }

    if (pos) {
      params.set("pos", pos);
    }

    const response = await fetch(
      `${KLIPY_API_URL}/${endpoint}?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
        },

        // GIF results can change frequently.
        cache: "no-store",
      },
    );

    if (!response.ok) {
      console.error("KLIPY API error:", response.status, await response.text());

      return NextResponse.json(
        { error: "Failed to fetch GIFs from KLIPY" },
        { status: response.status },
      );
    }

    const data = (await response.json()) as KlipyResponse;

    const results = (data.results ?? [])
      .map((gif) => {
        const full = gif.media_formats?.gif;
        const tiny = gif.media_formats?.tinygif;

        // Full GIF is what we'll eventually insert into the post.
        const src = full?.url ?? tiny?.url;

        // Prefer tinygif inside the picker to reduce bandwidth.
        const preview = tiny?.url ?? full?.url;

        if (!src) {
          return null;
        }

        const dimensions = full?.dims ?? tiny?.dims;

        return {
          id: gif.id,
          title: gif.title ?? "GIF",

          src,
          preview,

          width: dimensions?.[0] ?? 0,
          height: dimensions?.[1] ?? 0,
        };
      })
      .filter(
        (
          gif,
        ): gif is {
          id: string;
          title: string;
          src: string;
          preview: string;
          width: number;
          height: number;
        } => gif !== null,
      );

    return NextResponse.json({
      results,
      next: data.next ?? null,
    });
  } catch (error) {
    console.error("KLIPY route error:", error);

    return NextResponse.json(
      { error: "Failed to fetch GIFs" },
      { status: 500 },
    );
  }
}
