import type { Editor } from '@tiptap/react'

interface ToolbarProps {
    editor: Editor
}

const ToolBtn = ({
    onClick, active, title, children,
}: {
    onClick: () => void
    active: boolean
    title: string
    children: React.ReactNode
}) => (
    <button
        onClick={onClick}
        title={title}
        className={`px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${active
            ? 'bg-accent-pale text-accent'
            : 'text-muted hover:text-ink hover:bg-surface'
            }`}
    >
        {children}
    </button>
)

export const EditorToolbar = ({ editor }: ToolbarProps) => {
    return (
        <div className="flex items-center gap-0.5 mb-4 pb-3
                    border-b border-border min-w-max">

            <ToolBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >H2</ToolBtn>

            <ToolBtn
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >H3</ToolBtn>

            <div className="w-px h-4 bg-border mx-1 shrink-0" />

            <ToolBtn
                onClick={() => editor.chain().focus().toggleBold().run()}
                active={editor.isActive('bold')}
                title="Bold (Ctrl+B)"
            ><strong>B</strong></ToolBtn>

            <ToolBtn
                onClick={() => editor.chain().focus().toggleItalic().run()}
                active={editor.isActive('italic')}
                title="Italic (Ctrl+I)"
            ><em>I</em></ToolBtn>

            <div className="w-px h-4 bg-border mx-1 shrink-0" />

            {/* Bullet list — explicitly calls toggleBulletList */}
            <ToolBtn
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                active={editor.isActive('bulletList')}
                title="Bullet list"
            >• List</ToolBtn>

            {/* Ordered list — explicitly calls toggleOrderedList */}
            <ToolBtn
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                active={editor.isActive('orderedList')}
                title="Numbered list"
            >1. List</ToolBtn>

            <div className="w-px h-4 bg-border mx-1 shrink-0" />

            <ToolBtn
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                active={editor.isActive('blockquote')}
                title="Blockquote"
            >" Quote</ToolBtn>

            <ToolBtn
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                active={false}
                title="Horizontal rule"
            >— Rule</ToolBtn>

        </div>
    )
}