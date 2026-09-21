"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useState } from "react";

import { SlashCommand } from "./extensions/slash-command";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

import type { JSONContent } from "@tiptap/react";
import { EditorBubbleMenu } from "./editor-bubble-menu";

import { GifPicker } from "@/app/components/gif-picker";

interface TiptapProps {
  content?: JSONContent;
  onChange?: (content: JSONContent) => void;
}

const Tiptap = ({ content, onChange }: TiptapProps) => {
  const [gifPickerOpen, setGifPickerOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),

      Placeholder.configure({
        placeholder: `Start writing, or press "/" for commands...`,
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
      content: [{ type: "paragraph" }],
    },

    autofocus: true,
    immediatelyRender: false,

    editorProps: {
      attributes: {
        class:
          "tiptap min-h-[300px] w-full max-w-full min-w-0 outline-none text-[20px] leading-8 text-zinc-800 dark:text-zinc-200",
      },
    },

    onUpdate: ({ editor }) => {
      const json = editor.getJSON();

      // force plain serializable object
      const plainJson = JSON.parse(JSON.stringify(json));

      onChange?.(plainJson);
    },
  });

  useEffect(() => {
    const openGifPicker = () => {
      setGifPickerOpen(true);
    };

    window.addEventListener("tiptap:open-gif-picker", openGifPicker);

    return () => {
      window.removeEventListener("tiptap:open-gif-picker", openGifPicker);
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div
      className="relative flex-1 h-full "
      onClick={() => {
        if (!editor.isFocused) {
          editor.commands.focus();
        }
      }}
    >
      <EditorBubbleMenu editor={editor} />

      <EditorContent
        editor={editor}
        spellCheck={false}
        className="tiptap-editor-content flex-1"
      />
      <GifPicker
        open={gifPickerOpen}
        onOpenChange={setGifPickerOpen}
        onSelect={(gif) => {
          const maxInitialWidth = 500;

          const width = gif.width
            ? Math.min(gif.width, maxInitialWidth)
            : undefined;

          const height =
            width && gif.width && gif.height
              ? Math.round(width * (gif.height / gif.width))
              : undefined;

          editor
            .chain()
            .focus()
            .setImage({
              src: gif.src,
              alt: gif.title,
              width,
              height,
            })
            .run();

          setGifPickerOpen(false);
        }}
      />
    </div>
  );
};

export default Tiptap;
