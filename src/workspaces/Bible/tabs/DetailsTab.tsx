import { useState, useEffect, useMemo } from 'react'
import { BibleService } from '../../../services/BibleService'
import { CodexConfigService, type CodexCategoryDefinition } from '../../../services/CodexConfigService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { Plus, Trash2, Sparkles, X, Check } from 'lucide-react'
import { confirmAlert } from '../../../store/dialogStore'
import type { EntityState } from '../../../db/schema'

export default function DetailsTab({ entry, fields, onUpdated }: { entry: any, fields: any[], onUpdated: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [savingFieldId, setSavingFieldId] = useState<string | null>(null)
    const [categoryDef, setCategoryDef] = useState<CodexCategoryDefinition | null>(null)
    const [knownKeys, setKnownKeys] = useState<string[]>([])
    const [isAddingMissing, setIsAddingMissing] = useState(false)

    // Inline Add Field state
    const [isAddingField, setIsAddingField] = useState(false)
    const [newFieldName, setNewFieldName] = useState('')

    useEffect(() => {
        if (entry?.type) {
            CodexConfigService.getCategoryByName(entry.type).then(cat => setCategoryDef(cat || null))
        }
        if (activeNovelId) {
            CodexConfigService.getKnownFieldKeys(activeNovelId).then(setKnownKeys)
        }
    }, [entry?.type, activeNovelId])

    // Calculate missing starter fields
    const missingStarterFields = useMemo(() => {
        const starter = categoryDef?.defaultFields || []
        const existingKeys = new Set(fields.map(f => f.fieldKey.toLowerCase()))
        return starter.filter(s => !existingKeys.has(s.toLowerCase()))
    }, [categoryDef, fields])

    const handleUpdateField = async (fieldId: string, value: string) => {
        if (!activeNovelId) return
        setSavingFieldId(fieldId)
        try {
            await BibleService.updateFieldValue(activeNovelId, fieldId, { value })
            onUpdated()
        } catch (e: any) {
            await confirmAlert({
                title: 'Save Failed',
                message: `Failed to update field: ${e.message}`,
                isDestructive: true
            })
        } finally {
            setSavingFieldId(null)
        }
    }

    const handleUpdateState = async (fieldId: string, state: EntityState) => {
        if (!activeNovelId) return
        try {
            await BibleService.updateFieldValue(activeNovelId, fieldId, { state })
            onUpdated()
        } catch (e: any) {
            await confirmAlert({
                title: 'State Update Failed',
                message: `Failed to change state: ${e.message}`,
                isDestructive: true
            })
        }
    }

    const handleDeleteField = async (fieldId: string) => {
        if (!activeNovelId) return
        try {
            await BibleService.deleteFieldValue(activeNovelId, fieldId)
            onUpdated()
        } catch (e: any) {
            await confirmAlert({
                title: 'Delete Failed',
                message: `Failed to remove field: ${e.message}`,
                isDestructive: true
            })
        }
    }

    const handleAddAllMissing = async () => {
        if (!activeNovelId || missingStarterFields.length === 0) return
        setIsAddingMissing(true)
        try {
            for (const fieldKey of missingStarterFields) {
                await BibleService.addFieldValue(activeNovelId, entry.id, fieldKey, '')
            }
            onUpdated()
        } catch (e: any) {
            await confirmAlert({
                title: 'Backfill Failed',
                message: e.message,
                isDestructive: true
            })
        } finally {
            setIsAddingMissing(false)
        }
    }

    const handleAddSpecificField = async (fieldName: string) => {
        if (!activeNovelId || !fieldName.trim()) return
        try {
            await BibleService.addFieldValue(activeNovelId, entry.id, fieldName.trim(), '')
            setNewFieldName('')
            setIsAddingField(false)
            onUpdated()
        } catch (e: any) {
            await confirmAlert({
                title: 'Add Field Failed',
                message: e.message,
                isDestructive: true
            })
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Structured Details</h3>
                <button
                    className={`btn ${isAddingField ? 'outline' : 'primary'}`}
                    onClick={() => {
                        setIsAddingField(!isAddingField)
                        setNewFieldName('')
                    }}
                    style={{ fontSize: '0.85rem' }}
                >
                    <Plus size={15} /> {isAddingField ? 'Cancel' : 'Add Field'}
                </button>
            </div>

            {/* Datalist for autocomplete suggestions */}
            <datalist id="known-field-keys">
                {knownKeys.map(k => (
                    <option key={k} value={k} />
                ))}
            </datalist>

            {/* Missing Starter Fields Backfill Banner */}
            {missingStarterFields.length > 0 && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(139, 92, 246, 0.08)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.75rem'
                }}>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-accent)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Sparkles size={14} />
                            {missingStarterFields.length} starter field{missingStarterFields.length > 1 ? 's' : ''} available for {entry.type}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                            {missingStarterFields.map(f => (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => handleAddSpecificField(f)}
                                    title={`Click to add ${f}`}
                                    style={{
                                        background: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: '3px',
                                        padding: '0.1rem 0.4rem',
                                        fontSize: '0.75rem',
                                        color: 'var(--color-text)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    + {f}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        className="btn outline"
                        onClick={handleAddAllMissing}
                        disabled={isAddingMissing}
                        style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                    >
                        {isAddingMissing ? 'Adding...' : '+ Add All Missing'}
                    </button>
                </div>
            )}

            {/* Inline Add Field Form */}
            {isAddingField && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent)' }}>
                    <input
                        list="known-field-keys"
                        type="text"
                        value={newFieldName}
                        onChange={e => setNewFieldName(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddSpecificField(newFieldName)
                            }
                        }}
                        placeholder="Type field name or choose from suggestions..."
                        style={{ flex: 1, padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                        autoFocus
                    />
                    <button
                        className="btn primary"
                        onClick={() => handleAddSpecificField(newFieldName)}
                        disabled={!newFieldName.trim()}
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                    >
                        Add
                    </button>
                    <button
                        className="btn outline"
                        onClick={() => {
                            setIsAddingField(false)
                            setNewFieldName('')
                        }}
                        style={{ fontSize: '0.85rem', padding: '0.45rem 0.75rem' }}
                    >
                        Cancel
                    </button>
                </div>
            )}

            {fields.length === 0 ? (
                <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No fields configured.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {fields.map(f => (
                        <div key={f.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <div style={{ width: '200px', flexShrink: 0, fontWeight: 600 }}>
                                <div>{f.fieldKey}</div>
                                <div style={{ marginTop: '0.4rem' }}>
                                    <select
                                        value={f.state || 'Canon'}
                                        onChange={(e) => handleUpdateState(f.id, e.target.value as EntityState)}
                                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', borderRadius: '4px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                                    >
                                        <option value="Canon">Canon</option>
                                        <option value="Drafted">Drafted</option>
                                        <option value="Planned">Planned</option>
                                        <option value="Retconned">Retconned</option>
                                        <option value="Discarded">Discarded</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                                <textarea
                                    defaultValue={f.value}
                                    onBlur={(e) => handleUpdateField(f.id, e.target.value)}
                                    placeholder="Value..."
                                    rows={2}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', resize: 'vertical' }}
                                />
                                <button className="icon-btn" style={{ color: 'var(--color-error)' }} onClick={() => handleDeleteField(f.id)} title="Remove Field">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
