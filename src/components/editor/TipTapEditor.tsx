import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { InternalLink } from './extensions/InternalLink'
import {
    Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
    List, ListOrdered, Quote, Minus, Undo, Redo
} from 'lucide-react'

// Extensions should be instantiated per-editor
const getEditorExtensions = () => [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] }
    }),
    Underline,
    InternalLink
]

export default function TipTapEditor({ content, onUpdate, focusMode = false }: { content: any, onUpdate: (json: any) => void, focusMode?: boolean }) {
    const editor = useEditor({
        extensions: getEditorExtensions(),
        content: '<p></p>',
        onUpdate: ({ editor }) => {
            onUpdate(editor.getJSON())
        }
    })

    useEffect(() => {
        // Sync incoming content strictly when it represents a document swap
        if (editor && content) {
            let hydrated = content
            if (!content || Object.keys(content).length === 0) {
                hydrated = { type: 'doc', content: [{ type: 'paragraph' }] }
            }
            editor.commands.setContent(hydrated, { emitUpdate: false })
        }
    }, [editor, content])

    if (!editor) return null

    return (
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {/* Toolbar */}
            {!focusMode && (
                <div
                    className="editor-toolbar"
                    style={{
                        padding: '0.5rem',
                        borderBottom: '1px solid var(--color-border)',
                        background: 'var(--color-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        flexWrap: 'wrap'
                    }}
                >
                    <button
                        className={`btn ${editor.isActive('bold') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        title="Bold (Ctrl+B)"
                        style={{ padding: '0.35rem' }}
                    >
                        <Bold size={16} />
                    </button>
                    <button
                        className={`btn ${editor.isActive('italic') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        title="Italic (Ctrl+I)"
                        style={{ padding: '0.35rem' }}
                    >
                        <Italic size={16} />
                    </button>
                    <button
                        className={`btn ${editor.isActive('strike') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        title="Strikethrough"
                        style={{ padding: '0.35rem' }}
                    >
                        <Strikethrough size={16} />
                    </button>
                    <button
                        className={`btn ${editor.isActive('code') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        title="Inline Code"
                        style={{ padding: '0.35rem' }}
                    >
                        <Code size={16} />
                    </button>

                    <div style={{ width: '1px', height: '18px', background: 'var(--color-border)', margin: '0 0.35rem' }} />

                    <button
                        className={`btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                        title="Heading 1"
                        style={{ padding: '0.35rem' }}
                    >
                        <Heading1 size={16} />
                    </button>
                    <button
                        className={`btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                        title="Heading 2"
                        style={{ padding: '0.35rem' }}
                    >
                        <Heading2 size={16} />
                    </button>
                    <button
                        className={`btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                        title="Heading 3"
                        style={{ padding: '0.35rem' }}
                    >
                        <Heading3 size={16} />
                    </button>

                    <div style={{ width: '1px', height: '18px', background: 'var(--color-border)', margin: '0 0.35rem' }} />

                    <button
                        className={`btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        title="Bullet List"
                        style={{ padding: '0.35rem' }}
                    >
                        <List size={16} />
                    </button>
                    <button
                        className={`btn ${editor.isActive('orderedList') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        title="Numbered List"
                        style={{ padding: '0.35rem' }}
                    >
                        <ListOrdered size={16} />
                    </button>
                    <button
                        className={`btn ${editor.isActive('blockquote') ? 'active' : ''}`}
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        title="Blockquote"
                        style={{ padding: '0.35rem' }}
                    >
                        <Quote size={16} />
                    </button>
                    <button
                        className="btn"
                        onClick={() => editor.chain().focus().setHorizontalRule().run()}
                        title="Horizontal Rule"
                        style={{ padding: '0.35rem' }}
                    >
                        <Minus size={16} />
                    </button>

                    <div style={{ width: '1px', height: '18px', background: 'var(--color-border)', margin: '0 0.35rem' }} />

                    <button
                        className="btn"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        title="Undo (Ctrl+Z)"
                        style={{ padding: '0.35rem' }}
                    >
                        <Undo size={16} />
                    </button>
                    <button
                        className="btn"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        title="Redo (Ctrl+Y)"
                        style={{ padding: '0.35rem' }}
                    >
                        <Redo size={16} />
                    </button>
                </div>
            )}

            {/* Canvas */}
            <div
                style={{
                    flex: 1,
                    padding: '2.5rem 1rem',
                    overflowY: 'auto',
                    background: 'var(--color-bg)',
                    display: 'flex',
                    justifyContent: 'center',
                    cursor: 'text'
                }}
                onClick={(e) => {
                    // Prevent stealing focus if user clicked a link or button inside the editor
                    if ((e.target as HTMLElement).tagName !== 'A' && (e.target as HTMLElement).tagName !== 'BUTTON') {
                        editor.chain().focus().run()
                    }
                }}
            >
                <div style={{
                    width: '100%',
                    maxWidth: '850px',
                    background: 'var(--color-surface)',
                    padding: '4rem 5rem',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
                    minHeight: '75vh',
                    fontSize: '1.15rem',
                    lineHeight: '1.75',
                    color: 'var(--color-text)'
                }}>
                    <style>{`
                        .anansi-editor .ProseMirror {
                            min-height: 100%;
                            outline: none;
                        }
                        .anansi-editor .ProseMirror p {
                            margin-bottom: 1.25em;
                        }
                    `}</style>
                    <EditorContent editor={editor} className="anansi-editor" />
                </div>
            </div>
        </div>
    )
}
