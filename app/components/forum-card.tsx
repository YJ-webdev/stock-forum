import Link from "next/link";

export interface CategoryWithCount {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: { posts: number };
}

export function ForumList({ categories }: { categories: CategoryWithCount[] }) {
  return (
    <div className="flex flex-col gap-1">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={`/forum/${cat.slug}`}
          className="flex items-center justify-between p-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <span className="font-medium">{cat.name}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {cat._count?.posts ?? 0}
          </span>
        </Link>
      ))}
    </div>
  );
}
