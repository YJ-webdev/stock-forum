"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface EditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EditorDrawer({ isOpen, onClose }: EditorDrawerProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<h1>Untitled Note</h1><p>Start typing...</p>",
  });

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-w-4xl mx-auto h-[80vh] flex flex-col z-99999">
        <DrawerHeader className="border-b px-6 py-4">
          <DrawerTitle className="text-lg font-semibold">
            Quick Note
          </DrawerTitle>
        </DrawerHeader>

        <div
          className="flex-1 p-6 overflow-y-auto cursor-text"
          onClick={() => editor?.commands.focus()}
        >
          <EditorContent
            editor={editor}
            className="prose dark:prose-invert max-w-none focus:outline-none min-h-75"
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
