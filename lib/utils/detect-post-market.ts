// lib/utils/detect-post-market.ts

import type { JSONContent } from "@tiptap/react";
import {
  ALL_MARKET_SYMBOLS,
  type MarketSymbolItem,
} from "@/lib/data/market-symbols";

function getTextFromTiptap(node: JSONContent): string {
  let text = "";

  if (node.text) {
    text += `${node.text} `;
  }

  if (node.content) {
    for (const child of node.content) {
      text += getTextFromTiptap(child);
    }
  }

  return text;
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsWholePhrase(text: string, candidate: string) {
  if (!candidate) return false;

  return ` ${text} `.includes(` ${candidate} `);
}

function findMarket(text: string): MarketSymbolItem | null {
  const normalizedText = normalize(text);

  if (!normalizedText) {
    return null;
  }

  for (const market of ALL_MARKET_SYMBOLS) {
    const candidates = [market.name, market.displaySymbol, market.symbol]
      .filter((value): value is string => Boolean(value))
      .map(normalize)
      .filter((value) => value.length >= 3);

    const isMatch = candidates.some((candidate) =>
      containsWholePhrase(normalizedText, candidate),
    );

    if (isMatch) {
      return market;
    }
  }

  return null;
}

export function detectPostMarket(
  title: string,
  content: JSONContent,
): MarketSymbolItem | null {
  // 1. Title has priority
  const titleMarket = findMarket(title);

  if (titleMarket) {
    return titleMarket;
  }

  // 2. If title has no asset, inspect the post body
  const contentText = getTextFromTiptap(content);

  return findMarket(contentText);
}
