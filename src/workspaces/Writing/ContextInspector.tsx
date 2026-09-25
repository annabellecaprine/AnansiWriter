import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Link as LinkIcon, FileText, History, X, ArrowLeftRight, User, MapPin, Tag, Plus, Trash2, FolderOpen, BookOpen, Sparkles, ArrowRight } from 'lucide-react'
import TipTapEditor from '../../components/editor/TipTapEditor'

interface SceneInspectorProps {
    sceneId: string
    editorContent: any
    onClose: () => void
    onRestoreRevision: (content: any) => void
    initialTab?: 'backlinks' | 'beats' | 'revisions'
}

export default function ContextInspector({ sceneId, editorContent, onClose, onRestoreRevision, initialTab }: SceneInspectorProps) {
    const { activeNovelId, activeChapterId } = useWorkspaceStore()
    const navigate = useNavigate()
    const [masterScope, setMasterScope] = useState<'scene' | 'chapter' | 'codex' | 'ai'>('scene')
    const [activeTab, setActiveTab] = useState<'backlinks' | 'beats' | 'revisions'>(initialTab || 'backlinks')

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab)
    }, [initialTab])

    // Backlinks state
    const [referencedEntries, setReferencedEntries] = useState<any[]>([])

    // Scene Beats & Metadata state
    const [summary, setSummary] = useState('')
    const [status, setStatus] = useState<'Idea' | 'Planned' | 'Draft' | 'Revised' | 'Edited' | 'Final'>('Draft')
    const [povCharacterId, setPovCharacterId] = useState('')
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState<string[]>([])
    const [newNote, setNewNote] = useState('')
    const [characters, setCharacters] = useState<any[]>([])

    // Revisions state
    const [revisions, setRevisions] = useState<any[]>([])
    const [selectedRevision, setSelectedRevision] = useState<any>(null)

    // Chapter State
    const [chapterNotes, setChapterNotes] = useState<object>({})
    const [chapterName, setChapterName] = useState('')

    // AI Prompts
    const [prompts, setPrompts] = useState<any[]>([])

    // Load scene metadata & project characters
    useEffect(() => {
        if (!sceneId) return

        let mounted = true
        db.scenes.get(sceneId).then(scene => {
            if (!mounted || !scene) return
            setSummary(scene.summary || '')
            setStatus((scene.status as any) || 'Draft')
            setPovCharacterId(scene.povCharacterId || '')
            setLocation(scene.location || '')
            const rawNotes = scene.notes
            setNotes(Array.isArray(rawNotes) ? rawNotes : (typeof rawNotes === 'string' && rawNotes.length ? [rawNotes] : []))
        })

        if (activeNovelId) {
            db.bibleEntries.where({ novelId: activeNovelId }).toArray().then(entries => {
                if (mounted) setCharacters(entries.filter(e => e.type === 'Character'))
            })
            db.prompts.where({ novelId: activeNovelId }).filter(p => !p.isTrashed).toArray().then(p => {
                if (mounted) setPrompts(p)
            })
        }

        if (activeChapterId) {
            db.chapters.get(activeChapterId).then(ch => {
                if (!mounted || !ch) return
                setChapterName(ch.name)
                setChapterNotes(ch.planningContent || {})
            })
        }

        return () => { mounted = false }
    }, [sceneId, activeChapterId, activeNovelId])

    // Extract backlinks from editor JSON content
    useEffect(() => {
        if (!editorContent || !activeNovelId) return

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
    }, [editorContent, activeNovelId])

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
            location,
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

    const handleSaveChapterNotes = async (json: object) => {
        if (!activeChapterId) return
        setChapterNotes(json)
        await db.chapters.update(activeChapterId, { planningContent: json, updatedAt: Date.now() })
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

                    <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 'var(--radius-sm)', padding: '0.2rem', gap: '0.2rem' }}>
                        <button
                            className="btn"
                            onClick={() => setMasterScope('scene')}
                            style={{
                                fontSize: '0.8rem', padding: '0.2rem 0.5rem', border: 'none',
                                background: masterScope === 'scene' ? 'var(--color-surface)' : 'transparent',
                                color: masterScope === 'scene' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: masterScope === 'scene' ? 600 : 400
                            }}
                        >
                            <FileText size={12} style={{ marginRight: '0.25rem' }} /> Scene
                        </button>
                        <button
                            className="btn"
                            onClick={() => setMasterScope('chapter')}
                            style={{
                                fontSize: '0.8rem', padding: '0.2rem 0.5rem', border: 'none',
                                background: masterScope === 'chapter' ? 'var(--color-surface)' : 'transparent',
                                color: masterScope === 'chapter' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: masterScope === 'chapter' ? 600 : 400
                            }}
                            disabled={!activeChapterId}
                        >
                            <FolderOpen size={12} style={{ marginRight: '0.25rem' }} /> Chapter
                        </button>
                        <button
                            className="btn"
                            onClick={() => setMasterScope('codex')}
                            style={{
                                fontSize: '0.8rem', padding: '0.2rem 0.5rem', border: 'none',
                                background: masterScope === 'codex' ? 'var(--color-surface)' : 'transparent',
                                color: masterScope === 'codex' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: masterScope === 'codex' ? 600 : 400
                            }}
                        >
                            <BookOpen size={12} style={{ marginRight: '0.25rem' }} /> Codex
                        </button>
                        <button
                            className="btn"
                            onClick={() => setMasterScope('ai')}
                            style={{
                                fontSize: '0.8rem', padding: '0.2rem 0.5rem', border: 'none',
                                background: masterScope === 'ai' ? 'var(--color-surface)' : 'transparent',
                                color: masterScope === 'ai' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                fontWeight: masterScope === 'ai' ? 600 : 400
                            }}
                        >
                            <Sparkles size={12} style={{ marginRight: '0.25rem' }} /> AI
                        </button>
                    </div>

                    <button className="btn" onClick={onClose} style={{ padding: '0.2rem 0.4rem' }} aria-label="Close Inspector">
                        <X size={16} />
                    </button>
                </div>

                {masterScope === 'scene' && (
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
                )}
            </div>

            {/* Content Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column' }}>

                {masterScope === 'chapter' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                            Chapter Scratchpad: <strong style={{ color: 'var(--color-text)' }}>{chapterName}</strong>
                        </div>
                        <div style={{ flex: 1, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}>
                            <TipTapEditor
                                content={chapterNotes}
                                onUpdate={handleSaveChapterNotes}
                                focusMode={false}
                            />
                        </div>
                    </div>
                )}

                {/* TAB 1: Referenced Entities (Backlinks) */}
                {masterScope === 'scene' && activeTab === 'backlinks' && (
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
                {masterScope === 'scene' && activeTab === 'beats' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Status Pills */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.35rem' }}>Status</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                {(['Idea', 'Planned', 'Draft', 'Revised', 'Edited', 'Final'] as const).map(s => {
                                    const colors: Record<string, string> = {
                                        Idea: '#6c757d', Planned: '#17a2b8', Draft: '#fd7e14',
                                        Revised: '#ffc107', Edited: '#20c997', Final: '#28a745'
                                    }
                                    const isActive = status === s
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => { setStatus(s); db.scenes.update(sceneId, { status: s, updatedAt: Date.now() }) }}
                                            style={{
                                                padding: '0.25rem 0.6rem', fontSize: '0.75rem', fontWeight: isActive ? 700 : 400,
                                                borderRadius: '999px', border: `1px solid ${colors[s]}`,
                                                background: isActive ? colors[s] : 'transparent',
                                                color: isActive ? '#fff' : colors[s],
                                                cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                        >{s}</button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* POV Character & Location */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>POV Character</label>
                                <select
                                    className="input"
                                    value={povCharacterId}
                                    onChange={e => setPovCharacterId(e.target.value)}
                                    onBlur={handleSaveMetadata}
                                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}
                                >
                                    <option value="">(None)</option>
                                    {characters.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Location</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    onBlur={handleSaveMetadata}
                                    placeholder="Scene location..."
                                    style={{ width: '100%', fontSize: '0.8rem', padding: '0.35rem' }}
                                />
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
                {masterScope === 'scene' && activeTab === 'revisions' && (
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

                {/* TAB 4: Codex / Bible Hook */}
                {masterScope === 'codex' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                        <BookOpen size={48} color="var(--color-text-muted)" style={{ opacity: 0.5 }} />
                        <div>
                            <h4 style={{ margin: '0 0 0.5rem 0' }}>Manuscript Codex</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>
                                View and edit the global character database, locations, and structural items.
                            </p>
                        </div>
                        <button
                            className="btn primary"
                            onClick={() => navigate(`/novel/${activeNovelId}/codex`)}
                            style={{ padding: '0.5rem 1rem', width: '100%', display: 'flex', justifyContent: 'center' }}
                        >
                            Open Global Codex <ArrowRight size={16} style={{ marginLeft: '0.5rem' }} />
                        </button>
                    </div>
                )}

                {/* TAB 5: AI / Prompts Hook */}
                {masterScope === 'ai' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            Saved contextual prompts available for execution:
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {prompts.length === 0 && (
                                <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                                    No custom prompts found for this project.
                                </div>
                            )}
                            {prompts.map(p => (
                                <button
                                    key={p.id}
                                    className="btn"
                                    onClick={() => navigate(`/novel/${activeNovelId}/staging`)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                                        padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
                                        background: 'var(--color-surface)', gap: '0.25rem'
                                    }}
                                >
                                    <strong style={{ fontSize: '0.85rem', color: 'var(--color-text)' }}>{p.name}</strong>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{p.description || 'No description'}</span>
                                </button>
                            ))}
                        </div>

                        <button
                            className="btn primary outline"
                            onClick={() => navigate(`/novel/${activeNovelId}/prompts`)}
                            style={{ marginTop: '1rem', padding: '0.5rem 1rem', width: '100%', display: 'flex', justifyContent: 'center' }}
                        >
                            Manage Saved Prompts <Sparkles size={16} style={{ marginLeft: '0.5rem' }} />
                        </button>
                    </div>
                )}
            </div>
        </aside>
    )
}
