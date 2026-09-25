import React, { useState } from 'react'
import { Dialog } from '../../../components/shared/Dialog'
import { BibleService, BUILT_IN_TEMPLATES } from '../../../services/BibleService'
import { useWorkspaceStore } from '../../../store/workspaceStore'

export function NewEntryModal({ isOpen, onClose, onEntryCreated }: { isOpen: boolean, onClose: () => void, onEntryCreated: (id: string) => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [name, setName] = useState('')
    const [type, setType] = useState('Character')
    const [description, setDescription] = useState('')
    const [tagsInput, setTagsInput] = useState('')

    const allTypes = [...Object.keys(BUILT_IN_TEMPLATES), 'Research Note', 'External Reference', 'Story Guide', 'Creature', 'Culture', 'Event', 'Ability / Magic', 'Technology', 'Lore / Concept', 'Location', 'Item', 'Custom']
    const uniqueTypes = Array.from(new Set(allTypes))

    const handleCreate = async () => {
        if (!activeNovelId || !name.trim()) return

        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
        const entryId = await BibleService.createEntryUsingTemplate(activeNovelId, name.trim(), type)
        await BibleService.updateEntry(activeNovelId, entryId, { tags, description: description.trim() })

        onEntryCreated(entryId)

        // Reset form
        setName('')
        setDescription('')
        setTagsInput('')
        setType('Character')
    }

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Create New Entry" width="500px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Template / Type *</span>
                    <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>

                <label>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Name *</span>
                    <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="E.g., Bob" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
                </label>

                <label>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Description (Optional)</span>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief summary..." rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
                </label>

                <label>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Initial Tags (Optional)</span>
                    <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Comma-separated tags" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }} />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn outline" onClick={onClose}>Cancel</button>
                    <button className="btn primary" onClick={handleCreate} disabled={!name.trim()}>Create</button>
                </div>
            </div>
        </Dialog>
    )
}
