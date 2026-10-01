import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GenerateMarketBriefInput {
  symbol: string;
  name: string;
  displaySymbol?: string | null;

  marketData: {
    lastPrice: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
  };
}

export interface MarketBriefSource {
  title: string;
  url: string;
}

export interface MarketBriefContent {
  summary: string;
  keyFactors: string[];
}

export interface GeneratedMarketBrief {
  brief: MarketBriefContent;

  sources: MarketBriefSource[];

  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    webSearchCalls: number;
  };
}

type MarketBriefResponseParams = ResponseCreateParamsNonStreaming & {
  max_tool_calls?: number | null;
};

export async function generateMarketBrief({
  symbol,
  name,
  displaySymbol,
  marketData,
}: GenerateMarketBriefInput): Promise<GeneratedMarketBrief> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const direction =
    marketData.changePercent > 0
      ? "higher"
      : marketData.changePercent < 0
        ? "lower"
        : "roughly unchanged";

  const absoluteChangePercent = Math.abs(marketData.changePercent).toFixed(2);

  const request: MarketBriefResponseParams = {
    model: "gpt-6-luna",

    reasoning: {
      effort: "none",
    },

    store: false,

    tools: [
      {
        type: "web_search",
        search_context_size: "low",
      },
    ],

    // A brief must always use current research.
    tool_choice: "required",

    // Hard ceiling: at most one built-in tool call.
    // Since web_search is our only built-in tool,
    // this effectively limits each brief to one web search.
    max_tool_calls: 1,

    // Return the URLs consulted by web search.
    include: ["web_search_call.action.sources"],

    text: {
      format: {
        type: "json_schema",
        name: "market_brief",
        strict: true,

        schema: {
          type: "object",

          properties: {
            summary: {
              type: "string",
            },

            keyFactors: {
              type: "array",
              items: {
                type: "string",
              },
              minItems: 2,
              maxItems: 3,
            },
          },

          required: ["summary", "keyFactors"],

          additionalProperties: false,
        },
      },
    },

    input: `
Create a concise, factual AI Market Brief for BullBearVote.

Your job is to help a reader quickly understand what matters for this specific market right now.

MARKET

Name: ${name}
Symbol: ${symbol}
Display symbol: ${displaySymbol ?? symbol}

CURRENT MARKET DATA

BullBearVote provides the following market data:

- Last price: ${marketData.lastPrice}
- Change: ${marketData.change}
- Change percent: ${marketData.changePercent}%
- Session high: ${marketData.high}
- Session low: ${marketData.low}

The observed market state is that ${name} is currently ${direction} by approximately ${absoluteChangePercent}%.

Treat these values as authoritative for this task.

Do NOT use web search to look up, verify, or replace:
- current or last price
- closing price
- daily change
- daily percentage change
- session high
- session low

Do not mention that these values were "supplied", "provided", or given by BullBearVote in the final brief.

RESEARCH OBJECTIVE

Research the most important RECENT developments that help explain the current market environment surrounding this observed move.

The research must be specific to ${name}.

A useful factor should answer:

"Why does this matter specifically to ${name} right now?"

Do not produce a generic financial or macroeconomic summary that could be reused for another index or market.

FRESHNESS

Prioritize information from the current trading day or the most recent relevant market session.

Use older developments only when they remain materially relevant to the current market environment.

Do not include an older event merely because it is important in general.

Prefer the most recent reliable reporting when multiple sources describe the same development.

RESEARCH PRIORITY

Prioritize information in this order:

1. Developments explicitly connected to ${name} or its underlying market.

2. Major sectors, industries, or constituents that are materially influencing ${name}.

3. Market-wide developments such as bond yields, monetary policy, economic data, earnings, or central-bank actions when reliable reporting connects them to the current trading environment for ${name}.

4. Geopolitical, commodity, currency, or other macro developments only when they have a clear material connection to ${name} or important sectors within it.

Prefer specific market evidence over broad macroeconomic commentary.

Ignore:
- minor news
- weakly related news
- generic financial commentary
- developments with no clear relevance to ${name}
- repetitive versions of the same factor

SOURCE QUALITY

Prefer:
1. primary or official sources when appropriate
2. major reputable financial news organizations
3. other credible financial publications when necessary

Do not rely on low-quality aggregation, speculation, social-media commentary, or unsupported opinion when stronger sources are available.

Multiple articles describing the same event should normally be treated as one factor, not separate factors.

CAUSATION AND EVIDENCE

Do NOT assume that recent news caused the observed market move.

Only describe something as:
- a driver
- a cause
- pressure
- support
- a contributor

when reliable reporting or primary evidence explicitly supports that connection.

If a development is relevant but its direct contribution to the observed move is uncertain, describe it as market context rather than a cause.

Never invent a causal explanation simply because two events occurred at roughly the same time.

Do not exaggerate the importance of a development.

If reliable evidence does not establish why ${name} is moving, say so naturally and briefly.

Do not manufacture an explanation merely to make the brief sound complete.

SUMMARY

Write 1-2 concise sentences.

The summary should:
- state the current condition of ${name} naturally
- identify the strongest verified market-specific context
- tell the reader what is most important about the current environment
- avoid simply repeating the supplied price numbers
- avoid repeating all of the key factors
- acknowledge uncertainty briefly when the cause of the move is not well established

Write for a general market reader.

Do NOT use phrases such as:
- "the supplied data"
- "the provided data"
- "according to the prompt"
- "the research shows"
- "the sources indicate"

The summary should read like a short professional market brief, not an explanation of how the brief was generated.

KEY FACTORS

Return 2-3 distinct factors.

Each factor must:
- contain a concrete recent development
- explain why it matters specifically to ${name}
- add information not already fully explained in the summary
- be understandable without opening the source
- remain concise

Prefer 2 strong factors over 3 weak factors.

Do not fill the list simply to reach three items.

Where appropriate, connect a development to:
- an important sector
- major constituents
- valuation conditions
- interest-rate sensitivity
- earnings expectations
- investor risk sentiment
- another concrete transmission channel relevant to ${name}

Only make such connections when they are supported by reliable evidence or are straightforward factual market relationships.

WRITING STYLE

Write naturally for a general market reader.

Use clear, direct English.

Be concise and information-dense.

Avoid:
- vague phrases
- filler
- sensational language
- excessive financial jargon
- repetitive explanations
- generic statements that could apply to most markets

Do not make the brief sound alarmist or promotional.

Do not refer to the process used to generate the brief.

Do not include citations, URLs, domains, publication names, source names, or Markdown links inside summary or keyFactors.

Sources are handled separately by the application.

FINAL RULES

- Do not predict whether ${name} will rise or fall.
- Do not make a Bull or Bear prediction.
- Do not forecast short-term market direction.
- Do not recommend buying, selling, holding, or avoiding any asset.
- Do not provide investment advice.
- Do not provide a confidence score.
- Do not invent facts, events, relationships, or explanations.
- Do not present uncertain causation as established fact.
- Do not use Markdown formatting.
- Do not include a title.
- Do not include a conclusion.
- Do not include anything outside the requested structured output.
`.trim(),
  };

  const response = await openai.responses.create(request);

  if (!response.output_text) {
    throw new Error("OpenAI returned an empty market brief.");
  }

  let brief: MarketBriefContent;

  try {
    brief = JSON.parse(response.output_text) as MarketBriefContent;
  } catch {
    throw new Error("Failed to parse AI Market Brief response.");
  }

  const sources = new Map<string, MarketBriefSource>();

  let webSearchCalls = 0;

  for (const item of response.output) {
    if (item.type !== "web_search_call") {
      continue;
    }

    // Only count actual search actions.
    if (item.action?.type !== "search") {
      continue;
    }

    webSearchCalls += 1;

    for (const source of item.action.sources ?? []) {
      if (!source.url) {
        continue;
      }

      sources.set(source.url, {
        title: getSourceLabel(source.url),
        url: source.url,
      });
    }
  }

  return {
    brief,

    sources: Array.from(sources.values()),

    usage: {
      inputTokens: response.usage?.input_tokens ?? 0,

      outputTokens: response.usage?.output_tokens ?? 0,

      totalTokens: response.usage?.total_tokens ?? 0,

      webSearchCalls,
    },
  };
}

function getSourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
