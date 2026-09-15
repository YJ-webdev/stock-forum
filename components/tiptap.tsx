"use client";

import { EditorContent, useEditor } from "@tiptap/react";

import { SlashCommand } from "./extensions/slash-command";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

import type { JSONContent } from "@tiptap/react";
import { EditorBubbleMenu } from "./editor-bubble-menu";

interface TiptapProps {
  content?: JSONContent;
  onChange?: (content: JSONContent) => void;
}

const Tiptap = ({ content, onChange }: TiptapProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      // Link.configure({
      //   openOnClick: false,
      //   autolink: true,
      //   defaultProtocol: "https",
      // }),

      Placeholder.configure({
        placeholder: "Write something, or press '/' for commands...",
      }),

      Image.configure({
        resize: {
          enabled: true,
          alwaysPreserveAspectRatio: true,
          directions: ["left", "right", "top", "bottom"],
          minWidth: 50,
        },
      }),
      SlashCommand,
    ],

    content: content ?? {
      type: "doc",
      content: [
        {
          type: "paragraph",
        },
      ],
    },

    immediatelyRender: false,

    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[300px] w-full max-w-full min-w-0 outline-none text-[20px] leading-8 text-zinc-800 dark:text-zinc-200",
      },
    },

    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
  });

  // const addImage = useCallback(() => {
  //   if (!editor) return;

  //   const url = window.prompt("Image URL");

  //   if (url) {
  //     editor.chain().focus().setImage({ src: url }).run();
  //   }
  // }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <EditorBubbleMenu editor={editor} />

      <EditorContent editor={editor} />
    </div>
  );
};

export default Tiptap;
