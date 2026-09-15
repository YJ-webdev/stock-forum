export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: {
    posts: number;
  };
}
