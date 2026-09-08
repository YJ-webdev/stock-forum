[
  {
    rank: 1,
    id: "usr_9981",
    name: "ApexPredictor",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ApexPredictor",
    level: 84,
    tier: "Diamond",
    score: 142850,
    totalWinnings: "$342,900.00",
    winRate: "78.4%",
    biggestWin: "$45,000.00",
    streak: "8 W",
    status: "online",
  },
  {
    rank: 2,
    id: "usr_7712",
    name: "HighRoller99",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=HighRoller99",
    level: 79,
    tier: "Diamond",
    score: 128400,
    totalWinnings: "$289,150.00",
    winRate: "72.1%",
    biggestWin: "$62,300.00",
    streak: "3 W",
    status: "offline",
  },
  {
    rank: 3,
    id: "usr_4403",
    name: "LuckyStrike_X",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=LuckyStrike_X",
    level: 71,
    tier: "Platinum",
    score: 109200,
    totalWinnings: "$210,400.00",
    winRate: "68.9%",
    biggestWin: "$28,500.00",
    streak: "1 L",
    status: "online",
  },
  {
    rank: 4,
    id: "usr_1092",
    name: "VegasWhale",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=VegasWhale",
    level: 68,
    tier: "Platinum",
    score: 95150,
    totalWinnings: "$184,000.00",
    winRate: "65.3%",
    biggestWin: "$50,000.00",
    streak: "5 W",
    status: "online",
  },
  {
    rank: 5,
    id: "usr_5521",
    name: "OddsMaster",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=OddsMaster",
    level: 62,
    tier: "Gold",
    score: 82900,
    totalWinnings: "$145,220.00",
    winRate: "61.7%",
    biggestWin: "$18,900.00",
    streak: "2 W",
    status: "offline",
  },
  {
    rank: 6,
    id: "usr_3389",
    name: "ParlayKing",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=ParlayKing",
    level: 55,
    tier: "Gold",
    score: 71400,
    totalWinnings: "$112,800.00",
    winRate: "59.2%",
    biggestWin: "$31,400.00",
    streak: "2 L",
    status: "online",
  },
  {
    rank: 7,
    id: "usr_8820",
    name: "CryptoBettor",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoBettor",
    level: 50,
    tier: "Gold",
    score: 64800,
    totalWinnings: "$98,500.00",
    winRate: "56.0%",
    biggestWin: "$14,200.00",
    streak: "4 W",
    status: "offline",
  },
];

export interface LeaderboardPlayer {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  level: number;
  tier: "Diamond" | "Platinum" | "Gold" | "Silver";
  score: number;
  totalWinnings: string;
  winRate: string;
  biggestWin: string;
  streak: string;
  status: "online" | "offline";
}
