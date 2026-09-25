import { useState } from 'react'
import { BibleService } from '../../../services/BibleService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { Plus, Trash2 } from 'lucide-react'
import { promptInput } from '../../../store/dialogStore'

export default function DetailsTab({ entry, fields, onUpdated }: { entry: any, fields: any[], onUpdated: () => void }) {
    const { activeNovelId } = useWorkspaceStore()

    const handleUpdateField = async (fieldId: string, value: string) => {
        if (!activeNovelId) return
        await BibleService.updateFieldValue(activeNovelId, fieldId, { value })
        onUpdated()
    }

    const handleDeleteField = async (fieldId: string) => {
        if (!activeNovelId) return
        await BibleService.deleteFieldValue(activeNovelId, fieldId)
        onUpdated()
    }

    const handleAddField = async () => {
        if (!activeNovelId) return
        const keyName = await promptInput({
            title: 'Add Field',
            message: 'Enter the new field name:',
            placeholder: 'E.g., Secret Weakness'
        })

        if (keyName && keyName.trim() !== '') {
            await BibleService.addFieldValue(activeNovelId, entry.id, keyName.trim(), '')
            onUpdated()
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
                                {f.fieldKey}
                                <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                                    <span className="status-badge" style={{ fontSize: '0.7rem' }}>{f.state || 'Canon'}</span>
                                </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
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
