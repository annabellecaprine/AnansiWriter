import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { InternalLink } from '../../components/editor/extensions/InternalLink'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { WritingService } from '../../services/WritingService'
import { db } from '../../db/database'
import SceneInspector from './SceneInspector'
import MentionAutocomplete from '../../components/editor/MentionAutocomplete'
import {
    Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
    List, ListOrdered, Quote, Minus, Undo, Redo, Eye, EyeOff,
    PanelRight, AtSign, Save
} from 'lucide-react'

// Debounce timeouts
let autosaveTimeout: any = null
let revisionTimeout: any = null

export default function SceneEditor() {
    const { activeSceneId, activeProjectId } = useWorkspaceStore()
    const [sceneTitle, setSceneTitle] = useState('')
    const [wordCount, setWordCount] = useState(0)
    const [targetWordCount, setTargetWordCount] = useState(1000)
    const [isInspectorOpen, setIsInspectorOpen] = useState(false)
    const [isFocusMode, setIsFocusMode] = useState(false)
    const [isAutosaving, setIsAutosaving] = useState(false)

    // Mention Autocomplete Popover state
    const [showMentionMenu, setShowMentionMenu] = useState(false)
    const [mentionQuery, setMentionQuery] = useState('')

    // Initialize TipTap Editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] }
            }),
            Underline,
            InternalLink
        ],
        content: '<p>Loading scene content...</p>',
        onUpdate: ({ editor }) => {
            if (!activeSceneId) return

            const json = editor.getJSON()
            const text = editor.getText()
            const words = text.split(/\s+/).filter(Boolean).length
            setWordCount(words)

            // Detect @ mention typing
            const { selection } = editor.state
            const textBefore = editor.state.doc.textBetween(Math.max(0, selection.from - 20), selection.from, ' ')
            const match = textBefore.match(/@([a-zA-Z0-9_]*)$/)
            if (match) {
                setMentionQuery(match[1])
                setShowMentionMenu(true)
            } else {
                setShowMentionMenu(false)
            }

            // 1) Debounced autosave (1.5 seconds)
            setIsAutosaving(true)
            clearTimeout(autosaveTimeout)
            autosaveTimeout = setTimeout(async () => {
                await WritingService.updateSceneContent(activeSceneId, json, words)
                setIsAutosaving(false)
            }, 1500)

            // 2) Rolling Revision Snapshot (60 seconds idle pause)
            clearTimeout(revisionTimeout)
            revisionTimeout = setTimeout(async () => {
                const projectId = useWorkspaceStore.getState().activeProjectId
                if (projectId) {
                    await WritingService.createSceneRevision(activeSceneId, projectId, json, words)
                }
            }, 60000)
        }
    })

    // Load Scene data when activeSceneId changes
    useEffect(() => {
        if (!activeSceneId) return
        let mounted = true

        db.scenes.get(activeSceneId).then(s => {
            if (!mounted || !s) return
            setSceneTitle(s.name || 'Untitled Scene')
            setTargetWordCount(s.targetWordCount || 1000)

            let content = s.content
            if (!content || Object.keys(content).length === 0) {
                content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] }
            }

            if (editor) {
                editor.commands.setContent(content, { emitUpdate: false })
                const text = editor.getText()
                setWordCount(text.split(/\s+/).filter(Boolean).length)
            }
        })

        return () => { mounted = false }
    }, [activeSceneId, editor])

    const handleTitleChange = async (newTitle: string) => {
        setSceneTitle(newTitle)
        if (activeSceneId) {
            await db.scenes.update(activeSceneId, { name: newTitle, updatedAt: Date.now() })
        }
    }

    const handleInsertMention = (entry: { id: string, name: string, type: string }) => {
        if (!editor) return
        // Delete typed @ text before inserting chip node
        const { selection } = editor.state
        const textBefore = editor.state.doc.textBetween(Math.max(0, selection.from - 20), selection.from, ' ')
        const match = textBefore.match(/@([a-zA-Z0-9_]*)$/)

        if (match) {
            const start = selection.from - match[0].length
            editor.chain().focus().deleteRange({ from: start, to: selection.from }).run()
        }

        editor.chain().focus().setInternalLink({ id: entry.id, name: entry.name, type: entry.type }).run()
        setShowMentionMenu(false)
    }

    if (!activeSceneId) {
        return (
            <div className="editor-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                <h2>No Scene Selected</h2>
            </div>
        )
    }

    const progressPct = Math.min(100, Math.round((wordCount / (targetWordCount || 1)) * 100))

    return (
        <div className="scene-editor-container" style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                {/* Scene Header Bar (hidden in Focus Mode) */}
                {!isFocusMode && (
                    <header
                        style={{
                            padding: '0.75rem 1.5rem',
                            borderBottom: '1px solid var(--color-border)',
                            background: 'var(--color-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem'
                        }}
                    >
                        {/* Title & Status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                            <input
                                type="text"
                                className="input"
                                value={sceneTitle}
                                onChange={e => handleTitleChange(e.target.value)}
                                style={{
                                    fontSize: '1.2rem',
                                    fontWeight: 700,
                                    border: 'none',
                                    background: 'transparent',
                                    padding: '0.2rem 0.5rem',
                                    color: 'var(--color-text)',
                                    flex: 1
                                }}
                                placeholder="Scene Title..."
                            />
                            <span style={{ fontSize: '0.75rem', color: isAutosaving ? 'var(--color-primary)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Save size={12} /> {isAutosaving ? 'Saving...' : 'Saved'}
                            </span>
                        </div>

                        {/* Word Count Progress Bar & Goal */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', width: '160px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                                    <span>{wordCount} words</span>
                                    <span>{targetWordCount} target</span>
                                </div>
                                <div style={{ height: '6px', background: 'var(--color-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.3s ease' }} />
                                </div>
                            </div>

                            {/* Focus Mode & Inspector Toggles */}
                            <button
                                className={`btn ${isFocusMode ? 'active' : ''}`}
                                onClick={() => setIsFocusMode(!isFocusMode)}
                                title="Toggle Distraction-Free Focus Mode"
                                aria-label="Toggle Focus Mode"
                                style={{ padding: '0.4rem 0.6rem' }}
                            >
                                {isFocusMode ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>

                            <button
                                className={`btn ${isInspectorOpen ? 'active' : ''}`}
                                onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                                title="Toggle Scene Inspector Panel"
                                aria-label="Toggle Scene Inspector"
                                style={{ padding: '0.4rem 0.6rem' }}
                            >
                                <PanelRight size={16} />
                            </button>
                        </div>
                    </header>
                )}

                {/* Rich Formatting Toolbar (hidden in Focus Mode) */}
                {!isFocusMode && editor && (
                    <div
                        className="editor-toolbar"
                        style={{
                            padding: '0.5rem 1.5rem',
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
                            aria-label="Bold"
                            style={{ padding: '0.35rem' }}
                        >
                            <Bold size={16} />
                        </button>
                        <button
                            className={`btn ${editor.isActive('italic') ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            title="Italic (Ctrl+I)"
                            aria-label="Italic"
                            style={{ padding: '0.35rem' }}
                        >
                            <Italic size={16} />
                        </button>
                        <button
                            className={`btn ${editor.isActive('strike') ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleStrike().run()}
                            title="Strikethrough"
                            aria-label="Strikethrough"
                            style={{ padding: '0.35rem' }}
                        >
                            <Strikethrough size={16} />
                        </button>
                        <button
                            className={`btn ${editor.isActive('code') ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleCode().run()}
                            title="Inline Code"
                            aria-label="Code"
                            style={{ padding: '0.35rem' }}
                        >
                            <Code size={16} />
                        </button>

                        <div style={{ width: '1px', height: '18px', background: 'var(--color-border)', margin: '0 0.35rem' }} />

                        <button
                            className={`btn ${editor.isActive('heading', { level: 1 }) ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            title="Heading 1"
                            aria-label="Heading 1"
                            style={{ padding: '0.35rem' }}
                        >
                            <Heading1 size={16} />
                        </button>
                        <button
                            className={`btn ${editor.isActive('heading', { level: 2 }) ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                            title="Heading 2"
                            aria-label="Heading 2"
                            style={{ padding: '0.35rem' }}
                        >
                            <Heading2 size={16} />
                        </button>
                        <button
                            className={`btn ${editor.isActive('heading', { level: 3 }) ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                            title="Heading 3"
                            aria-label="Heading 3"
                            style={{ padding: '0.35rem' }}
                        >
                            <Heading3 size={16} />
                        </button>

                        <div style={{ width: '1px', height: '18px', background: 'var(--color-border)', margin: '0 0.35rem' }} />

                        <button
                            className={`btn ${editor.isActive('bulletList') ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            title="Bullet List"
                            aria-label="Bullet List"
                            style={{ padding: '0.35rem' }}
                        >
                            <List size={16} />
                        </button>
                        <button
                            className={`btn ${editor.isActive('orderedList') ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            title="Numbered List"
                            aria-label="Numbered List"
                            style={{ padding: '0.35rem' }}
                        >
                            <ListOrdered size={16} />
                        </button>
                        <button
                            className={`btn ${editor.isActive('blockquote') ? 'active' : ''}`}
                            onClick={() => editor.chain().focus().toggleBlockquote().run()}
                            title="Blockquote"
                            aria-label="Blockquote"
                            style={{ padding: '0.35rem' }}
                        >
                            <Quote size={16} />
                        </button>
                        <button
                            className="btn"
                            onClick={() => editor.chain().focus().setHorizontalRule().run()}
                            title="Horizontal Rule"
                            aria-label="Horizontal Rule"
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
                            aria-label="Undo"
                            style={{ padding: '0.35rem' }}
                        >
                            <Undo size={16} />
                        </button>
                        <button
                            className="btn"
                            onClick={() => editor.chain().focus().redo().run()}
                            disabled={!editor.can().redo()}
                            title="Redo (Ctrl+Y)"
                            aria-label="Redo"
                            style={{ padding: '0.35rem' }}
                        >
                            <Redo size={16} />
                        </button>

                        <div style={{ flex: 1 }} />

                        <button
                            className="btn primary"
                            onClick={() => {
                                setMentionQuery('')
                                setShowMentionMenu(true)
                            }}
                            title="Insert Entity Link Chip (@)"
                            aria-label="Insert Link Chip"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                            <AtSign size={14} /> Mention Entity
                        </button>
                    </div>
                )}

                {/* Main Scrollable Canvas Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: isFocusMode ? '3rem 2rem' : '2rem', display: 'flex', justifyContent: 'center', background: isFocusMode ? '#0a0a0c' : 'var(--color-bg)' }}>
                    <div
                        style={{
                            maxWidth: isFocusMode ? '720px' : '820px',
                            width: '100%',
                            background: 'var(--color-surface)',
                            minHeight: '800px',
                            padding: isFocusMode ? '4rem 5rem' : '3rem 4rem',
                            borderRadius: 'var(--radius-md)',
                            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                            border: '1px solid var(--color-border)',
                            position: 'relative'
                        }}
                    >
                        <EditorContent editor={editor} style={{ outline: 'none', minHeight: '650px', fontSize: '1.05rem', lineHeight: '1.8' }} />

                        {/* Floating Mention Autocomplete Popover */}
                        {showMentionMenu && activeProjectId && (
                            <div style={{ position: 'absolute', top: '100px', left: '100px' }}>
                                <MentionAutocomplete
                                    projectId={activeProjectId}
                                    query={mentionQuery}
                                    onSelect={handleInsertMention}
                                    onClose={() => setShowMentionMenu(false)}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inspector Side-Drawer */}
            {isInspectorOpen && (
                <SceneInspector
                    sceneId={activeSceneId}
                    editorContent={editor?.getJSON()}
                    onClose={() => setIsInspectorOpen(false)}
                    onRestoreRevision={(content) => {
                        if (confirm("Restore this historical checkpoint? Current working draft will be updated.")) {
                            editor?.commands.setContent(content)
                        }
                    }}
                />
            )}
        </div>
    )
}
