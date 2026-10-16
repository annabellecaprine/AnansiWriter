import React, { useState, useEffect } from 'react'
import { Dialog } from '../../../components/shared/Dialog'
import { BibleService } from '../../../services/BibleService'
import {
    CodexConfigService,
    type CodexCategoryDefinition,
    RECOMMENDED_CATEGORY_PRESETS,
    type CodexCategoryPreset
} from '../../../services/CodexConfigService'
import { CodexIcon, AVAILABLE_CODEX_ICONS, CODEX_COLOR_PALETTE } from '../../../components/shared/CodexIcon'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { Plus } from 'lucide-react'

const NEW_CATEGORY_OPTION = '__NEW_CATEGORY__'

export function NewEntryModal({ isOpen, onClose, onEntryCreated }: { isOpen: boolean, onClose: () => void, onEntryCreated: (id: string) => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [name, setName] = useState('')
    const [selectedType, setSelectedType] = useState('Character')
    const [description, setDescription] = useState('')
    const [tagsInput, setTagsInput] = useState('')
    const [scope, setScope] = useState<'project' | 'series'>('project')

    // Master categories from CodexConfigService
    const [categories, setCategories] = useState<CodexCategoryDefinition[]>([])

    // On-the-fly category creation state
    const [isCreatingCategory, setIsCreatingCategory] = useState(false)
    const [customCatName, setCustomCatName] = useState('')
    const [customCatIcon, setCustomCatIcon] = useState('Tag')
    const [customCatColor, setCustomCatColor] = useState('#ec4899')
    const [customCatFields, setCustomCatFields] = useState<string[]>([])
    const [saveToSettings, setSaveToSettings] = useState(true)

    const loadCategories = async () => {
        const cats = await CodexConfigService.getCategories()
        setCategories(cats)
        if (cats.length > 0 && (!selectedType || selectedType === NEW_CATEGORY_OPTION)) {
            setSelectedType(cats[0].name)
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadCategories()
            setIsCreatingCategory(false)
            setCustomCatName('')
            setSaveToSettings(true)
        }
    }, [isOpen])

    const handleTypeChange = (val: string) => {
        if (val === NEW_CATEGORY_OPTION) {
            setIsCreatingCategory(true)
            setSelectedType(NEW_CATEGORY_OPTION)
        } else {
            setIsCreatingCategory(false)
            setSelectedType(val)
        }
    }

    const handleCreate = async () => {
        if (!activeNovelId || !name.trim()) return

        let finalType = selectedType

        if (isCreatingCategory) {
            const trimmedCat = customCatName.trim()
            if (!trimmedCat) return
            finalType = trimmedCat

            if (saveToSettings) {
                // Check if already exists
                const existing = categories.find(c => c.name.toLowerCase() === trimmedCat.toLowerCase())
                if (!existing) {
                    await CodexConfigService.addCategory({
                        name: trimmedCat,
                        icon: customCatIcon,
                        color: customCatColor,
                        defaultFields: customCatFields
                    })
                }
            }
        }

        const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
        const entryId = await BibleService.createEntryUsingTemplate(activeNovelId, name.trim(), finalType, scope)
        await BibleService.updateEntry(activeNovelId, entryId, { tags, description: description.trim() })

        onEntryCreated(entryId)

        // Reset form
        setName('')
        setDescription('')
        setTagsInput('')
        setSelectedType(categories[0]?.name || 'Character')
        setIsCreatingCategory(false)
        setCustomCatName('')
        setCustomCatFields([])
        setScope('project')
    }

    const activeCat = categories.find(c => c.name === selectedType)

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Create New Codex Entry" width="520px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Category / Type Selector */}
                <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>
                        Codex Category *
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {activeCat && !isCreatingCategory && (
                            <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: `${activeCat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CodexIcon name={activeCat.icon} color={activeCat.color} size={16} />
                            </div>
                        )}
                        <select
                            value={selectedType}
                            onChange={e => handleTypeChange(e.target.value)}
                            style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                        >
                            {categories.map(c => (
                                <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            <option disabled>──────────</option>
                            <option value={NEW_CATEGORY_OPTION}>+ New Category...</option>
                        </select>
                    </div>
                </div>

                {/* On-the-fly category creation box */}
                {isCreatingCategory && (
                    <div style={{ padding: '0.85rem', background: 'var(--color-surface)', border: '1px solid var(--color-accent)', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-accent)' }}>
                                Define New Category
                            </span>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={() => handleTypeChange(categories[0]?.name || 'Character')}
                                style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}
                            >
                                Cancel
                            </button>
                        </div>

                        {/* Quick Presets */}
                        <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.3rem' }}>
                                Recommended Templates:
                            </span>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                                {RECOMMENDED_CATEGORY_PRESETS.map(preset => (
                                    <button
                                        key={preset.name}
                                        type="button"
                                        onClick={() => {
                                            setCustomCatName(preset.name)
                                            setCustomCatIcon(preset.icon)
                                            setCustomCatColor(preset.color)
                                            setCustomCatFields([...preset.defaultFields])
                                        }}
                                        style={{
                                            padding: '0.2rem 0.5rem',
                                            borderRadius: '4px',
                                            border: customCatName === preset.name ? `1px solid ${preset.color}` : '1px solid var(--color-border)',
                                            background: customCatName === preset.name ? `${preset.color}20` : 'var(--color-bg)',
                                            color: customCatName === preset.name ? preset.color : 'var(--color-text)',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.3rem'
                                        }}
                                        title={preset.description}
                                    >
                                        <CodexIcon name={preset.icon} color={preset.color} size={12} />
                                        {preset.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Category Name (e.g. Species, Plot Thread, Magic System)..."
                                value={customCatName}
                                onChange={e => setCustomCatName(e.target.value)}
                                style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            />
                        </div>

                        {customCatFields.length > 0 && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                Starter fields: {customCatFields.join(', ')}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Icon:</span>
                                <select
                                    value={customCatIcon}
                                    onChange={e => setCustomCatIcon(e.target.value)}
                                    style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.8rem' }}
                                >
                                    {AVAILABLE_CODEX_ICONS.map(i => (
                                        <option key={i.name} value={i.name}>{i.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Color:</span>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    {CODEX_COLOR_PALETTE.slice(0, 5).map(c => (
                                        <button
                                            key={c.hex}
                                            type="button"
                                            onClick={() => setCustomCatColor(c.hex)}
                                            style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                background: c.hex,
                                                border: customCatColor === c.hex ? '2px solid #FFF' : 'none',
                                                cursor: 'pointer'
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={saveToSettings}
                                onChange={e => setSaveToSettings(e.target.checked)}
                            />
                            Save to Master Settings for future entries
                        </label>
                    </div>
                )}

                {/* Entry Name */}
                <label>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Entry Name *</span>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="E.g., Excalibur, Eldoria, Bob..."
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                    />
                </label>

                {/* Scope */}
                <label>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Codex Scope *</span>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.25rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="radio" value="project" checked={scope === 'project'} onChange={() => setScope('project')} />
                            This Novel Only
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input type="radio" value="series" checked={scope === 'series'} onChange={() => setScope('series')} />
                            Entire Series (Shared)
                        </label>
                    </div>
                </label>

                {/* Description */}
                <label>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Description (Optional)</span>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="A brief summary..." rows={3} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
                </label>

                {/* Tags */}
                <label>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Initial Tags (Optional)</span>
                    <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Comma-separated tags" style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }} />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button className="btn outline" onClick={onClose}>Cancel</button>
                    <button
                        className="btn primary"
                        onClick={handleCreate}
                        disabled={!name.trim() || (isCreatingCategory && !customCatName.trim())}
                    >
                        Create Entry
                    </button>
                </div>
            </div>
        </Dialog>
    )
}
