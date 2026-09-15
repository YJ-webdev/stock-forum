import type { ElementType } from "react";
import type { Editor, Range } from "@tiptap/core";
import {
  Type,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Image as ImageIcon,
} from "lucide-react";

export interface SlashMenuItem {
  title: string;
  description: string;
  icon: ElementType;

  command: ({ editor, range }: { editor: Editor; range: Range }) => void;
}

export const slashMenuItems: SlashMenuItem[] = [
  {
    title: "Text",
    description: "Plain text",
    icon: Type,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },

  {
    title: "Heading 2",
    description: "Large section heading",
    icon: Heading2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
    },
  },

  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run();
    },
  },

  {
    title: "Bullet List",
    description: "Create a bullet list",
    icon: List,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },

  {
    title: "Numbered List",
    description: "Create a numbered list",
    icon: ListOrdered,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },

  {
    title: "Quote",
    description: "Capture a quote",
    icon: Quote,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },

  {
    title: "Code",
    description: "Create a code block",
    icon: Code2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },

  {
    title: "Divider",
    description: "Separate sections",
    icon: Minus,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },

  {
    title: "Image",
    description: "Insert an image from URL",
    icon: ImageIcon,
    command: ({ editor, range }) => {
      const url = window.prompt("Image URL");

      if (!url) return;

      editor.chain().focus().deleteRange(range).setImage({ src: url }).run();
    },
  },
];
