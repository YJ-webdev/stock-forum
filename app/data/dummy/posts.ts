export interface PostItem {
  id: number;
  title: string;
  href: string;
  author: {
    name: string;
    avatar: string;
  };
  topic: string;
  timeAgo: string;
  commentsCount: number;
}

export const DUMMY_POSTS: PostItem[] = [
  {
    id: 1,
    title: "Anyone buying the dip on tech stocks today?",
    href: "/board/1",
    author: {
      name: "Alex Rivera",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
    },
    topic: "Tech & Growth",
    timeAgo: "15 mins ago",
    commentsCount: 24,
  },
  {
    id: 2,
    title: "Is cash the best strategy during market volatility?",
    href: "/board/2",
    author: {
      name: "Sarah Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
    },
    topic: "Macro Strategy",
    timeAgo: "32 mins ago",
    commentsCount: 18,
  },
  {
    id: 3,
    title: "Looking for feedback on my dividend portfolio",
    href: "/board/3",
    author: {
      name: "Marcus Vance",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
    },
    topic: "Dividend Growth",
    timeAgo: "45 mins ago",
    commentsCount: 31,
  },
  {
    id: 4,
    title: "Building a long-term retirement ETF strategy",
    href: "/board/4",
    author: {
      name: "Elena Rostova",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena",
    },
    topic: "Personal Finance",
    timeAgo: "1 hour ago",
    commentsCount: 12,
  },
  {
    id: 5,
    title: "Daily trading quote: Discipline beats conviction",
    href: "/board/5",
    author: {
      name: "David K.",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
    },
    topic: "Psychology",
    timeAgo: "2 hours ago",
    commentsCount: 9,
  },
  {
    id: 6,
    title: "Quick guide to reading RSI and MACD charts",
    href: "/board/6",
    author: {
      name: "TradingPro_99",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TradingPro",
    },
    topic: "Technical Analysis",
    timeAgo: "3 hours ago",
    commentsCount: 42,
  },
  {
    id: 7,
    title: "Which semiconductor stock is next to explode?",
    href: "/board/7",
    author: {
      name: "Jordan Lee",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan",
    },
    topic: "Semiconductors",
    timeAgo: "4 hours ago",
    commentsCount: 56,
  },
  {
    id: 8,
    title: "Earnings season breakdown: Winners vs Losers",
    href: "/board/8",
    author: {
      name: "Sophia Miller",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia",
    },
    topic: "Earnings",
    timeAgo: "5 hours ago",
    commentsCount: 27,
  },
  {
    id: 9,
    title: "Day trading vs Swing trading: What's your style?",
    href: "/board/9",
    author: {
      name: "Ryan Park",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan",
    },
    topic: "Discussion",
    timeAgo: "6 hours ago",
    commentsCount: 35,
  },
  {
    id: 10,
    title: "Market recap and thoughts for tomorrow",
    href: "/board/10",
    author: {
      name: "Rachel Adams",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel",
    },
    topic: "Daily Recap",
    timeAgo: "8 hours ago",
    commentsCount: 14,
  },
];
