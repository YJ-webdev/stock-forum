"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function EditorPage() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<h1>Untitled</h1><p>Start writing...</p>",
    autofocus: "end",
  });

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto bg-background text-foreground">
      <EditorContent
        editor={editor}
        className="prose dark:prose-invert focus:outline-none"
      />
    </main>
  );
}
