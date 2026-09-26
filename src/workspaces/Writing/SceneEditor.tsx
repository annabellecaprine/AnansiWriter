import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { InternalLink } from '../../components/editor/extensions/InternalLink'
import { LiveCodexHighlight } from '../../components/editor/extensions/LiveCodexHighlight'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { WritingService } from '../../services/WritingService'
import { db } from '../../db/database'
import ContextInspector from './ContextInspector'
import MentionAutocomplete from '../../components/editor/MentionAutocomplete'
import SlashCommandMenu from '../../components/editor/SlashCommandMenu'
import { confirmAction } from '../../store/dialogStore'
import NovelBreadcrumb from '../../components/shared/NovelBreadcrumb'
import SceneActionsMenu from '../../components/shared/SceneActionsMenu'
import {
    Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
    List, ListOrdered, Quote, Minus, Undo, Redo, Eye, EyeOff,
    PanelRight, PanelLeft, AtSign, Save, MoreHorizontal
} from 'lucide-react'

// Debounce timeouts
let autosaveTimeout: any = null
let revisionTimeout: any = null

// Define extensions via factory to avoid React StrictMode duplicate warnings
const getEditorExtensions = () => [
    StarterKit.configure({
        heading: { levels: [1, 2, 3] }
    }),
    Underline,
    InternalLink,
    LiveCodexHighlight
]

