import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { InternalLink } from '../../components/editor/extensions/InternalLink'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { WritingService } from '../../services/WritingService'

// A small debounce utility within the file
let autosaveTimeout: any = null
let revisionTimeout: any = null

export default function SceneEditor() {
    const { activeSceneId } = useWorkspaceStore()

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

    return (
        <div className="scene-editor" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Editor Toolbar Placeholder */}
            <div className="editor-toolbar" style={{ padding: '0.5rem', borderBottom: '1px dashed var(--color-border)', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={() => editor?.chain().focus().toggleBold().run()}>Bold</button>
                <button className="btn" onClick={() => editor?.chain().focus().toggleItalic().run()}>Italic</button>
                <div style={{ flex: 1 }} />
                <button
                    className="btn"
                    style={{ background: 'var(--color-surface)', color: 'var(--color-primary)' }}
                    onClick={() => {
                        // Testing mock logic for now
                        const name = window.prompt("Entity Name to link (e.g. 'Rose'):", "Anansi")
                        if (name) {
                            editor?.chain().focus().setInternalLink({ id: 'dummy-123', name, type: 'Character' }).run()
                        }
                    }}>
                    Insert Link Chip
                </button>
            </div>

            {/* Scrollable Canvas Area */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }} className="editor-canvas">
                <EditorContent editor={editor} style={{ outline: 'none', minHeight: '600px' }} />
            </div>
        </div>
    )
}
