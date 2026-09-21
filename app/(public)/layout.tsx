import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import LayoutShell from "../components/layout-shell";
import { getMostLikedComments } from "../actions/post";

async function getNews() {
  try {
    const res = await fetch("http://localhost:3000/api/news", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          status: true,
          nationality: true,
          language: true,
        },
      })
    : null;

  const [news, mostLikedComments] = await Promise.all([
    getNews(),
    getMostLikedComments(),
  ]);

  return (
    <LayoutShell user={user} news={news} comments={mostLikedComments}>
      {children}
    </LayoutShell>
  );
}
