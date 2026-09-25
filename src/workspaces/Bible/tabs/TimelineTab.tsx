import { useState, useMemo } from 'react'
import { BibleService } from '../../../services/BibleService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { Plus, History } from 'lucide-react'

// Simple helper to format NarrativePosition into readable string
const formatPosition = (pos: any) => {
    if (!pos) return 'Unspecified'
    // Format could be refined as we get true scene resolving capability, but for now fallback to ID or simple format.
    const parts = []
    if (pos.seriesId) parts.push(`Book ${pos.seriesId.slice(0, 4)}`)
    if (pos.chapterId) parts.push(`Chapter ${pos.chapterId.slice(0, 4)}`)
    if (pos.sceneId) parts.push(`Scene ${pos.sceneId.slice(0, 4)}`)
    if (parts.length === 0 && pos.sequence) parts.push(`Seq ${pos.sequence}`)
    return parts.length > 0 ? parts.join(' > ') : 'Unknown'
}

export default function TimelineTab({ entryId, fields, onUpdated }: { entryId: string, fields: any[], onUpdated: () => void }) {
    const { activeNovelId } = useWorkspaceStore()

    // Group fields by their core key to show history effectively
    const groupedFields = useMemo(() => {
        const groups: Record<string, any[]> = {}
        fields.forEach(f => {
            if (!groups[f.fieldKey]) groups[f.fieldKey] = []
            groups[f.fieldKey].push(f)
        })
        return groups
    }, [fields])

    const handleUpdate = async (fieldId: string, updates: any) => {
        if (!activeNovelId) return
        await BibleService.updateFieldValue(activeNovelId, fieldId, updates)
        onUpdated()
    }

    const handleAddHistoricalValue = async (fieldKey: string) => {
        if (!activeNovelId) return
        // Create duplicate field key blank value for timeline insertion
        await BibleService.addFieldValue(activeNovelId, entryId, fieldKey, '(New historical value)', 'Drafted')
        onUpdated()
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <History size={18} /> Timeline History
                </h3>
            </div>

            {Object.keys(groupedFields).length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No fields mapped to provide history on.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {Object.entries(groupedFields).map(([key, fVals]) => (
                        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--color-surface-hover)', borderBottom: '1px solid var(--color-border)' }}>
                                <span style={{ fontWeight: 600 }}>{key}</span>
                                <button className="btn outline" onClick={() => handleAddHistoricalValue(key)} style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}>
                                    <Plus size={14} /> Add Alternate
                                </button>
                            </div>

                            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {fVals.sort((a, b) => (a.validFrom?.sequence || 0) - (b.validFrom?.sequence || 0)).map(f => (
                                    <div key={f.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                            <input
                                                type="text"
                                                defaultValue={f.value}
                                                onBlur={(e) => handleUpdate(f.id, { value: e.target.value })}
                                                style={{ width: '100%', padding: '0.4rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                                            />
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', fontSize: '0.85rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <span style={{ color: 'var(--color-text-muted)' }}>Valid:</span>
                                                    <span style={{ background: 'var(--color-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                                                        {formatPosition(f.validFrom)} → {formatPosition(f.validUntil)}
                                                    </span>
                                                </div>
                                                <select
                                                    value={f.state || 'Canon'}
                                                    onChange={e => handleUpdate(f.id, { state: e.target.value })}
                                                    style={{ background: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                                                >
                                                    <option value="Planned">Planned</option>
                                                    <option value="Drafted">Drafted</option>
                                                    <option value="Canon">Canon</option>
                                                    <option value="Retconned">Retconned</option>
                                                    <option value="Discarded">Discarded</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
