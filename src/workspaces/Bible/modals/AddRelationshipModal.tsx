import { useState, useEffect, useMemo } from 'react'
import { Dialog } from '../../../components/shared/Dialog'
import { BibleService } from '../../../services/BibleService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { db } from '../../../db/database'
import type { BibleEntry } from '../../../db/schema'

export function AddRelationshipModal({ isOpen, onClose, sourceId, onAdded }: { isOpen: boolean, onClose: () => void, sourceId: string, onAdded: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [entries, setEntries] = useState<BibleEntry[]>([])
    const [targetId, setTargetId] = useState('')

    // Form fields
    const [type, setType] = useState('Friend Of')
    const [direction, setDirection] = useState<'outbound' | 'inbound' | 'bidirectional'>('outbound')
    const [notes, setNotes] = useState('')

    useEffect(() => {
        if (isOpen && activeNovelId) {
            BibleService.listActiveEntries(activeNovelId).then(data => {
                setEntries(data.filter(e => e.id !== sourceId)) // can't relate to self directly through this UI normally
            })
            // Reset form
            setSearchQuery('')
            setTargetId('')
            setType('Friend Of')
            setDirection('outbound')
            setNotes('')
        }
    }, [isOpen, activeNovelId, sourceId])

    const filteredTargets = useMemo(() => {
        if (!searchQuery) return entries
        const q = searchQuery.toLowerCase()
        return entries.filter(e => e.name.toLowerCase().includes(q) || e.aliases?.some(a => a.toLowerCase().includes(q)) || e.tags?.some(t => t.toLowerCase().includes(q)))
    }, [entries, searchQuery])

    const handleAdd = async () => {
        if (!activeNovelId || !targetId) return

        let actualSource = sourceId
        let actualTarget = targetId
        let isBidirectional = direction === 'bidirectional'

        if (direction === 'inbound') {
            actualSource = targetId
            actualTarget = sourceId
        }

        const id = crypto.randomUUID()
        await db.relationships.add({
            id,
            novelId: activeNovelId,
            sourceId: actualSource,
            targetId: actualTarget,
            type,
            isBidirectional,
            notes,
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        })

        onAdded()
    }

    const relationshipTypes = [
        'Friend Of', 'Sibling Of', 'Parent Of', 'Works For', 'Member Of', 'Lives In',
        'Owns', 'Located In', 'Allied With', 'Rival Of', 'Custom'
    ]

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Add Relationship" width="600px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                <label>
                    <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Search Target Entry</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search Name, Alias, Type..."
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                    />
                </label>

                <div style={{ height: '150px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg)' }}>
                    {filteredTargets.length === 0 ? (
                        <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>No targets found.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {filteredTargets.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setTargetId(t.id)}
                                    style={{
                                        width: '100%',
                                        textAlign: 'left',
                                        padding: '0.5rem 1rem',
                                        border: 'none',
                                        borderBottom: '1px solid var(--color-border)',
                                        background: targetId === t.id ? 'var(--color-surface-hover)' : 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        color: 'var(--color-text)'
                                    }}
                                >
                                    <span style={{ fontWeight: targetId === t.id ? 600 : 400 }}>{t.name}</span>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{t.type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label>
                        <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Relationship Type</span>
                        <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
                            {relationshipTypes.map(rt => <option key={rt} value={rt}>{rt}</option>)}
                        </select>
                    </label>

                    <label>
                        <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Direction</span>
                        <select value={direction} onChange={e => setDirection(e.target.value as any)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
                            <option value="outbound">Outbound (Source → Target)</option>
                            <option value="inbound">Inbound (Target → Source)</option>
                            <option value="bidirectional">Bidirectional (Source ↔ Target)</option>
                        </select>
                    </label>
                </div>

                <label>
                    <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Notes</span>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                    />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn outline" onClick={onClose}>Cancel</button>
                    <button className="btn primary" disabled={!targetId} onClick={handleAdd}>Add Relationship</button>
                </div>
            </div>
        </Dialog>
    )
}
