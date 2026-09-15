"use client";

import type { Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link as LinkIcon,
} from "lucide-react";

interface EditorBubbleMenuProps {
  editor: Editor;
}

export function EditorBubbleMenu({ editor }: EditorBubbleMenuProps) {
  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const buttonClass =
    "flex size-8 items-center justify-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700";

  const activeClass = "bg-zinc-100 dark:bg-zinc-700";

  return (
    <BubbleMenu
      editor={editor}
      options={{
        placement: "top",
      }}
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-1 shadow-md dark:border-zinc-700 dark:bg-zinc-800">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${buttonClass} ${
            editor.isActive("bold") ? activeClass : ""
          }`}
        >
          <Bold size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${buttonClass} ${
            editor.isActive("italic") ? activeClass : ""
          }`}
        >
          <Italic size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${buttonClass} ${
            editor.isActive("underline") ? activeClass : ""
          }`}
        >
          <Underline size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${buttonClass} ${
            editor.isActive("strike") ? activeClass : ""
          }`}
        >
          <Strikethrough size={16} />
        </button>

        <div className="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

        <button
          type="button"
          onClick={setLink}
          className={`${buttonClass} ${
            editor.isActive("link") ? activeClass : ""
          }`}
        >
          <LinkIcon size={16} />
        </button>
      </div>
    </BubbleMenu>
  );
}
