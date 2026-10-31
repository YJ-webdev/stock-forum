"use client";

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { GifResult } from "@/app/components/gif-picker";
import type { CommentImage } from "@/lib/types/comment-image";

export interface CommentDraft {
  text: string;
  gif: GifResult | null;
  image?: CommentImage | null;
}

export interface CommentDraftProps {
  draft?: CommentDraft;
  onDraftChange?: Dispatch<SetStateAction<CommentDraft>>;
}

export function useCommentDraft(
  initialText: string,
  initialGif: GifResult | null,
  draft?: CommentDraft,
  onDraftChange?: Dispatch<SetStateAction<CommentDraft>>,
  initialImage: CommentImage | null = null,
) {
  const [localDraft, setLocalDraft] = useState<CommentDraft>(() => ({
    text: initialText,
    gif: initialImage ? null : initialGif,
    image: initialImage,
  }));

  const controlled = draft !== undefined && onDraftChange !== undefined;

  const current = controlled ? draft : localDraft;
  const update = controlled ? onDraftChange : setLocalDraft;

  const setComment = useCallback(
    (value: string) => {
      update((previous) =>
        previous.text === value ? previous : { ...previous, text: value },
      );
    },
    [update],
  );

  const setSelectedGif = useCallback(
    (value: GifResult | null) => {
      update((previous) => {
        const image = value ? null : (previous.image ?? null);

        if (previous.gif === value && (previous.image ?? null) === image) {
          return previous;
        }

        return {
          ...previous,
          gif: value,
          image,
        };
      });
    },
    [update],
  );

  const setSelectedImage = useCallback(
    (value: CommentImage | null) => {
      update((previous) => {
        const gif = value ? null : previous.gif;

        if ((previous.image ?? null) === value && previous.gif === gif) {
          return previous;
        }

        return {
          ...previous,
          gif,
          image: value,
        };
      });
    },
    [update],
  );

  const clearDraft = useCallback(() => {
    update((previous) => {
      if (previous.text === "" && previous.gif === null && !previous.image) {
        return previous;
      }

      return {
        text: "",
        gif: null,
        image: null,
      };
    });
  }, [update]);

  return {
    comment: current.text,
    selectedGif: current.gif,
    selectedImage: current.image ?? null,
    setComment,
    setSelectedGif,
    setSelectedImage,
    clearDraft,
  };
}
