import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { InternalLink } from '../../components/editor/extensions/InternalLink'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { WritingService } from '../../services/WritingService'
import { db } from '../../db/database'
import { History, ArrowLeftRight } from 'lucide-react'

// A small debounce utility within the file
let autosaveTimeout: any = null
let revisionTimeout: any = null

export default function SceneEditor() {
    const { activeSceneId } = useWorkspaceStore()
    const [isRevisionPanelOpen, setIsRevisionPanelOpen] = useState(false)
    const [revisions, setRevisions] = useState<any[]>([])
    const [selectedRevision, setSelectedRevision] = useState<any>(null)

    // Initialize TipTap
    const editor = useEditor({
        extensions: [
            StarterKit,
            InternalLink
        ],
        content: '<p>Loading scene from database...</p>',
        onUpdate: ({ editor }) => {
            if (!activeSceneId) return

            const json = editor.getJSON()
            const text = editor.getText()
            const wordCount = text.split(/\s+/).filter(Boolean).length

            // 1) Debounce active save (2 seconds)
            clearTimeout(autosaveTimeout)
            autosaveTimeout = setTimeout(async () => {
                await WritingService.updateSceneContent(activeSceneId, json, wordCount)
                console.log(`Autosaved Scene ${activeSceneId}`)
            }, 2000)

            // 2) Rolling Revision creation (60 seconds idle pause)
            clearTimeout(revisionTimeout)
            revisionTimeout = setTimeout(async () => {
                // Determine active projectId to attach to revision
                const projectId = useWorkspaceStore.getState().activeProjectId
                if (projectId) {
                    await WritingService.createSceneRevision(activeSceneId, projectId, json, wordCount)
                    console.log(`Created Snapshot Revision for Scene ${activeSceneId}`)
                }
            }, 60000)
        }
    })

    // Basic transition when the active scene changes
    useEffect(() => {
        if (!editor || !activeSceneId) return

        let mounted = true
        WritingService.getScene(activeSceneId).then(scene => {
            if (!mounted || !scene) return

            // Set the editor content directly from Dexie
            let content = scene.content

            // Just double checking it doesn't crash if empty
            if (!content || Object.keys(content).length === 0) {
                content = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Start writing here...' }] }] }
            }

            // Temporarily disable the change listener to avoid triggering autosave on load
            editor.commands.setContent(content, { emitUpdate: false })
        })

        return () => { mounted = false }
    }, [activeSceneId, editor])

    if (!activeSceneId) {
        return (
            <div className="editor-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                <h2>No Scene Selected</h2>
            </div>
        )
    }

    const loadRevisions = async () => {
        if (!activeSceneId) return
        const revs = await db.sceneRevisions.where({ sceneId: activeSceneId }).sortBy('createdAt')
        setRevisions(revs.reverse())
        setIsRevisionPanelOpen(true)
    }

    const restoreRevision = (contentJson: any) => {
        if (window.confirm("Restore this historical checkpoint? This will overwrite the current working draft immediately.")) {
            editor?.commands.setContent(contentJson)
            setIsRevisionPanelOpen(false)
        }
    }

    return (
        <div className="scene-editor" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Editor Toolbar Placeholder */}
            <div className="editor-toolbar" style={{ padding: '0.5rem', borderBottom: '1px dashed var(--color-border)', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
                <button className="btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
                <div style={{ flex: 1 }} />
                <button className="icon-btn" title="View Manuscript History" onClick={loadRevisions}>
                    <History size={18} />
                </button>
                <button
                    className="btn"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-primary)' }}
                    onClick={() => {
                        const name = window.prompt("Entity Name to link (e.g. 'Rose'):", "Anansi")
                        if (name) {
                            editor?.chain().focus().setInternalLink({ id: 'dummy-123', name, type: 'Character' }).run()
                        }
                    }}>
                    Insert Link Chip
                </button>
            </div>

            {/* Scrollable Canvas Area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }} className="editor-canvas">
                    <EditorContent editor={editor} style={{ outline: 'none', minHeight: '600px' }} />
                </div>

                {isRevisionPanelOpen && (
                    <div style={{ width: '350px', background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><History size={16} /> History</h3>
                            <button className="btn" style={{ fontSize: '0.7rem' }} onClick={() => setIsRevisionPanelOpen(false)}>Close</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {revisions.length === 0 ? (
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No historical checkpoints found. Snapshots automatically bind every 60 seconds of continuous edit flow.</div>
                            ) : revisions.map((rev: any) => (
                                <div
                                    key={rev.id}
                                    onClick={() => setSelectedRevision(rev)}
                                    style={{
                                        padding: '0.8rem',
                                        background: selectedRevision?.id === rev.id ? 'var(--color-bg)' : 'var(--color-surface)',
                                        border: `1px solid ${selectedRevision?.id === rev.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-text)' }}>{new Date(rev.createdAt).toLocaleString()}</strong>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{rev.wordCount} words</div>

                                    {selectedRevision?.id === rev.id && (
                                        <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <button className="btn active" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.4rem' }} onClick={() => restoreRevision(rev.content)}><ArrowLeftRight size={14} /> Restore Snapshot</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
