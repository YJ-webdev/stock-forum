// app/components/post-content.tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

import type { JSONContent } from "@tiptap/react";

interface PostContentProps {
  content: JSONContent;
}

export function PostContent({ content }: PostContentProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,

      Image.configure({
        allowBase64: true,
      }),

      Link.configure({
        openOnClick: true,
        autolink: true,
      }),

      Underline,
    ],

    content,
    editable: false,

    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },

    immediatelyRender: false,
  });

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}
