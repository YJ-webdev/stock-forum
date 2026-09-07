export interface NewsItem {
  id: number;
  title: string;
  href: string;
  source: string;
  sourceIcon: string;
  timeAgo: string;
  category: string;
}

export const DUMMY_NEWS: NewsItem[] = [
  {
    id: 1,
    title: "Fed Signals Potential Rate Cut Ahead",
    href: "/news/1",
    source: "Bloomberg",
    sourceIcon:
      "https://www.google.com/s2/favicons?domain=bloomberg.com&sz=128",
    timeAgo: "4 mins ago",
    category: "Economy",
  },
  {
    id: 2,
    title: "Tech Giants Rally Following AI Chip Announcement",
    href: "/news/2",
    source: "Reuters",
    sourceIcon: "https://www.google.com/s2/favicons?domain=reuters.com&sz=128",
    timeAgo: "12 mins ago",
    category: "Tech",
  },
  {
    id: 3,
    title: "Nvidia Earnings Report Preview: What Investors Expect",
    href: "/news/3",
    source: "CNBC",
    sourceIcon: "https://www.google.com/s2/favicons?domain=cnbc.com&sz=128",
    timeAgo: "18 mins ago",
    category: "Markets",
  },
  {
    id: 4,
    title: "Crude Oil Fluctuation Drives Energy Sector Moves",
    href: "/news/4",
    source: "Financial Times",
    sourceIcon: "https://www.google.com/s2/favicons?domain=ft.com&sz=128",
    timeAgo: "25 mins ago",
    category: "Energy",
  },
  {
    id: 5,
    title: "Tesla Unveils Full Self-Driving Fleet Update",
    href: "/news/5",
    source: "Wall Street Journal",
    sourceIcon: "https://www.google.com/s2/favicons?domain=wsj.com&sz=128",
    timeAgo: "32 mins ago",
    category: "Automotive",
  },
  {
    id: 6,
    title: "Biotech Stocks Surge After Phase 3 Trial Success",
    href: "/news/6",
    source: "MarketWatch",
    sourceIcon:
      "https://www.google.com/s2/favicons?domain=marketwatch.com&sz=128",
    timeAgo: "41 mins ago",
    category: "Healthcare",
  },
  {
    id: 7,
    title: "USD Strengthens Amid Global Market Uncertainty",
    href: "/news/7",
    source: "Barron's",
    sourceIcon: "https://www.google.com/s2/favicons?domain=barrons.com&sz=128",
    timeAgo: "47 mins ago",
    category: "Forex",
  },
  {
    id: 8,
    title: "EV Battery Manufacturers See Demand Rebound",
    href: "/news/8",
    source: "Forbes",
    sourceIcon: "https://www.google.com/s2/favicons?domain=forbes.com&sz=128",
    timeAgo: "53 mins ago",
    category: "EV",
  },
  {
    id: 9,
    title: "AI Startups Secure Record Venture Capital Funding",
    href: "/news/9",
    source: "TechCrunch",
    sourceIcon:
      "https://www.google.com/s2/favicons?domain=techcrunch.com&sz=128",
    timeAgo: "58 mins ago",
    category: "Venture",
  },
  {
    id: 10,
    title: "Foreign Institutional Investors Shift to Net Buying",
    href: "/news/10",
    source: "Business Insider",
    sourceIcon:
      "https://www.google.com/s2/favicons?domain=businessinsider.com&sz=128",
    timeAgo: "64 mins ago",
    category: "Finance",
  },
];
