import YahooFinance from "yahoo-finance2";

const yahoo = new YahooFinance();

// -----------------------------------------------------------------------------
// PROVIDER SYMBOL OVERRIDES
// -----------------------------------------------------------------------------

const PROVIDER_SYMBOLS: Record<string, string> = {
  TOPIX: "1306.T",
};

// -----------------------------------------------------------------------------
// GET REFERENCE CLOSE
// -----------------------------------------------------------------------------

export async function getReferenceClose(
  rawSymbol: string,
  sessionDate: Date,
): Promise<number> {
  const symbol = PROVIDER_SYMBOLS[rawSymbol] || rawSymbol;

  if (!(sessionDate instanceof Date) || Number.isNaN(sessionDate.getTime())) {
    throw new Error("Invalid prediction session.");
  }

  /*
   * Fetch enough history to safely cross:
   *
   * - weekends
   * - normal exchange holidays
   * - consecutive holidays
   *
   * We deliberately use daily candles because referenceClose must represent
   * an actual completed trading session, not an intraday/latest quote.
   */
  const period1 = new Date(sessionDate.getTime() - 14 * 24 * 60 * 60 * 1000);

  const period2 = new Date(sessionDate);

  const result = (await yahoo.chart(symbol, {
    period1,
    period2,
    interval: "1d",
    includePrePost: false,
  })) as any;

  const quotes = Array.isArray(result?.quotes) ? result.quotes : [];

  // ---------------------------------------------------------------------------
  // FIND THE LAST VALID COMPLETED CANDLE BEFORE THE TARGET SESSION
  // ---------------------------------------------------------------------------

  const validQuotes = quotes
    .filter((quote: any) => {
      if (!quote?.date) {
        return false;
      }

      if (quote.close == null) {
        return false;
      }

      const timestamp = new Date(quote.date).getTime();
      const close = Number(quote.close);

      return (
        Number.isFinite(timestamp) &&
        timestamp < sessionDate.getTime() &&
        Number.isFinite(close) &&
        close > 0
      );
    })
    .sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

  const previousSession = validQuotes[validQuotes.length - 1];

  if (!previousSession) {
    throw new Error(
      `Could not find a completed previous trading session for ${rawSymbol}.`,
    );
  }

  const referenceClose = Number(previousSession.close);

  if (!Number.isFinite(referenceClose) || referenceClose <= 0) {
    throw new Error(
      `Invalid previous closing price returned for ${rawSymbol}.`,
    );
  }

  return referenceClose;
}