export default function SceneEditor() {
    const { activeSceneId, activeNovelId, isRightPaneOpen, toggleRightPane, isLeftPaneOpen, toggleLeftPane, addDailyWords } = useWorkspaceStore()
    const lastWordCountRef = useRef(0)
    const [sceneTitle, setSceneTitle] = useState('')
    const [wordCount, setWordCount] = useState(0)
    const [targetWordCount, setTargetWordCount] = useState(1000)
    const [isFocusMode, setIsFocusMode] = useState(false)
    const [isAutosaving, setIsAutosaving] = useState(false)
    const [showActionsMenu, setShowActionsMenu] = useState(false)
    const [inspectorTab, setInspectorTab] = useState<'backlinks' | 'beats' | 'revisions'>('beats')
    const actionsButtonRef = useRef<HTMLButtonElement>(null)

    // Mention & Slash Command Popover states
    const [showMentionMenu, setShowMentionMenu] = useState(false)
    const [mentionQuery, setMentionQuery] = useState('')
    const [mentionCoords, setMentionCoords] = useState<{ top: number, left: number }>({ top: 0, left: 0 })

    const [showSlashMenu, setShowSlashMenu] = useState(false)
    const [slashQuery, setSlashQuery] = useState('')

    // Entity Detector Heuristics
    const [showDetectorModal, setShowDetectorModal] = useState(false)
    const [detectedMatches, setDetectedMatches] = useState<{ entry: any, count: number }[]>([])

    // Initialize TipTap Editor
    const editor = useEditor({
        extensions: getEditorExtensions(),
        content: '<p>Loading scene content...</p>',
        onUpdate: ({ editor }) => {
            if (!activeSceneId) return

            const json = editor.getJSON()
            const text = editor.getText()
            const words = text.split(/\s+/).filter(Boolean).length

            const diff = words - lastWordCountRef.current
            if (diff !== 0) {
                // Ignore enormous pasting spikes/wipes as anomalies (e.g. replacing whole chapters)
                if (Math.abs(diff) < 2000) {
                    addDailyWords(diff)
                }
                lastWordCountRef.current = words
            }

            setWordCount(words)

            // Detect '+' codex quick-reference typing
            const { selection } = editor.state
            const textBefore = editor.state.doc.textBetween(Math.max(0, selection.from - 40), selection.from, ' ')
            const match = textBefore.match(/(?:^|\s)\+([a-zA-Z0-9_\- ]{0,25})$/)

            if (match) {
                setMentionQuery(match[1])
                setShowMentionMenu(true)
                const coords = editor.view.coordsAtPos(selection.from)
                setMentionCoords({ top: coords.top + 20, left: coords.left })
            } else {
                setShowMentionMenu(false)
            }

            // Detect / slash command typing
            const slashMatch = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/)
            if (slashMatch && !match) {
                setSlashQuery(slashMatch[1])
                setShowSlashMenu(true)
            } else {
                setShowSlashMenu(false)
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
                const novelId = useWorkspaceStore.getState().activeNovelId
                if (novelId) {
                    await WritingService.createSceneRevision(activeSceneId, novelId, json, words)
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
                const wc = text.split(/\s+/).filter(Boolean).length
                setWordCount(wc)
                lastWordCountRef.current = wc
            }

            // Sync structural selection upward for ContextInspector
            const store = useWorkspaceStore.getState()
            if (s.chapterId && store.activeChapterId !== s.chapterId) {
                store.setActiveChapter(s.chapterId)
            }
        })

        return () => { mounted = false }
    }, [activeSceneId, editor])

    // Sync Codex Highlight targets automatically
    useEffect(() => {
        if (!activeNovelId || !editor) return
        let mounted = true
        db.bibleEntries.where({ novelId: activeNovelId }).toArray().then(entries => {
            if (!mounted) return
            // Sort to ensure longer phrases match first, avoiding partial shadows!
            entries.sort((a, b) => b.name.length - a.name.length)
                ; (editor.storage as any).codexHighlight.entries = entries
            editor.view.dispatch(editor.state.tr.setMeta('codexHighlightUpdate', true))
        })
        return () => { mounted = false }
    }, [activeNovelId, editor])

    const handleTitleChange = async (newTitle: string) => {
        setSceneTitle(newTitle)
        if (activeSceneId) {
            await db.scenes.update(activeSceneId, { name: newTitle, updatedAt: Date.now() })
        }
    }

    const handleInsertMention = (entry: { id: string, name: string, type: string }) => {
        if (!editor) return
        // Delete typed '+' logic match before inserting chip node
        const { selection } = editor.state
        const textBefore = editor.state.doc.textBetween(Math.max(0, selection.from - 40), selection.from, ' ')
        const match = textBefore.match(/(?:^|\s)\+([a-zA-Z0-9_\- ]{0,25})$/)

        if (match) {
            const spacesOffset = match[0].startsWith(' ') || match[0].startsWith('\n') ? 1 : 0
            const start = selection.from - match[0].length + spacesOffset
            editor.chain().focus().deleteRange({ from: start, to: selection.from }).run()
        }

        editor.chain().focus().setInternalLink({ id: entry.id, name: entry.name, type: entry.type }).run()
        setShowMentionMenu(false)
    }

    const handleInsertSlashCmd = (cmd: string) => {
        if (!editor || !activeSceneId) return

        // Delete typed slash command string
        const { selection } = editor.state
        const textBefore = editor.state.doc.textBetween(Math.max(0, selection.from - 20), selection.from, ' ')
        const slashMatch = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9_-]*)$/)

        if (slashMatch) {
            const start = selection.from - slashMatch[0].length + (slashMatch[0].startsWith(' ') || slashMatch[0].startsWith('\n') ? 1 : 0)
            editor.chain().focus().deleteRange({ from: start, to: selection.from }).run()
        }

        if (cmd === 'clear-slash') {
            setShowSlashMenu(false)
            return
        }

        switch (cmd) {
            case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
            case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
            case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
            case 'scene-break': editor.chain().focus().insertContent('<p style="text-align: center;">* * *</p><p></p>').run(); break;
            case 'hr': editor.chain().focus().setHorizontalRule().run(); break;
            case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
        }
        setShowSlashMenu(false)
    }

    const handleScanCodex = async () => {
        if (!editor || !activeNovelId) return
        const entries = await db.bibleEntries.where({ novelId: activeNovelId }).toArray()

        entries.sort((a, b) => b.name.length - a.name.length) // Longer names matched first!

        const docText = editor.getText()
        const matches: { entry: any, count: number }[] = []

        for (const entry of entries) {
            const targets = [entry.name, ...(entry.aliases || [])].filter(Boolean)
            let totalCount = 0
            for (const t of targets) {
                if (!t) continue;
                // Escape regex sequences
                const safeT = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                const regex = new RegExp(`\\b${safeT}\\b`, 'gi')
                const occurrences = [...docText.matchAll(regex)]
                if (occurrences.length > 0) totalCount += occurrences.length
            }
            if (totalCount > 0) {
                matches.push({ entry, count: totalCount })
            }
        }
        setDetectedMatches(matches)
        setShowDetectorModal(true)
    }

    const handleApplyLink = (entry: any) => {
        if (!editor) return
        let html = editor.getHTML()
        const targets = [entry.name, ...(entry.aliases || [])].filter(Boolean)

        for (const t of targets) {
            if (!t) continue;
            const safeT = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            // Negative lookahead to prevent matching inside existing HTML tags/links!
            const rx = new RegExp(`\\b(${safeT})\\b(?![^<]*>)`, 'gi')
            html = html.replace(rx, `<span class="internal-link" data-id="${entry.id}" data-linkname="${entry.name}" data-linktype="${entry.type}">$1</span>`)
        }

        editor.commands.setContent(html)
        setDetectedMatches(prev => prev.filter(m => m.entry.id !== entry.id))
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
                {/* Novel Breadcrumb (always visible, hidden in focus mode) */}
                {!isFocusMode && <NovelBreadcrumb />}

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
                            <span style={{ fontSize: '0.75rem', color: isAutosaving ? 'var(--color-accent)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Save size={12} /> {isAutosaving ? 'Saving...' : 'Saved'}
                            </span>
                            <button
                                ref={actionsButtonRef}
                                className="btn"
                                onClick={() => setShowActionsMenu(v => !v)}
                                title="Scene Actions"
                                style={{ padding: '0.35rem 0.5rem' }}
                            >
                                <MoreHorizontal size={16} />
                            </button>
                            {showActionsMenu && activeSceneId && (
                                <SceneActionsMenu
                                    sceneId={activeSceneId}
                                    anchorRef={actionsButtonRef}
                                    onClose={() => setShowActionsMenu(false)}
                                    onDetectLinks={handleScanCodex}
                                    onOpenInspector={(tab) => {
                                        if (tab) setInspectorTab(tab)
                                        if (!isRightPaneOpen) toggleRightPane()
                                    }}
                                />
                            )}
                        </div>

                        {/* Word Count Progress Bar & Goal */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', width: '160px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                                    <span>{wordCount} words</span>
                                    <span>{targetWordCount} target</span>
                                </div>
                                <div style={{ height: '6px', background: 'var(--color-bg)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.3s ease' }} />
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
                                className={`btn ${isLeftPaneOpen ? 'active' : ''}`}
                                onClick={toggleLeftPane}
                                title="Toggle Explorer Sidebar"
                                aria-label="Toggle Explorer"
                                style={{ padding: '0.4rem 0.6rem' }}
                            >
                                <PanelLeft size={16} />
                            </button>

                            <button
                                className={`btn ${isRightPaneOpen ? 'active' : ''}`}
                                onClick={toggleRightPane}
                                title="Toggle Context Inspector Panel"
                                aria-label="Toggle Context Inspector"
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
                <div
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: isFocusMode ? '3rem 2rem' : '2rem',
                        display: 'flex',
                        justifyContent: 'center',
                        background: 'var(--color-bg)',
                        cursor: 'text'
                    }}
                    onClick={(e) => {
                        if (!editor) return
                        const target = e.target as HTMLElement
                        if (target.tagName !== 'A' && target.tagName !== 'BUTTON' && !target.closest('.internal-link')) {
                            editor.chain().focus().run()
                        }
                    }}
                >
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
                            position: 'relative',
                            color: 'var(--color-text)'
                        }}
                    >
                        <style>{`
                            .anansi-scene-editor .ProseMirror {
                                min-height: 700px;
                                outline: none;
                            }
                            .anansi-scene-editor .ProseMirror p {
                                margin-bottom: 1.25em;
                            }
                        `}</style>
                        <EditorContent editor={editor} className="anansi-scene-editor" style={{ fontSize: '1.15rem', lineHeight: '1.8' }} />

                        {/* Floating Mention Autocomplete Popover */}
                        {showMentionMenu && activeNovelId && (
                            <div style={{ position: 'fixed', top: mentionCoords.top, left: mentionCoords.left, zIndex: 9999 }}>
                                <MentionAutocomplete
                                    novelId={activeNovelId}
                                    query={mentionQuery}
                                    onSelect={handleInsertMention}
                                    onClose={() => setShowMentionMenu(false)}
                                />
                            </div>
                        )}

                        {/* Floating Slash Command Popover */}
                        {showSlashMenu && activeSceneId && (
                            <div style={{ position: 'absolute', top: '100px', left: '150px', zIndex: 50 }}>
                                <SlashCommandMenu
                                    query={slashQuery}
                                    onSelect={handleInsertSlashCmd}
                                    onClose={() => setShowSlashMenu(false)}
                                    sceneId={activeSceneId}
                                />
                            </div>
                        )}

                        {/* Detector Modal Overlay */}
                        {showDetectorModal && (
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ background: 'var(--color-surface)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', width: '100%', maxWidth: '400px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                                    <h3 style={{ margin: '0 0 1rem 0' }}>Codex Detection Scanner</h3>
                                    {detectedMatches.length === 0 ? (
                                        <p style={{ color: 'var(--color-text-muted)' }}>No unlinked entities found matching current active Codex entries.</p>
                                    ) : (
                                        <>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Found the following text fragments natively matching your Codex aliases structure. Would you like to map them completely into internal links?</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto', marginBottom: '1.5rem' }}>
                                                {detectedMatches.map(m => (
                                                    <div key={m.entry.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)' }}>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{m.entry.name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Found {m.count} instance(s)</div>
                                                        </div>
                                                        <button className="btn primary" onClick={() => handleApplyLink(m.entry)} style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}>Link All</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                        <button className="btn" onClick={() => setShowDetectorModal(false)}>Close Scanner</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Inspector Side-Drawer */}
            {isRightPaneOpen && (
                <ContextInspector
                    sceneId={activeSceneId}
                    editorContent={editor?.getJSON()}
                    onClose={toggleRightPane}
                    initialTab={inspectorTab}
                    onRestoreRevision={async (content) => {
                        const confirmed = await confirmAction({
                            title: 'Restore Checkpoint',
                            message: 'Restore this historical checkpoint? Current working draft will be updated.'
                        })
                        if (confirmed) {
                            editor?.commands.setContent(content)
                        }
                    }}
                />
            )}
        </div>
    )
}
