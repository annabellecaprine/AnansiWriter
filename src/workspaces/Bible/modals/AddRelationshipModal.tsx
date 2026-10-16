import { useState, useEffect, useMemo } from 'react'
import { Dialog } from '../../../components/shared/Dialog'
import { BibleService } from '../../../services/BibleService'
import { CodexConfigService, type RelationshipTypeDefinition } from '../../../services/CodexConfigService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { db } from '../../../db/database'
import type { BibleEntry } from '../../../db/schema'

const NEW_REL_OPTION = '__NEW_REL_TYPE__'

export function AddRelationshipModal({ isOpen, onClose, sourceId, onAdded }: { isOpen: boolean, onClose: () => void, sourceId: string, onAdded: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [entries, setEntries] = useState<BibleEntry[]>([])
    const [targetId, setTargetId] = useState('')

    // Master relationship types
    const [relTypes, setRelTypes] = useState<RelationshipTypeDefinition[]>([])

    // Form fields
    const [selectedType, setSelectedType] = useState('Friend Of')
    const [direction, setDirection] = useState<'outbound' | 'inbound' | 'bidirectional'>('outbound')
    const [notes, setNotes] = useState('')

    // On-the-fly creation state
    const [isCreatingType, setIsCreatingType] = useState(false)
    const [customRelName, setCustomRelName] = useState('')
    const [customReverseName, setCustomReverseName] = useState('')
    const [saveToSettings, setSaveToSettings] = useState(true)

    const loadTypes = async () => {
        const types = await CodexConfigService.getRelationshipTypes()
        setRelTypes(types)
        if (types.length > 0 && (!selectedType || selectedType === NEW_REL_OPTION)) {
            setSelectedType(types[0].name)
            setDirection(types[0].defaultDirection || 'outbound')
        }
    }

    useEffect(() => {
        if (isOpen && activeNovelId) {
            BibleService.listActiveEntries(activeNovelId).then(data => {
                setEntries(data.filter(e => e.id !== sourceId))
            })
            loadTypes()
            setSearchQuery('')
            setTargetId('')
            setIsCreatingType(false)
            setCustomRelName('')
            setCustomReverseName('')
            setSaveToSettings(true)
            setNotes('')
        }
    }, [isOpen, activeNovelId, sourceId])

    const handleTypeSelect = (val: string) => {
        if (val === NEW_REL_OPTION) {
            setIsCreatingType(true)
            setSelectedType(NEW_REL_OPTION)
        } else {
            setIsCreatingType(false)
            setSelectedType(val)
            const found = relTypes.find(r => r.name === val)
            if (found?.defaultDirection) {
                setDirection(found.defaultDirection)
            }
        }
    }

    const filteredTargets = useMemo(() => {
        if (!searchQuery) return entries
        const q = searchQuery.toLowerCase()
        return entries.filter(e => e.name.toLowerCase().includes(q) || e.aliases?.some(a => a.toLowerCase().includes(q)) || e.tags?.some(t => t.toLowerCase().includes(q)))
    }, [entries, searchQuery])

    const handleAdd = async () => {
        if (!activeNovelId || !targetId) return

        let finalType = selectedType

        if (isCreatingType) {
            const trimmed = customRelName.trim()
            if (!trimmed) return
            finalType = trimmed

            if (saveToSettings) {
                const existing = relTypes.find(r => r.name.toLowerCase() === trimmed.toLowerCase())
                if (!existing) {
                    await CodexConfigService.addRelationshipType({
                        name: trimmed,
                        reverseName: customReverseName.trim() || undefined,
                        defaultDirection: direction,
                        color: '#3b82f6'
                    })
                }
            }
        }

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
            type: finalType,
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

    const activeRelDef = relTypes.find(r => r.name === selectedType)

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Add Codex Relationship" width="600px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                {/* Target Entry Search */}
                <label>
                    <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Search Target Entry *</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search Name, Alias, Type..."
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                    />
                </label>

                {/* Target Entry List */}
                <div style={{ height: '140px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg)' }}>
                    {filteredTargets.length === 0 ? (
                        <div style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>No matching entries found.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            {filteredTargets.map(t => (
                                <button
                                    key={t.id}
                                    type="button"
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

                {/* Relationship Type & Direction */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <label>
                        <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Relationship Type *</span>
                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {activeRelDef && !isCreatingType && (
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: activeRelDef.color || '#3b82f6', flexShrink: 0 }} />
                            )}
                            <select
                                value={selectedType}
                                onChange={e => handleTypeSelect(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            >
                                {relTypes.map(rt => (
                                    <option key={rt.id} value={rt.name}>{rt.name}</option>
                                ))}
                                <option disabled>──────────</option>
                                <option value={NEW_REL_OPTION}>+ New Relationship Type...</option>
                            </select>
                        </div>
                    </label>

                    <label>
                        <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Direction</span>
                        <select
                            value={direction}
                            onChange={e => setDirection(e.target.value as any)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                        >
                            <option value="outbound">Outbound (Source → Target)</option>
                            <option value="bidirectional">Bidirectional (Source ↔ Target)</option>
                            <option value="inbound">Inbound (Target → Source)</option>
                        </select>
                    </label>
                </div>

                {/* On-The-Fly Custom Relationship Creator */}
                {isCreatingType && (
                    <div style={{ padding: '0.85rem', background: 'var(--color-surface)', border: '1px solid var(--color-accent)', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                                Define New Relationship Type
                            </span>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => handleTypeSelect(relTypes[0]?.name || 'Friend Of')}
                                style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                            >
                                Cancel
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                                    Outbound Label (e.g. Possesses a..., Wields) *
                                </label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="E.g., Possesses a..."
                                    value={customRelName}
                                    onChange={e => setCustomRelName(e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                                    Inbound / Reverse (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="E.g., Possessed by..."
                                    value={customReverseName}
                                    onChange={e => setCustomReverseName(e.target.value)}
                                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                                />
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={saveToSettings}
                                onChange={e => setSaveToSettings(e.target.checked)}
                            />
                            Save to Master Settings for future associations
                        </label>
                    </div>
                )}

                {/* Notes */}
                <label>
                    <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Notes (Optional)</span>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        placeholder="Context or details regarding this relationship..."
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                    />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn outline" onClick={onClose}>Cancel</button>
                    <button
                        className="btn primary"
                        disabled={!targetId || (isCreatingType && !customRelName.trim())}
                        onClick={handleAdd}
                    >
                        Add Relationship
                    </button>
                </div>
            </div>
        </Dialog>
    )
}
