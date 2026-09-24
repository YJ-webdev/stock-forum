import { MarketPageComments } from "@/app/actions/post";

export function findCommentIdForReply(
  comments: MarketPageComments,
  replyId: string,
): string | null {
  for (const comment of comments) {
    const found = comment.replies.some((reply) => reply.id === replyId);

    if (found) {
      return comment.id;
    }
  }

  return null;
}
