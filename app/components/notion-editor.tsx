import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function NotionEditor() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      // Add custom slash menu or drag-handle extensions here
    ],
    content:
      '<h1>Untitled</h1><p>Start typing or press "/" for commands...</p>',
    autofocus: "end",
  });

  return (
    <div style={{ padding: "2rem", maxWidth: "750px", margin: "0 auto" }}>
      <EditorContent editor={editor} />
    </div>
  );
}
