import type { Metadata } from "next";

import { getGlobalMarketNews } from "@/app/actions/news";

import NewsPageClient from "./news-page-cilent";

const TITLE = "Global Market News";
const DESCRIPTION =
  "Explore recent financial news and headlines across global markets on BullBearVote.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,

  alternates: {
    canonical: "/news",
  },

  openGraph: {
    type: "website",
    siteName: "BullBearVote",
    url: "/news",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },

  twitter: {
    card: "summary_large_image",
    title: `${TITLE} | BullBearVote`,
    description: DESCRIPTION,
  },
};

export default async function NewsPage() {
  const news = await getGlobalMarketNews(30);

  return <NewsPageClient initialNews={news} />;
}
