export type AutoModerationReason = "LINK" | "SPAM" | "ADULT" | "CONTACT_INFO";

export interface ModerationResult {
  shouldBePrivate: boolean;
  reasons: AutoModerationReason[];
}

// -----------------------------------------------------------------------------
// Trusted domains
// -----------------------------------------------------------------------------

const TRUSTED_DOMAINS = new Set([
  "reuters.com",
  "bloomberg.com",
  "finance.yahoo.com",
  "yahoo.com",
  "wsj.com",
  "ft.com",
  "cnbc.com",
  "marketwatch.com",
  "investing.com",
  "sec.gov",
]);

// -----------------------------------------------------------------------------
// Patterns
// -----------------------------------------------------------------------------

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.)[^\s<]+|\b[a-z0-9][a-z0-9.-]*\.(?:com|net|org|io|co|me|gg|xyz|top|site|online|click|info|biz)(?:\/[^\s<]*)?/gi;

const CONTACT_PATTERNS: RegExp[] = [
  /\btelegram\b/i,
  /\bwhatsapp\b/i,
  /\bwechat\b/i,
  /\bkakao\s*talk\b/i,
  /\bkakaotalk\b/i,

  /\bcontact\s+(?:me|us)\b/i,
  /\bdm\s+(?:me|us)\b/i,
  /\bmessage\s+(?:me|us)\b/i,

  /\bt\.me\/[a-z0-9_]+/i,
  /\bwa\.me\/\d+/i,
];

const SPAM_PATTERNS: RegExp[] = [
  /\bguaranteed\s+(?:profit|profits|return|returns|income)\b/i,

  /\b(?:100|200|300|500|1000)%\s+(?:profit|return|returns)\b/i,

  /\bfree\s+(?:trading\s+)?signals?\b/i,

  /\b(?:crypto|stock|forex)\s+signals?\b/i,

  /\bjoin\s+(?:my|our|the)\s+(?:group|channel|community)\b/i,

  /\b(?:double|triple)\s+your\s+(?:money|investment)\b/i,

  /\bmake\s+\$?\d+(?:,\d{3})*\s+(?:a|per)\s+day\b/i,

  /\bearn\s+\$?\d+(?:,\d{3})*\s+(?:a|per)\s+day\b/i,

  /\bpassive\s+income\b/i,

  /\blimited\s+time\s+offer\b/i,

  /\bclick\s+(?:here|below)\b/i,

  /\bsign\s+up\s+(?:here|now|today)\b/i,
];

const ADULT_PATTERNS: RegExp[] = [
  /\bporn(?:ography|ographic)?\b/i,
  /\bxxx\b/i,
  /\bonlyfans\b/i,

  /\b(?:watch|view)\s+(?:free\s+)?porn\b/i,

  /\b(?:nude|nudes)\s+(?:pics?|photos?|videos?)\b/i,

  /\b(?:adult|sex)\s+(?:chat|dating|video|videos|site|sites)\b/i,

  /\bescort\s+(?:service|services)\b/i,
];

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function normalizeDomain(domain: string): string {
  return domain
    .toLowerCase()
    .replace(/^www\./, "")
    .replace(/\.$/, "");
}

function isTrustedDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain);

  for (const trusted of TRUSTED_DOMAINS) {
    if (normalized === trusted || normalized.endsWith(`.${trusted}`)) {
      return true;
    }
  }

  return false;
}

function extractDomain(value: string): string | null {
  try {
    const normalizedUrl =
      value.startsWith("http://") || value.startsWith("https://")
        ? value
        : `https://${value}`;

    const url = new URL(normalizedUrl);

    return normalizeDomain(url.hostname);
  } catch {
    return null;
  }
}

function extractUrls(text: string): string[] {
  return text.match(URL_PATTERN) ?? [];
}

function matchesAnyPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

// -----------------------------------------------------------------------------
// Moderation
// -----------------------------------------------------------------------------

export function moderateContent(rawText: string): ModerationResult {
  const text = rawText.normalize("NFKC").replace(/\s+/g, " ").trim();

  if (!text) {
    return {
      shouldBePrivate: false,
      reasons: [],
    };
  }

  const reasons = new Set<AutoModerationReason>();

  // ---------------------------------------------------------------------------
  // Links
  // ---------------------------------------------------------------------------

  const urls = extractUrls(text);

  if (urls.length > 0) {
    const hasUntrustedLink = urls.some((value) => {
      const domain = extractDomain(value);

      if (!domain) {
        return true;
      }

      return !isTrustedDomain(domain);
    });

    if (hasUntrustedLink) {
      reasons.add("LINK");
    }
  }

  // ---------------------------------------------------------------------------
  // Contact information
  // ---------------------------------------------------------------------------

  if (matchesAnyPattern(text, CONTACT_PATTERNS)) {
    reasons.add("CONTACT_INFO");
  }

  // ---------------------------------------------------------------------------
  // Spam / advertising
  // ---------------------------------------------------------------------------

  if (matchesAnyPattern(text, SPAM_PATTERNS)) {
    reasons.add("SPAM");
  }

  // ---------------------------------------------------------------------------
  // Adult content
  // ---------------------------------------------------------------------------

  if (matchesAnyPattern(text, ADULT_PATTERNS)) {
    reasons.add("ADULT");
  }

  return {
    shouldBePrivate: reasons.size > 0,
    reasons: [...reasons],
  };
}
