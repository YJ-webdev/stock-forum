import { prisma } from "@/lib/prisma";
import { PostEditor } from "./post-editor";

export async function PostEditorWrapper() {
  const categories = await prisma.forumCategory.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return <PostEditor categories={categories} />;
}
