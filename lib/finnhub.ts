// API wrapper & type definitions
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const BASE_URL = "https://finnhub.io/api/v1";

export interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price
  pc: number; // Previous close
  t: number; // Timestamp
}

export async function fetchFinnhubQuote(
  symbol: string,
): Promise<FinnhubQuote | null> {
  if (!FINNHUB_API_KEY) {
    console.error("Missing FINNHUB_API_KEY environment variable.");
    return null;
  }

  try {
    const res = await fetch(
      `${BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_API_KEY}`,
      { cache: "no-store" },
    );

    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error(
      `[Finnhub API Error] Quote fetch failed for ${symbol}:`,
      error,
    );
    return null;
  }
}
