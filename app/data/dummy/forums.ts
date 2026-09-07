export interface ForumItem {
  id: number;
  name: string;
  description: string;
  href: string;
  iconName: string; // Lucide icon key
  postCountToday: number;
  isHot?: boolean;
}

export const DUMMY_FORUMS: ForumItem[] = [
  {
    id: 1,
    name: "General Discussion",
    description: "Open floor for market broad chatter, ideas & lounge",
    href: "/forum/general",
    iconName: "MessageCircle",
    postCountToday: 142,
  },
  {
    id: 2,
    name: "US Equities",
    description: "S&P 500, NASDAQ, mega-caps & small-cap picks",
    href: "/forum/us-stocks",
    iconName: "TrendingUp",
    postCountToday: 310,
    isHot: true,
  },
  {
    id: 3,
    name: "Global Markets",
    description:
      "Macro economics, forex, interest rates & international indices",
    href: "/forum/global",
    iconName: "Globe",
    postCountToday: 85,
  },
  {
    id: 4,
    name: "Crypto & Web3",
    description: "Bitcoin, Ethereum, DeFi protocols & altcoin technicals",
    href: "/forum/crypto",
    iconName: "Coins",
    postCountToday: 264,
    isHot: true,
  },
  {
    id: 5,
    name: "IPOs & SPACs",
    description: "Upcoming listings, S-1 breakdowns & valuation reviews",
    href: "/forum/ipo",
    iconName: "Rocket",
    postCountToday: 39,
  },
  {
    id: 6,
    name: "Technical Analysis",
    description: "Chart patterns, support/resistance, indicators & setups",
    href: "/forum/analysis",
    iconName: "LineChart",
    postCountToday: 198,
  },
  {
    id: 7,
    name: "Trading Journals",
    description:
      "Community logs, trade breakdowns & risk management strategies",
    href: "/forum/journals",
    iconName: "BookOpen",
    postCountToday: 52,
  },
  {
    id: 8,
    name: "Q&A / Beginners",
    description:
      "Ask questions, learn order types, and master finance fundamentals",
    href: "/forum/qna",
    iconName: "HelpCircle",
    postCountToday: 116,
  },
  {
    id: 9,
    name: "Real-time News",
    description: "Fast-breaking market headlines, SEC filings & press releases",
    href: "/forum/news-feed",
    iconName: "Zap",
    postCountToday: 420,
    isHot: true,
  },
  {
    id: 10,
    name: "Feedback & Site Support",
    description: "App updates, feature requests & technical support",
    href: "/forum/support",
    iconName: "LifeBuoy",
    postCountToday: 14,
  },
];
