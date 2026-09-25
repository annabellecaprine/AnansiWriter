import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Link as LinkIcon, FileText, History, X, ArrowLeftRight, User, MapPin, Tag, Plus, Trash2 } from 'lucide-react'

interface SceneInspectorProps {
    sceneId: string
    editorContent: any
    onClose: () => void
    onRestoreRevision: (content: any) => void
}

export default function SceneInspector({ sceneId, editorContent, onClose, onRestoreRevision }: SceneInspectorProps) {
    const { activeProjectId } = useWorkspaceStore()
    const [activeTab, setActiveTab] = useState<'backlinks' | 'beats' | 'revisions'>('backlinks')

    // Backlinks state
    const [referencedEntries, setReferencedEntries] = useState<any[]>([])

    // Scene Beats & Metadata state
    const [summary, setSummary] = useState('')
    const [status, setStatus] = useState<'Draft' | 'Revised' | 'Final'>('Draft')
    const [povCharacterId, setPovCharacterId] = useState('')
    const [notes, setNotes] = useState<string[]>([])
    const [newNote, setNewNote] = useState('')
    const [characters, setCharacters] = useState<any[]>([])

    // Revisions state
    const [revisions, setRevisions] = useState<any[]>([])
    const [selectedRevision, setSelectedRevision] = useState<any>(null)

    // Load scene metadata & project characters
    useEffect(() => {
        if (!sceneId) return

        let mounted = true
        db.scenes.get(sceneId).then(scene => {
            if (!mounted || !scene) return
            setSummary(scene.summary || '')
            setStatus((scene.status as 'Draft' | 'Revised' | 'Final') || 'Draft')
            setPovCharacterId(scene.povCharacterId || '')
            const rawNotes = scene.notes
            setNotes(Array.isArray(rawNotes) ? rawNotes : (typeof rawNotes === 'string' && rawNotes.length ? [rawNotes] : []))
        })

        if (activeProjectId) {
            db.bibleEntries.where({ projectId: activeProjectId }).toArray().then(entries => {
                if (mounted) setCharacters(entries.filter(e => e.type === 'Character'))
            })
        }

        return () => { mounted = false }
    }, [sceneId, activeProjectId])

    // Extract backlinks from editor JSON content
    useEffect(() => {
        if (!editorContent || !activeProjectId) return

        const extractedIds = new Set<string>()

        const traverse = (node: any) => {
            if (!node) return
            if (node.type === 'internalLink' && node.attrs?.id) {
                extractedIds.add(node.attrs.id)
            }
            if (node.content && Array.isArray(node.content)) {
                node.content.forEach(traverse)
            }
        }

        traverse(editorContent)

        if (extractedIds.size > 0) {
            db.bibleEntries.where('id').anyOf(Array.from(extractedIds)).toArray().then(entries => {
                setReferencedEntries(entries)
            })
        } else {
            setReferencedEntries([])
        }
    }, [editorContent, activeProjectId])

    // Load Revisions
    useEffect(() => {
        if (!sceneId) return
        db.sceneRevisions.where({ sceneId }).sortBy('createdAt').then(revs => {
            setRevisions(revs.reverse())
        })
    }, [sceneId, activeTab])

    const handleSaveMetadata = async () => {
        if (!sceneId) return
        await db.scenes.update(sceneId, {
            summary,
            status,
            povCharacterId,
            notes,
            updatedAt: Date.now()
        })
    }

    const handleAddNote = () => {
        if (!newNote.trim()) return
        const updated = [...notes, newNote.trim()]
        setNotes(updated)
        setNewNote('')
        db.scenes.update(sceneId, { notes: updated, updatedAt: Date.now() })
    }

    const handleDeleteNote = (idx: number) => {
        const updated = notes.filter((_, i) => i !== idx)
        setNotes(updated)
        db.scenes.update(sceneId, { notes: updated, updatedAt: Date.now() })
    }

    return (
        <aside
            style={{
                width: '360px',
                background: 'var(--color-surface)',
                borderLeft: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                flexShrink: 0
            }}
            aria-label="Scene Inspector Panel"
        >
            {/* Header with Tabs */}
            <div style={{ borderBottom: '1px solid var(--color-border)', padding: '0.75rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Scene Inspector</h3>
                    <button className="btn" onClick={onClose} style={{ padding: '0.2rem 0.4rem' }} aria-label="Close Inspector">
                        <X size={16} />
                    </button>
                </div>

                <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '0.2rem' }}>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('backlinks')}
                        style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            padding: '0.35rem',
                            background: activeTab === 'backlinks' ? 'var(--color-surface)' : 'transparent',
                            color: activeTab === 'backlinks' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            border: 'none',
                            fontWeight: activeTab === 'backlinks' ? 600 : 400
                        }}
                    >
                        <LinkIcon size={12} style={{ marginRight: '0.25rem' }} /> Backlinks ({referencedEntries.length})
                    </button>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('beats')}
                        style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            padding: '0.35rem',
                            background: activeTab === 'beats' ? 'var(--color-surface)' : 'transparent',
                            color: activeTab === 'beats' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            border: 'none',
                            fontWeight: activeTab === 'beats' ? 600 : 400
                        }}
                    >
                        <FileText size={12} style={{ marginRight: '0.25rem' }} /> Beats & Notes
                    </button>
                    <button
                        className="btn"
                        onClick={() => setActiveTab('revisions')}
                        style={{
                            flex: 1,
                            fontSize: '0.75rem',
                            padding: '0.35rem',
                            background: activeTab === 'revisions' ? 'var(--color-surface)' : 'transparent',
                            color: activeTab === 'revisions' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            border: 'none',
                            fontWeight: activeTab === 'revisions' ? 600 : 400
                        }}
                    >
                        <History size={12} style={{ marginRight: '0.25rem' }} /> Revisions ({revisions.length})
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {/* TAB 1: Referenced Entities (Backlinks) */}
                {activeTab === 'backlinks' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                            Entities referenced in this scene via <code style={{ color: 'var(--color-primary)' }}>@mentions</code>:
                        </div>

                        {referencedEntries.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                <LinkIcon size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p style={{ margin: 0 }}>No entity backlinks found in this scene.</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>Type <kbd>@</kbd> inside the editor to link a character or location.</p>
                            </div>
                        ) : (
                            referencedEntries.map(entry => (
                                <div
                                    key={entry.id}
                                    style={{
                                        background: 'var(--color-bg)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-sm)',
                                        padding: '0.75rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.35rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                            {entry.type === 'Character' && <User size={14} color="var(--color-primary)" />}
                                            {entry.type === 'Location' && <MapPin size={14} color="#28a745" />}
                                            {entry.type !== 'Character' && entry.type !== 'Location' && <Tag size={14} color="#ffc107" />}
                                            {entry.name}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', background: 'var(--color-surface)', padding: '0.1rem 0.35rem', borderRadius: '3px', border: '1px solid var(--color-border)' }}>
                                            {entry.type}
                                        </span>
                                    </div>
                                    {entry.role && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                                            Role: {entry.role}
                                        </div>
                                    )}
                                    {entry.description && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                            {entry.description}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* TAB 2: Scene Beats & Notes */}
                {activeTab === 'beats' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Status & POV */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Status</label>
                                <select
                                    className="input"
                                    value={status}
                                    onChange={e => { setStatus(e.target.value as any); handleSaveMetadata() }}
                                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}
                                >
                                    <option value="Draft">Draft</option>
                                    <option value="Revised">Revised</option>
                                    <option value="Final">Final</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>POV Character</label>
                                <select
                                    className="input"
                                    value={povCharacterId}
                                    onChange={e => { setPovCharacterId(e.target.value); handleSaveMetadata() }}
                                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}
                                >
                                    <option value="">(None)</option>
                                    {characters.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Synopsis */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Scene Synopsis</label>
                            <textarea
                                className="input"
                                rows={3}
                                placeholder="Brief overview of scene objectives, conflict, and outcome..."
                                value={summary}
                                onChange={e => setSummary(e.target.value)}
                                onBlur={handleSaveMetadata}
                                style={{ width: '100%', fontSize: '0.8rem', resize: 'vertical' }}
                            />
                        </div>

                        {/* Beat Notes */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>Narrative Beat Notes</label>
                            <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Add beat (e.g., 'Protagonist discovers key cipher')..."
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                                    style={{ flex: 1, fontSize: '0.8rem', padding: '0.35rem' }}
                                />
                                <button className="btn primary" onClick={handleAddNote} style={{ padding: '0.35rem 0.6rem' }} aria-label="Add Beat Note">
                                    <Plus size={14} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                {notes.map((note, idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            background: 'var(--color-bg)',
                                            padding: '0.4rem 0.6rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '0.8rem'
                                        }}
                                    >
                                        <span style={{ flex: 1, paddingRight: '0.5rem' }}>{note}</span>
                                        <button
                                            className="btn"
                                            onClick={() => handleDeleteNote(idx)}
                                            style={{ padding: '0.15rem 0.3rem', color: '#dc3545', border: 'none' }}
                                            title="Delete Note"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* TAB 3: Snapshots & Version History */}
                {activeTab === 'revisions' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {revisions.length === 0 ? (
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '2rem 1rem' }}>
                                <History size={24} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                                <p style={{ margin: 0 }}>No historical checkpoints found.</p>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem' }}>Snapshots are automatically saved every 60 seconds during active writing.</p>
                            </div>
                        ) : (
                            revisions.map((rev: any) => (
                                <div
                                    key={rev.id}
                                    onClick={() => setSelectedRevision(rev)}
                                    style={{
                                        padding: '0.75rem',
                                        background: selectedRevision?.id === rev.id ? 'var(--color-bg)' : 'var(--color-surface)',
                                        border: `1px solid ${selectedRevision?.id === rev.id ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <strong style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>
                                            {new Date(rev.createdAt).toLocaleTimeString()}
                                        </strong>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {rev.wordCount} words
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                        {new Date(rev.createdAt).toLocaleDateString()}
                                    </div>

                                    {selectedRevision?.id === rev.id && (
                                        <div style={{ marginTop: '0.6rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.6rem' }}>
                                            <button
                                                className="btn primary"
                                                style={{ width: '100%', fontSize: '0.8rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', padding: '0.4rem' }}
                                                onClick={() => onRestoreRevision(rev.content)}
                                            >
                                                <ArrowLeftRight size={14} /> Restore This Snapshot
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </aside>
    )
}
