import { useState } from 'react'
import { BibleService } from '../../../services/BibleService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { Plus, Trash2 } from 'lucide-react'
import { promptInput, confirmAlert } from '../../../store/dialogStore'
import type { EntityState } from '../../../db/schema'

export default function DetailsTab({ entry, fields, onUpdated }: { entry: any, fields: any[], onUpdated: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [savingFieldId, setSavingFieldId] = useState<string | null>(null)

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

    const handleAddField = async () => {
        if (!activeNovelId) return
        const keyName = await promptInput({
            title: 'Add Field',
            message: 'Enter the new field name:',
            placeholder: 'E.g., Secret Weakness'
        })

        if (keyName && keyName.trim() !== '') {
            try {
                await BibleService.addFieldValue(activeNovelId, entry.id, keyName.trim(), '')
                onUpdated()
            } catch (e: any) {
                await confirmAlert({
                    title: 'Add Field Failed',
                    message: e.message,
                    isDestructive: true
                })
            }
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '800px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Structured Details</h3>
                <button className="btn" onClick={handleAddField}>
                    <Plus size={16} /> Add Field
                </button>
            </div>

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
