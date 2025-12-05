import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TiptapSearchViewerProps {
  content: string;
  className?: string;
}

/**
 * ELITE: Lightweight Tiptap viewer for search results
 * Minimal extensions for read-only display - optimized for performance
 * 
 * Extensions:
 * - StarterKit (essential formatting only)
 * - Link (for clickable links)
 * 
 * Removed for performance:
 * - CodeBlockLowlight (syntax highlighting is expensive)
 * - Image (not needed in search previews)
 * - TaskList/TaskItem (not needed in search previews)
 * - Placeholder (not needed for read-only)
 */
export function TiptapSearchViewer({ content, className = '' }: TiptapSearchViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable expensive features for search previews
        codeBlock: false, // No syntax highlighting in search
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
    ],
    content,
    editable: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
          'overflow-x-hidden break-words',
          className
        ),
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}

