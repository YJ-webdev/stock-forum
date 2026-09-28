import { getGlobalMarketNews } from "@/app/actions/news";
import NewsPageClient from "./news-page-cilent";

export default async function NewsPage() {
  const news = await getGlobalMarketNews(30);

  return <NewsPageClient initialNews={news} />;
}
