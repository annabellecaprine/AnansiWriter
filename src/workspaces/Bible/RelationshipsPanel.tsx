import { useState, useEffect } from 'react'
import { BibleService } from '../../services/BibleService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { db } from '../../db/database'
import { Link2 } from 'lucide-react'

import { confirmAction, promptInput } from '../../store/dialogStore'

// Basic Component to list timeline-aware bi-directional connections
export default function RelationshipsPanel({ entryId }: { entryId: string }) {
    const { activeNovelId } = useWorkspaceStore()
    const [rels, setRels] = useState<any[]>([])
    const [namesMap, setNamesMap] = useState<Record<string, string>>({})
    const [editingRelId, setEditingRelId] = useState<string | null>(null)

    const loadRelationships = async () => {
        if (!activeNovelId) return
        const relationships = await BibleService.getRelationships(activeNovelId, entryId)
        setRels(relationships)

        // Parallel load names
        const allLinkedIds = new Set<string>()
        for (const r of relationships) {
            allLinkedIds.add(r.sourceId)
            allLinkedIds.add(r.targetId)
        }

        if (allLinkedIds.size > 0) {
            const records = await db.bibleEntries.where('id').anyOf([...allLinkedIds]).toArray()
            const map: Record<string, string> = {}
            for (const rec of records) {
                map[rec.id] = rec.name
            }
            setNamesMap(map)
        }
    }

    useEffect(() => {
        loadRelationships()
    }, [activeNovelId, entryId])

    const handleAddRelationship = async () => {
        if (!activeNovelId) return
        const targetIdPrompt = await promptInput({
            title: 'Add Relationship',
            message: 'Enter Target Entity ID (UUID):',
            placeholder: 'Target Entity UUID'
        })
        if (!targetIdPrompt) return

        const relType = await promptInput({
            title: 'Relationship Type',
            message: 'Enter relationship type (e.g. "Sibling", "Rival", "Ally"):',
            placeholder: 'Type / Role'
        })

        if (targetIdPrompt && relType) {
            await BibleService.createRelationship(activeNovelId, entryId, targetIdPrompt, relType)
            loadRelationships()
        }
    }

    const handleUpdateRel = async (relId: string, updates: any) => {
        await db.relationships.update(relId, updates)
        loadRelationships()
        setEditingRelId(null)
    }

    const handleDeleteRel = async (relId: string) => {
        const confirmed = await confirmAction({
            title: 'Delete Relationship',
            message: 'Are you sure you want to remove this relationship connection?',
            isDestructive: true,
            confirmLabel: 'Delete'
        })
        if (confirmed) {
            await db.relationships.delete(relId)
            loadRelationships()
        }
    }

    return (
        <div className="spike-section">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Link2 size={18} />
                Relationships
            </h3>

            {rels.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)' }}>No relationships found for this entry.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {rels.map(r => {
                        const isSource = r.sourceId === entryId
                        const relatedEntityId = isSource ? r.targetId : r.sourceId
                        const relatedName = namesMap[relatedEntityId] || 'Unknown Entity'

                        if (editingRelId === r.id) {
                            return (
                                <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 500 }}>{relatedName}</span>
                                        <select defaultValue={r.state} onChange={(e) => handleUpdateRel(r.id, { state: e.target.value })} style={{ padding: '0.25rem', borderRadius: '4px' }}>
                                            <option value="Canon">Canon</option>
                                            <option value="Theory">Theory</option>
                                            <option value="Obsolete">Obsolete</option>
                                        </select>
                                    </div>
                                    <input type="text" defaultValue={r.type} placeholder="Role/Type (e.g. Sibling)" onBlur={(e) => handleUpdateRel(r.id, { type: e.target.value })} />
                                    <input type="text" defaultValue={r.notes} placeholder="Notes..." onBlur={(e) => handleUpdateRel(r.id, { notes: e.target.value })} />
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                        <input type="checkbox" defaultChecked={r.isBidirectional} onChange={(e) => handleUpdateRel(r.id, { isBidirectional: e.target.checked })} />
                                        Is Bidirectional
                                    </label>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                        <button className="btn" onClick={() => setEditingRelId(null)}>Done</button>
                                        <button className="btn" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteRel(r.id)}>Delete</button>
                                    </div>
                                </div>
                            )
                        }

                        return (
                            <div key={r.id} onDoubleClick={() => setEditingRelId(r.id)} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} title="Double-click to edit">
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>
                                        <span style={{ color: 'var(--color-text-muted)', marginRight: '0.5rem' }}>{r.isBidirectional ? '<->' : (isSource ? '->' : '<-')}</span>
                                        <span style={{ fontWeight: 500 }}>{relatedName}</span>
                                    </span>
                                    {r.notes && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{r.notes}</span>}
                                </div>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <span style={{ fontStyle: 'italic', color: 'var(--color-accent)' }}>{r.type}</span>
                                    <span className="status-badge" style={{ background: 'var(--color-surface)' }}>{r.state}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <button className="btn" style={{ marginTop: '1.5rem' }} onClick={handleAddRelationship}>+ Add Relationship</button>
        </div>
    )
}
