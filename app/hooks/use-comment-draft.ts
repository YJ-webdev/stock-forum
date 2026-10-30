"use client";

import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type { GifResult } from "@/app/components/gif-picker";

export interface CommentDraft {
  text: string;
  gif: GifResult | null;
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
) {
  const [localDraft, setLocalDraft] = useState<CommentDraft>(() => ({
    text: initialText,
    gif: initialGif,
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
      update((previous) =>
        previous.gif === value ? previous : { ...previous, gif: value },
      );
    },
    [update],
  );

  return {
    comment: current.text,
    selectedGif: current.gif,
    setComment,
    setSelectedGif,
  };
}
