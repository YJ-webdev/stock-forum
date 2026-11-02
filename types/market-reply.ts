export interface MarketReply {
  id: string;
  commentId: string;
  parentId: string | null;

  content: string;

  gifUrl: string | null;
  gifWidth: number | null;
  gifHeight: number | null;

  imageUrl: string | null;
  imageWidth: number | null;
  imageHeight: number | null;

  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
  withdrawnAt: Date | null;
  moderatedAt: Date | null;

  author: {
    id: string;
    name: string | null;
    image: string | null;
    nationality: string | null;
  };

  likeCount: number;
  likedByMe: boolean;
  replyCount: number;
}
