import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import { useEffect, useCallback, useState, useMemo } from 'react';
import { Bold, Italic, Strikethrough, Code, List, ListOrdered, Link as LinkIcon, Undo, Redo, MoreVertical, Type, Heading1, Heading2, Heading3 } from 'lucide-react';
import { Button } from '../ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  onExport?: (format: 'html' | 'markdown' | 'text') => void;
}

// Create lowlight instance for syntax highlighting
const lowlight = createLowlight();

/**
 * Tiptap rich text editor component
 * Supports markdown shortcuts, rich text formatting, and export functionality
 */
export function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
  className = '',
  editable = true,
  onExport,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Use CodeBlockLowlight instead
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    editable,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none p-2',
          'overflow-x-hidden break-words h-full',
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleExport = useCallback(
    (format: 'html' | 'markdown' | 'text') => {
      if (!editor) return;

      let exportedContent = '';
      switch (format) {
        case 'html':
          exportedContent = editor.getHTML();
          break;
        case 'markdown':
          // Tiptap doesn't have built-in markdown export, so we'll use a simple conversion
          // For full markdown support, we'd need @tiptap/extension-markdown
          exportedContent = editor.getText();
          break;
        case 'text':
          exportedContent = editor.getText();
          break;
      }

      // Create blob and download
      const blob = new Blob([exportedContent], {
        type: format === 'html' ? 'text/html' : 'text/plain',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `note-${Date.now()}.${format === 'html' ? 'html' : format === 'markdown' ? 'md' : 'txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onExport?.(format);
    },
    [editor, onExport]
  );

  if (!editor) {
    return <div className={className}>Loading editor...</div>;
  }

  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Get computed card background color from a test element
  const cardBgColor = useMemo(() => {
    if (typeof window === 'undefined') return '#1a1a1a';
    try {
      // Create a temporary element to get the computed color
      const testEl = document.createElement('div');
      testEl.className = 'bg-card';
      testEl.style.display = 'none';
      document.body.appendChild(testEl);
      const computedColor = getComputedStyle(testEl).backgroundColor;
      document.body.removeChild(testEl);
      // If we got a valid color (not transparent), use it
      if (computedColor && computedColor !== 'rgba(0, 0, 0, 0)' && computedColor !== 'transparent') {
        return computedColor;
      }
    } catch (e) {
      console.warn('Failed to compute card color:', e);
    }
    // Fallback: use the oklch value directly
    const root = document.documentElement;
    const cardValue = getComputedStyle(root).getPropertyValue('--card').trim();
    if (cardValue) {
      return cardValue;
    }
    // Final fallback for dark mode
    return '#1a1a1a';
  }, []);

  // Get current heading level or paragraph
  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    if (editor.isActive('heading', { level: 4 })) return 'H4';
    if (editor.isActive('heading', { level: 5 })) return 'H5';
    if (editor.isActive('heading', { level: 6 })) return 'H6';
    return 'P';
  };

  return (
    <div className={cn("flex flex-col h-full overflow-hidden", className)}>
      {editable && (
        <div className="flex items-center justify-end gap-0.5 p-1 border-b border-border/40 dark:border-border/50 bg-muted/30 flex-shrink-0 sticky top-0 z-10">
          {/* Font/Heading Menu */}
          <Popover open={fontMenuOpen} onOpenChange={setFontMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-2 text-xs flex items-center justify-center',
                  editor.isActive('heading') && 'bg-background'
                )}
                title="Text Style"
              >
                <Type className="h-3.5 w-3.5 mr-1.5" />
                <span className="font-medium">{getCurrentHeading()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-40 p-1 bg-card border border-border/50 dark:border-border/60 shadow-lg" 
              align="end"
              style={{ backgroundColor: cardBgColor, opacity: 1, backdropFilter: 'none' }}
            >
              <div className="space-y-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().setParagraph().run();
                    setFontMenuOpen(false);
                  }}
                >
                  <span className="mr-2">P</span>
                  Paragraph
                  {!editor.isActive('heading') && <span className="ml-auto text-xs">✓</span>}
                </Button>
                <div className="h-px bg-border my-1" />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 1 }).run();
                    setFontMenuOpen(false);
                  }}
                >
                  <Heading1 className="h-3.5 w-3.5 mr-2" />
                  Heading 1
                  {editor.isActive('heading', { level: 1 }) && <span className="ml-auto text-xs">✓</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 2 }).run();
                    setFontMenuOpen(false);
                  }}
                >
                  <Heading2 className="h-3.5 w-3.5 mr-2" />
                  Heading 2
                  {editor.isActive('heading', { level: 2 }) && <span className="ml-auto text-xs">✓</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleHeading({ level: 3 }).run();
                    setFontMenuOpen(false);
                  }}
                >
                  <Heading3 className="h-3.5 w-3.5 mr-2" />
                  Heading 3
                  {editor.isActive('heading', { level: 3 }) && <span className="ml-auto text-xs">✓</span>}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Format Menu */}
          <Popover open={formatMenuOpen} onOpenChange={setFormatMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-2 text-xs',
                  (editor.isActive('bold') || editor.isActive('italic') || editor.isActive('strike') || editor.isActive('code')) && 'bg-background'
                )}
                title="Text Formatting"
              >
                <Type className="h-3.5 w-3.5 mr-1" />
                Format
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-40 p-1 bg-card border border-border/50 dark:border-border/60 shadow-lg" 
              align="end"
              style={{ backgroundColor: cardBgColor, opacity: 1, backdropFilter: 'none' }}
            >
              <div className="space-y-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleBold().run();
                    setFormatMenuOpen(false);
                  }}
                >
                  <Bold className="h-3.5 w-3.5 mr-2" />
                  Bold
                  {editor.isActive('bold') && <span className="ml-auto text-xs">✓</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleItalic().run();
                    setFormatMenuOpen(false);
                  }}
                >
                  <Italic className="h-3.5 w-3.5 mr-2" />
                  Italic
                  {editor.isActive('italic') && <span className="ml-auto text-xs">✓</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleStrike().run();
                    setFormatMenuOpen(false);
                  }}
                >
                  <Strikethrough className="h-3.5 w-3.5 mr-2" />
                  Strikethrough
                  {editor.isActive('strike') && <span className="ml-auto text-xs">✓</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleCode().run();
                    setFormatMenuOpen(false);
                  }}
                >
                  <Code className="h-3.5 w-3.5 mr-2" />
                  Code
                  {editor.isActive('code') && <span className="ml-auto text-xs">✓</span>}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* List Menu */}
          <Popover open={listMenuOpen} onOpenChange={setListMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  'h-7 px-2 text-xs',
                  (editor.isActive('bulletList') || editor.isActive('orderedList')) && 'bg-background'
                )}
                title="Lists"
              >
                <List className="h-3.5 w-3.5 mr-1" />
                List
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-40 p-1 bg-card border border-border/50 dark:border-border/60 shadow-lg" 
              align="end"
              style={{ backgroundColor: cardBgColor, opacity: 1, backdropFilter: 'none' }}
            >
              <div className="space-y-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleBulletList().run();
                    setListMenuOpen(false);
                  }}
                >
                  <List className="h-3.5 w-3.5 mr-2" />
                  Bullet List
                  {editor.isActive('bulletList') && <span className="ml-auto text-xs">✓</span>}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    editor.chain().focus().toggleOrderedList().run();
                    setListMenuOpen(false);
                  }}
                >
                  <ListOrdered className="h-3.5 w-3.5 mr-2" />
                  Numbered List
                  {editor.isActive('orderedList') && <span className="ml-auto text-xs">✓</span>}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Undo/Redo - Top Level */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            <Undo className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Y)"
          >
            <Redo className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* More Menu */}
          <Popover open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                title="More Options"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-48 p-1 bg-card border border-border/50 dark:border-border/60 shadow-lg" 
              align="end"
              style={{ backgroundColor: cardBgColor, opacity: 1, backdropFilter: 'none' }}
            >
              <div className="space-y-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => {
                    const url = window.prompt('Enter URL:');
                    if (url) {
                      editor.chain().focus().setLink({ href: url }).run();
                    }
                    setMoreMenuOpen(false);
                  }}
                >
                  <LinkIcon className="h-3.5 w-3.5 mr-2" />
                  Add Link
                </Button>
                {onExport && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => {
                        handleExport('html');
                        setMoreMenuOpen(false);
                      }}
                    >
                      Export HTML
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-xs"
                      onClick={() => {
                        handleExport('text');
                        setMoreMenuOpen(false);
                      }}
                    >
                      Export Text
                    </Button>
                  </>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

