import { NextRequest, NextResponse } from "next/server";

const KLIPY_API_URL = "https://api.klipy.com/v2";
const REQUEST_TIMEOUT_MS = 10_000;
const RESULTS_PER_PAGE = 12;

interface KlipyMediaFormat {
  url?: string;
  dims?: [number, number];
  size?: number;
}

interface KlipyResult {
  id: string;
  title?: string;
  media_formats?: {
    tinygif?: KlipyMediaFormat;
    nanogif?: KlipyMediaFormat;
  };
}

interface GifResult {
  id: string;
  title: string;
  src: string;
  preview: string;
  width: number;
  height: number;
}

function json(body: unknown, status = 200, extraHeaders?: HeadersInit) {
  const headers = new Headers(extraHeaders);

  headers.set("Cache-Control", "no-store");

  return NextResponse.json(body, {
    status,
    headers,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMediaFormat(value: unknown): value is KlipyMediaFormat {
  if (!isRecord(value)) {
    return false;
  }

  if (value.url !== undefined && typeof value.url !== "string") {
    return false;
  }

  if (
    value.dims !== undefined &&
    (!Array.isArray(value.dims) ||
      value.dims.length !== 2 ||
      !value.dims.every(
        (dimension) =>
          typeof dimension === "number" &&
          Number.isFinite(dimension) &&
          dimension >= 0,
      ))
  ) {
    return false;
  }

  if (
    value.size !== undefined &&
    (typeof value.size !== "number" ||
      !Number.isFinite(value.size) ||
      value.size < 0)
  ) {
    return false;
  }

  return true;
}

function isKlipyResult(value: unknown): value is KlipyResult {
  if (!isRecord(value) || typeof value.id !== "string") {
    return false;
  }

  if (value.title !== undefined && typeof value.title !== "string") {
    return false;
  }

  if (value.media_formats === undefined) {
    return true;
  }

  if (!isRecord(value.media_formats)) {
    return false;
  }

  const { tinygif, nanogif } = value.media_formats;

  return (
    (tinygif === undefined || isMediaFormat(tinygif)) &&
    (nanogif === undefined || isMediaFormat(nanogif))
  );
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.KLIPY_API_KEY?.trim();

  if (!apiKey) {
    console.error("KLIPY_API_KEY is not configured");

    return json(
      {
        error: "GIF service is not configured.",
        code: "KLIPY_NOT_CONFIGURED",
      },
      500,
    );
  }

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const pos = request.nextUrl.searchParams.get("pos")?.trim();

  const endpoint = query ? "search" : "featured";

  const params = new URLSearchParams({
    key: apiKey,
    country: "US",
    locale: "en_US",
    contentfilter: "medium",
    media_filter: "tinygif,nanogif",
    limit: String(RESULTS_PER_PAGE),
  });

  if (query) {
    params.set("q", query);
  }

  if (pos && pos !== "0") {
    params.set("pos", pos);
  }

  try {
    const response = await fetch(
      `${KLIPY_API_URL}/${endpoint}?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!response.ok) {
      // Log only the endpoint and status, never the URL containing the key.
      console.error(`KLIPY ${endpoint} failed (${response.status})`);

      const rateLimited = response.status === 429;
      const retryAfter = response.headers.get("Retry-After");
      const headers = new Headers();

      if (rateLimited && retryAfter) {
        headers.set("Retry-After", retryAfter);
      }

      return json(
        {
          error: rateLimited
            ? "GIF service request limit reached. Please try again later."
            : "GIF service returned an error.",
          code: rateLimited ? "KLIPY_RATE_LIMITED" : "KLIPY_UPSTREAM_ERROR",
          upstreamStatus: response.status,
        },
        rateLimited ? 429 : 502,
        headers,
      );
    }

    let data: unknown;

    try {
      data = await response.json();
    } catch (error) {
      // Let the outer handler distinguish a body-read timeout.
      if (error instanceof Error && error.name === "TimeoutError") {
        throw error;
      }

      console.error(`KLIPY ${endpoint}: invalid JSON response`);

      return json(
        {
          error: "GIF service returned an invalid response.",
          code: "KLIPY_INVALID_RESPONSE",
        },
        502,
      );
    }

    if (
      !isRecord(data) ||
      !Array.isArray(data.results) ||
      !data.results.every(isKlipyResult)
    ) {
      console.error(`KLIPY ${endpoint}: invalid results structure`);

      return json(
        {
          error: "GIF service returned an invalid response.",
          code: "KLIPY_INVALID_RESPONSE",
        },
        502,
      );
    }

    const results = data.results
      .map((gif): GifResult | null => {
        const tiny = gif.media_formats?.tinygif;
        const nano = gif.media_formats?.nanogif;

        // Publishing: prefer tinygif, with nanogif as the fallback.
        // Never fall back to the large original GIF.
        const selected = tiny?.url ? tiny : nano;

        if (!selected?.url) {
          return null;
        }

        return {
          id: gif.id,
          title: gif.title || "GIF",

          // Save this URL when attaching the GIF.
          src: selected.url,

          // Use tinygif for a clearer picker preview.
          preview: selected.url,

          width: selected.dims?.[0] ?? 0,
          height: selected.dims?.[1] ?? 0,
        };
      })
      .filter((gif): gif is GifResult => gif !== null);

    if (data.results.length > 0 && results.length === 0) {
      console.error(`KLIPY ${endpoint}: no usable tinygif/nanogif URLs`);

      return json(
        {
          error: "GIF results were returned without usable GIF URLs.",
          code: "KLIPY_MEDIA_FORMAT_MISMATCH",
        },
        502,
      );
    }

    const cursor =
      typeof data.next === "string" ||
      (typeof data.next === "number" && Number.isFinite(data.next))
        ? String(data.next).trim()
        : "";

    return json({
      results,
      next: cursor && cursor !== "0" ? cursor : null,
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";

    console.error(
      `KLIPY ${endpoint}: ${timedOut ? "request timed out" : "request failed"}`,
    );

    return json(
      {
        error: timedOut
          ? "GIF service timed out. Please try again."
          : "Could not load GIFs. Please try again.",
        code: timedOut ? "KLIPY_TIMEOUT" : "KLIPY_REQUEST_ERROR",
      },
      timedOut ? 504 : 502,
    );
  }
}
