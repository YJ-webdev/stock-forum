export interface IndexItem {
  id: number;
  name: string;
  value: string;
  change: string;
  isUp: boolean;
  href: string;
}

export const DUMMY_INDICES: IndexItem[] = [
  // 기존 TOP 10 (주요 지수, 통화, 원자재)
  {
    id: 1,
    name: "S&P 500",
    value: "5,450.30",
    change: "+0.45%",
    isUp: true,
    href: "/index/sp500",
  },
  {
    id: 2,
    name: "NASDAQ",
    value: "17,100.50",
    change: "+1.20%",
    isUp: true,
    href: "/index/nasdaq",
  },
  {
    id: 3,
    name: "DOW JONES",
    value: "39,100.20",
    change: "-0.15%",
    isUp: false,
    href: "/index/dow",
  },
  {
    id: 4,
    name: "KOSPI",
    value: "2,650.12",
    change: "+0.85%",
    isUp: true,
    href: "/index/kospi",
  },
  {
    id: 5,
    name: "KOSDAQ",
    value: "865.40",
    change: "-0.32%",
    isUp: false,
    href: "/index/kosdaq",
  },
  {
    id: 6,
    name: "NIKKEI 225",
    value: "38,500.80",
    change: "+0.95%",
    isUp: true,
    href: "/index/nikkei",
  },
  {
    id: 7,
    name: "SSE COMPOSITE",
    value: "3,020.15",
    change: "+0.10%",
    isUp: true,
    href: "/index/shanghai",
  },
  {
    id: 8,
    name: "USD / KRW",
    value: "1,345.50",
    change: "-2.50",
    isUp: false,
    href: "/index/usdkrw",
  },
  {
    id: 9,
    name: "Bitcoin (BTC)",
    value: "$64,200",
    change: "+2.15%",
    isUp: true,
    href: "/index/btc",
  },
  {
    id: 10,
    name: "WTI Crude Oil",
    value: "$78.40",
    change: "+1.10%",
    isUp: true,
    href: "/index/wti",
  },

  // 유럽 및 글로벌 주요 지수 (TOP 20 확장)
  {
    id: 11,
    name: "EURO STOXX 50",
    value: "4,950.20",
    change: "+0.62%",
    isUp: true,
    href: "/index/stoxx50",
  },
  {
    id: 12,
    name: "DAX 40",
    value: "18,210.45",
    change: "+0.78%",
    isUp: true,
    href: "/index/dax",
  },
  {
    id: 13,
    name: "FTSE 100",
    value: "8,230.10",
    change: "-0.24%",
    isUp: false,
    href: "/index/ftse100",
  },
  {
    id: 14,
    name: "CAC 40",
    value: "7,620.80",
    change: "+0.35%",
    isUp: true,
    href: "/index/cac40",
  },
  {
    id: 15,
    name: "FTSE MIB",
    value: "33,450.00",
    change: "+0.51%",
    isUp: true,
    href: "/index/ftsemib",
  },
  {
    id: 16,
    name: "SMI 20",
    value: "12,150.30",
    change: "-0.18%",
    isUp: false,
    href: "/index/smi",
  },
  {
    id: 17,
    name: "IBEX 35",
    value: "11,080.90",
    change: "+0.42%",
    isUp: true,
    href: "/index/ibex35",
  },
  {
    id: 18,
    name: "AEX Index",
    value: "915.60",
    change: "+0.89%",
    isUp: true,
    href: "/index/aex",
  },
  {
    id: 19,
    name: "OMXS30",
    value: "2,580.40",
    change: "-0.05%",
    isUp: false,
    href: "/index/omxs30",
  },
  {
    id: 20,
    name: "Tadawul (TASI)",
    value: "11,820.15",
    change: "+0.28%",
    isUp: true,
    href: "/index/tasi",
  },
];
