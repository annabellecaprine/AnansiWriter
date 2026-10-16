import { useState, useEffect } from 'react'
import { BibleService } from '../../../services/BibleService'
import { CodexConfigService, type RelationshipTypeDefinition } from '../../../services/CodexConfigService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { Plus, Link, ArrowRight, ArrowLeft, ArrowLeftRight } from 'lucide-react'
import { AddRelationshipModal } from '../modals/AddRelationshipModal'
import { db } from '../../../db/database'
import type { Relationship } from '../../../db/schema'

export default function RelationshipsTab({ entryId }: { entryId: string }) {
    const { activeNovelId } = useWorkspaceStore()
    const [relationships, setRelationships] = useState<Relationship[]>([])
    const [targets, setTargets] = useState<Record<string, string>>({})
    const [relTypes, setRelTypes] = useState<RelationshipTypeDefinition[]>([])
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)

    const loadRelationships = async () => {
        if (!activeNovelId) return
        const [rels, types] = await Promise.all([
            BibleService.getRelationships(activeNovelId, entryId),
            CodexConfigService.getRelationshipTypes()
        ])

        setRelationships(rels)
        setRelTypes(types)

        const targetIds = Array.from(new Set(rels.map(r => r.sourceId === entryId ? r.targetId : r.sourceId)))

        // Fetch target names
        const fetchedTargets = await db.bibleEntries.where('id').anyOf(targetIds).toArray()
        const targetMap: Record<string, string> = {}
        fetchedTargets.forEach(t => targetMap[t.id] = t.name)
        setTargets(targetMap)
    }

    useEffect(() => {
        loadRelationships()
    }, [activeNovelId, entryId])

    const handleDelete = async (id: string) => {
        if (!activeNovelId) return
        await db.relationships.where({ id, novelId: activeNovelId }).delete()
        loadRelationships()
    }

    const relMap = new Map<string, RelationshipTypeDefinition>(
        relTypes.map(t => [t.name.toLowerCase(), t])
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Link size={18} /> Established Relationships & Cross-References
                </h3>
                <button className="btn" onClick={() => setIsAddModalOpen(true)}>
                    <Plus size={16} /> Add Relationship
                </button>
            </div>

            {relationships.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No relationships mapped yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {relationships.map(r => {
                        const isSource = r.sourceId === entryId
                        const targetId = isSource ? r.targetId : r.sourceId
                        const targetName = targets[targetId] || 'Unknown Entry'

                        const relDef = relMap.get(r.type.toLowerCase())

                        let displayType = r.type
                        let directionLabel = 'Bidirectional'
                        let DirectionIcon = ArrowLeftRight

                        if (!r.isBidirectional) {
                            directionLabel = isSource ? 'Outbound' : 'Inbound'
                            DirectionIcon = isSource ? ArrowRight : ArrowLeft
                            if (!isSource && relDef?.reverseName) {
                                displayType = relDef.reverseName
                            }
                        }

                        const badgeColor = relDef?.color || 'var(--color-accent)'

                        return (
                            <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', borderLeft: `3px solid ${badgeColor}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{targetName}</span>
                                            <span
                                                className="status-badge"
                                                style={{
                                                    background: `${badgeColor}20`,
                                                    color: badgeColor,
                                                    border: `1px solid ${badgeColor}40`,
                                                    fontSize: '0.8rem',
                                                    padding: '0.15rem 0.5rem'
                                                }}
                                            >
                                                {displayType}
                                            </span>
                                        </div>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                                            <DirectionIcon size={14} /> {directionLabel}
                                        </span>
                                    </div>
                                    <button className="btn outline" style={{ color: 'var(--color-error)' }} onClick={() => handleDelete(r.id)}>Remove</button>
                                </div>

                                {r.notes && (
                                    <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: 'var(--color-bg)', borderRadius: '4px', fontSize: '0.9rem', color: 'var(--color-text)' }}>
                                        {r.notes}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <AddRelationshipModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                sourceId={entryId}
                onAdded={() => { setIsAddModalOpen(false); loadRelationships(); }}
            />
        </div>
    )
}
