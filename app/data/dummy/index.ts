import { DUMMY_NEWS, NewsItem } from "./news";
import { DUMMY_POSTS, PostItem } from "./posts";
import { DUMMY_FORUMS, ForumItem } from "./forums";
import { DUMMY_INDICES, IndexItem } from "./indices";
import { DUMMY_CRYPTO } from "./crypto";

export * from "./news";
export * from "./posts";
export * from "./forums";
export * from "./indices";
export * from "./crypto";

export interface DummyData {
  news: NewsItem[];
  recentPosts: PostItem[];
  forums: ForumItem[];
  indices: IndexItem[];
}

export const DUMMY_DATA: DummyData = {
  news: DUMMY_NEWS,
  recentPosts: DUMMY_POSTS,
  forums: DUMMY_FORUMS,
  // 주식 지수와 가상자산을 합쳐서 단일 indices 배열로 공급
  indices: [...DUMMY_INDICES, ...DUMMY_CRYPTO],
};
