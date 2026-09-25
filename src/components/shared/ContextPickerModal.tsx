import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { X, CheckSquare, Square, Info, Search } from 'lucide-react'
import { ContextEngine } from '../../services/ai/ContextEngine'

interface ContextItem {
    id: string
    type: string
    name: string
    sizeEstimate?: number // Estimated token or char count
}

interface Props {
    novelId: string
    onClose: () => void
    onContextSelected: (refs: { type: string, id: string, name: string }[]) => void
    initialSelection?: { type: string, id: string, name: string }[]
}

export default function ContextPickerModal({ novelId, onClose, onContextSelected, initialSelection = [] }: Props) {
    const [activeTab, setActiveTab] = useState<'manuscript' | 'planning' | 'codex'>('manuscript')
    const [searchQuery, setSearchQuery] = useState('')

    // Selection state
    const [selected, setSelected] = useState<Map<string, ContextItem>>(new Map(
        initialSelection.map(s => [s.id, s])
    ))

    // Lists
    const [scenes, setScenes] = useState<any[]>([])
    const [codex, setCodex] = useState<any[]>([])

    const [tokenEstimate, setTokenEstimate] = useState(0)

    useEffect(() => {
        let mounted = true
        Promise.all([
            db.scenes.where({ novelId }).and(s => !s.isTrashed).toArray(),
            db.bibleEntries.where({ novelId }).and(b => !b.isTrashed).toArray()
        ]).then(([sList, bList]) => {
            if (mounted) {
                setScenes(sList.sort((a, b) => a.sortOrder - b.sortOrder))
                setCodex(bList)
            }
        })
        return () => { mounted = false }
    }, [novelId])

    // Super naive token estimator (just counting selected instances)
    useEffect(() => {
        // Assume rough average string length -> token mapping as an immediate visual indicator
        // 1 token = ~4 characters
        let lengthEstimate = 0
        for (const item of Array.from(selected.values())) {
            if (item.type === 'Scene') {
                const s = scenes.find(x => x.id === item.id)
                lengthEstimate += (s?.wordCount || 500) * 5
            } else if (item.type.startsWith('Codex_')) {
                const c = codex.find(x => x.id === item.id)
                lengthEstimate += (c?.description?.length || 500)
            }
        }
        setTokenEstimate(Math.floor(lengthEstimate / 4))
    }, [selected, scenes, codex])

    const toggleSelection = (item: ContextItem) => {
        const next = new Map(selected)
        if (next.has(item.id)) {
            next.delete(item.id)
        } else {
            next.set(item.id, item)
        }
        setSelected(next)
    }

    const handleConfirm = () => {
        const payload = Array.from(selected.values()).map(x => ({
            type: x.type,
            id: x.id,
            name: x.name
        }))
        onContextSelected(payload)
        onClose()
    }

    const filteredScenes = scenes.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
    const filteredCodex = codex.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))

    const renderCheckbox = (itemId: string) => {
        const isChecked = selected.has(itemId)
        return isChecked ? <CheckSquare size={16} color="var(--color-primary)" /> : <Square size={16} color="var(--color-text-muted)" />
    }

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                background: 'var(--color-surface)',
                width: '600px', height: '70vh', maxHeight: '700px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Select Context</h2>
                    <button className="btn outline" onClick={onClose} style={{ padding: '0.4rem' }}><X size={16} /></button>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
                    <button
                        className={`btn ${activeTab === 'manuscript' ? 'active' : ''}`}
                        onClick={() => setActiveTab('manuscript')}
                        style={{ flex: 1, borderRadius: 0, border: 'none', background: activeTab === 'manuscript' ? 'var(--color-bg)' : 'transparent' }}
                    >Manuscript</button>
                    <button
                        className={`btn ${activeTab === 'planning' ? 'active' : ''}`}
                        onClick={() => setActiveTab('planning')}
                        style={{ flex: 1, borderRadius: 0, border: 'none', background: activeTab === 'planning' ? 'var(--color-bg)' : 'transparent' }}
                    >Planning</button>
                    <button
                        className={`btn ${activeTab === 'codex' ? 'active' : ''}`}
                        onClick={() => setActiveTab('codex')}
                        style={{ flex: 1, borderRadius: 0, border: 'none', background: activeTab === 'codex' ? 'var(--color-bg)' : 'transparent' }}
                    >Codex</button>
                </div>

                <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <Search size={16} color="var(--color-text-muted)" />
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: '0.9rem', color: 'var(--color-text)' }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'var(--color-bg)' }}>
                    {activeTab === 'manuscript' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filteredScenes.map(s => (
                                <div
                                    key={s.id}
                                    onClick={() => toggleSelection({ id: s.id, type: 'Scene', name: s.name })}
                                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--color-border)' }}
                                >
                                    {renderCheckbox(s.id)}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.wordCount} words</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'codex' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {filteredCodex.map(c => (
                                <div
                                    key={c.id}
                                    onClick={() => toggleSelection({ id: c.id, type: `Codex_${c.type}`, name: c.name })}
                                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px solid var(--color-border)' }}
                                >
                                    {renderCheckbox(c.id)}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.type}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'planning' && (
                        <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                            Planning blocks context mapping coming soon.
                        </div>
                    )}
                </div>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-surface)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Info size={14} /> Estimated Load: {tokenEstimate.toLocaleString()} tokens
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button className="btn outline" onClick={onClose}>Cancel</button>
                        <button className="btn primary" onClick={handleConfirm}>Attach {selected.size} Items</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
