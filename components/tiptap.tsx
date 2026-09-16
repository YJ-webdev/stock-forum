"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useRef } from "react";

import { SlashCommand } from "./extensions/slash-command";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

import type { JSONContent } from "@tiptap/react";
import { EditorBubbleMenu } from "./editor-bubble-menu";

interface TiptapProps {
  content?: JSONContent;
  onChange?: (content: JSONContent) => void;
  name?: string;
}

const Tiptap = ({ content, onChange, name }: TiptapProps) => {
  const nameRef = useRef(name);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [2, 3],
          },
        }),

        Placeholder.configure({
          placeholder: `Let's talk about ${name || "anything"}`,
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
        onChange?.(editor.getJSON());
      },
    },

    // 👇 Recreate editor when market name changes
    [name],
  );
  useEffect(() => {
    if (!editor) return;

    // Makes Placeholder read the new nameRef.current
    editor.view.dispatch(editor.state.tr);
  }, [editor, name]);

  if (!editor) {
    return null;
  }

  return (
    <div className="h-full w-full">
      <EditorBubbleMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};

export default Tiptap;
