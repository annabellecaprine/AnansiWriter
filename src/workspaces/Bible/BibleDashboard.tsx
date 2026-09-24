import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Plus, Search, User, Map, Compass } from 'lucide-react'
import { db } from '../../db/database'
import { BibleService } from '../../services/BibleService'
import BibleEntryEditor from './BibleEntryEditor'
import { OccurrenceReviewQueue } from './OccurrenceReviewQueue'

export default function BibleDashboard() {
    const { activeProjectId } = useWorkspaceStore()
    const [entries, setEntries] = useState<any[]>([])
    const [activeEntryId, setActiveEntryId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const loadEntries = () => {
        if (activeProjectId) {
            db.bibleEntries.where({ projectId: activeProjectId }).toArray().then(setEntries)
        }
    }

    useEffect(() => {
        loadEntries()
    }, [activeProjectId])

    if (!activeProjectId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>
                    Please open or create a project to access the Bible.
                </p>
            </div>
        )
    }

    if (activeEntryId) {
        return <BibleEntryEditor entryId={activeEntryId} onBack={() => { setActiveEntryId(null); loadEntries(); }} />
    }

    const handleCreate = async (type: string) => {
        const name = window.prompt(`Enter a name for the new ${type}:`)
        if (!name) return
        const newId = await BibleService.createEntryUsingTemplate(activeProjectId, name, type)
        setActiveEntryId(newId)
    }

    return (
        <div className="workspace-view">
            <header className="workspace-header">
                <h1>Bible Codex</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Search entries, tags, aliases..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: '2rem', width: '250px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" onClick={() => {
                            if (!activeProjectId) return
                            const worker = new Worker(new URL('../../workers/indexer.worker.ts', import.meta.url), { type: 'module' })
                            worker.postMessage({ action: 'INDEX_PROJECT', projectId: activeProjectId })
                            worker.onmessage = (e) => {
                                if (e.data.status === 'DONE') {
                                    alert(`Indexing complete! Mapped ${e.data.count} entity occurrences across the text.`)
                                    worker.terminate()
                                } else if (e.data.status === 'ERROR') {
                                    alert(`Indexer failed: ${e.data.error}`)
                                    worker.terminate()
                                }
                            }
                        }} style={{ background: 'var(--color-surface-hover)' }}>
                            Run Indexer
                        </button>
                        <button className="btn" onClick={() => handleCreate('Lore')}>
                            <Plus size={18} />
                            New Entry
                        </button>
                    </div>
                </div>
            </header>

            <div className="project-grid">
                <div className="project-card create-new" onClick={() => handleCreate('Character')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <User size={20} color="var(--color-accent)" />
                        <h3>Create Character</h3>
                    </div>
                </div>

                <div className="project-card create-new" onClick={() => handleCreate('Location')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <Map size={20} color="var(--color-accent)" />
                        <h3>Create Location</h3>
                    </div>
                </div>

                <div className="project-card create-new" onClick={() => handleCreate('Lore')} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                        <Compass size={20} color="var(--color-accent)" />
                        <h3>Create Lore/Concept</h3>
                    </div>
                </div>
            </div>

            <OccurrenceReviewQueue />

            <div style={{ marginTop: '2rem' }}>
                <h2 style={{ marginBottom: '1rem', color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>Recent Entries</h2>
                {entries.length === 0 && <p style={{ color: 'var(--color-text-muted)' }}>No entries constructed in this project yet.</p>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {entries
                        .filter(e => {
                            if (!searchQuery) return true
                            const q = searchQuery.toLowerCase()
                            return e.name.toLowerCase().includes(q)
                                || e.aliases?.some((a: string) => a.toLowerCase().includes(q))
                                || e.tags?.some((t: string) => t.toLowerCase().includes(q))
                        })
                        .map(e => (
                            <div
                                key={e.id}
                                onClick={() => setActiveEntryId(e.id)}
                                style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                            >
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 500 }}>{e.name}</span>
                                    {e.tags?.length > 0 && (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {e.tags.map((t: string) => <span key={t} className="status-badge" style={{ background: 'var(--color-surface-hover)' }}>{t}</span>)}
                                        </div>
                                    )}
                                </div>
                                <span style={{ color: 'var(--color-text-muted)' }}>{e.type}</span>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    )
}
