import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import { useEffect, useMemo } from 'react';
import { marked } from 'marked';

interface TiptapMarkdownViewerProps {
  content: string;
  className?: string;
}

// Create lowlight instance for syntax highlighting
const lowlight = createLowlight();

// Configure marked for safe HTML rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Tiptap-based markdown viewer
 * Renders markdown content in a read-only editor with syntax highlighting
 */
export function TiptapMarkdownViewer({ content, className = '' }: TiptapMarkdownViewerProps) {
  // Convert markdown to HTML
  const htmlContent = useMemo(() => {
    try {
      return marked.parse(content);
    } catch (error) {
      console.error('Error parsing markdown:', error);
      return content; // Fallback to raw content
    }
  }, [content]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Use CodeBlockLowlight instead
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
    ],
    content: htmlContent,
    editable: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
      },
    },
  });

  useEffect(() => {
    if (editor && htmlContent !== editor.getHTML()) {
      editor.commands.setContent(htmlContent);
    }
  }, [htmlContent, editor]);

  if (!editor) {
    return <div className={className}>Loading...</div>;
  }

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}

