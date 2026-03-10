import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { EditorToolbar } from './EditorToolbar'

interface EditorProps {
    title: string
    body: string
    onTitleChange: (title: string) => void
    onBodyChange: (html: string, text: string, wordCount: number) => void
}

export const Editor = ({ title, body, onTitleChange, onBodyChange }: EditorProps) => {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [2, 3] },
                // Explicitly enable lists
                bulletList: {},
                orderedList: {},
                listItem: {},
                blockquote: {},
                horizontalRule: {},
                bold: {},
                italic: {},
            }),
            Placeholder.configure({
                placeholder: 'Start writing… let your thoughts flow.',
            }),
            CharacterCount,
        ],
        content: body || '',
        onUpdate: ({ editor }) => {
            const html = editor.getHTML()
            const text = editor.getText()
            const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length
            onBodyChange(html, text, words)
        },
        editorProps: {
            attributes: { class: 'outline-none min-h-[50vh] prose-editor' },
        },
    })

    // Load existing content once on mount
    useEffect(() => {
        if (editor && body && editor.isEmpty) {
            editor.commands.setContent(body)
        }
    }, [editor, body])

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

            {/* Title */}
            <input
                type="text"
                value={title}
                onChange={e => onTitleChange(e.target.value)}
                placeholder="Entry title…"
                className="w-full font-lora text-xl sm:text-2xl lg:text-3xl
                   font-semibold text-ink bg-transparent outline-none
                   border-none placeholder:text-muted/40 mb-5 sm:mb-6
                   leading-tight"
            />

            {/* Toolbar — horizontally scrollable on mobile */}
            {editor && (
                <div className="overflow-x-auto">
                    <EditorToolbar editor={editor} />
                </div>
            )}

            {/* Editor */}
            <EditorContent editor={editor} />

            <style>{`
        .prose-editor {
          font-family: 'Lora', serif;
          font-size: 15px;
          line-height: 1.8;
          color: #1C1A17;
        }
        @media (max-width: 640px) {
          .prose-editor { font-size: 14px; }
        }
        .prose-editor p {
          margin-bottom: 0.8em;
        }
        .prose-editor p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #8C857C;
          pointer-events: none;
          float: left;
          height: 0;
        }
        .prose-editor h2 {
          font-family: 'Lora', serif;
          font-size: 1.3rem;
          font-weight: 600;
          color: #1C1A17;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .prose-editor h3 {
          font-family: 'Lora', serif;
          font-size: 1.1rem;
          font-weight: 600;
          color: #4A4540;
          margin-top: 1.2em;
          margin-bottom: 0.4em;
        }
        .prose-editor strong {
          font-weight: 600;
          color: #1C1A17;
        }
        .prose-editor em {
          font-style: italic;
        }
        /* ── LIST STYLES ── */
        .prose-editor ul {
          list-style-type: disc;
          padding-left: 1.5em;
          margin-bottom: 0.8em;
        }
        .prose-editor ol {
          list-style-type: decimal;
          padding-left: 1.5em;
          margin-bottom: 0.8em;
        }
        .prose-editor li {
          margin-bottom: 0.25em;
          display: list-item;
        }
        .prose-editor li p {
          margin-bottom: 0;
        }
        /* ── BLOCKQUOTE ── */
        .prose-editor blockquote {
          border-left: 3px solid #7A9E7E;
          padding-left: 1em;
          color: #4A4540;
          font-style: italic;
          margin: 1em 0;
        }
        /* ── HR ── */
        .prose-editor hr {
          border: none;
          border-top: 1px solid #E5DDD3;
          margin: 1.5em 0;
        }
        .ProseMirror-focused {
          outline: none;
        }
      `}</style>
        </div>
    )
}