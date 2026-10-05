import { MARKET_SYMBOLS } from "@/lib/data/market-symbols";

export interface BriefCountryConfig {
  country: string;
  name: string;
  region: string;

  indices: {
    symbol: string;
    name: string;
  }[];
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  BR: "Brazil",
  MX: "Mexico",

  JP: "Japan",
  CN: "China",
  HK: "Hong Kong",
  IN: "India",
  TW: "Taiwan",
  KR: "South Korea",
  AU: "Australia",
  SG: "Singapore",
  ID: "Indonesia",

  EU: "Euro area",
  DE: "Germany",
  GB: "United Kingdom",
  FR: "France",
  IT: "Italy",
  CH: "Switzerland",
  ES: "Spain",
  NL: "Netherlands",
  SE: "Sweden",

  SA: "Saudi Arabia",
  ZA: "South Africa",
};

function buildBriefCountries(): BriefCountryConfig[] {
  const countries = new Map<string, BriefCountryConfig>();

  for (const [region, markets] of Object.entries(MARKET_SYMBOLS)) {
    for (const market of markets) {
      if (market.assetType !== "index" || !market.country) {
        continue;
      }

      const country = market.country;
      const name = COUNTRY_NAMES[country];

      if (!name) {
        throw new Error(`Missing country name: ${country}.`);
      }

      let config = countries.get(country);

      if (!config) {
        config = {
          country,
          name,
          region,
          indices: [],
        };

        countries.set(country, config);
      }

      if (config.region !== region) {
        throw new Error(`Conflicting regions for country: ${country}.`);
      }

      if (!config.indices.some((index) => index.symbol === market.symbol)) {
        config.indices.push({
          symbol: market.symbol,
          name: market.name,
        });
      }
    }
  }

  return [...countries.values()];
}

export const BRIEF_COUNTRIES: BriefCountryConfig[] = buildBriefCountries();

export function getBriefCountryConfig(country: string): BriefCountryConfig {
  const config = BRIEF_COUNTRIES.find((item) => item.country === country);

  if (!config) {
    throw new Error(`Unsupported brief country: ${country}.`);
  }

  return config;
}
