import React, { useState, useEffect, useRef } from 'react'
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
import { Plus, ChevronDown, Check, AlertTriangle } from 'lucide-react'
import type { BibleEntry } from '../../../db/schema'

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

    // Active entries for duplicate-name detection
    const [existingEntries, setExistingEntries] = useState<BibleEntry[]>([])

    // Custom dropdown menu open state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

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

    const loadExistingEntries = async () => {
        if (activeNovelId) {
            const entries = await BibleService.listActiveEntries(activeNovelId)
            setExistingEntries(entries)
        }
    }

    useEffect(() => {
        if (isOpen) {
            loadCategories()
            loadExistingEntries()
            setIsCreatingCategory(false)
            setCustomCatName('')
            setSaveToSettings(true)
            setIsDropdownOpen(false)
        }
    }, [isOpen, activeNovelId])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false)
            }
        }
        if (isDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isDropdownOpen])

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

    // Duplicate detection
    const trimmedNameLower = name.trim().toLowerCase()
    const duplicateEntry = trimmedNameLower
        ? existingEntries.find(e => e.name.trim().toLowerCase() === trimmedNameLower)
        : null

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title="Create New Codex Entry" width="520px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Category / Type Selector */}
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>
                        Codex Category *
                    </label>
                    <button
                        type="button"
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '4px',
                            border: isDropdownOpen ? '1px solid var(--color-accent)' : '1px solid var(--color-border)',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text)',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            {activeCat && !isCreatingCategory ? (
                                <>
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '4px',
                                        background: `${activeCat.color}25`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <CodexIcon name={activeCat.icon} color={activeCat.color} size={14} />
                                    </div>
                                    <span style={{ fontWeight: 600 }}>{activeCat.name}</span>
                                </>
                            ) : isCreatingCategory ? (
                                <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>+ Defining New Category...</span>
                            ) : (
                                <span>Select Category...</span>
                            )}
                        </div>
                        <ChevronDown size={16} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease', opacity: 0.7 }} />
                    </button>

                    {/* Styled Option Dropdown Menu showing icons and colors */}
                    {isDropdownOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: '4px',
                            background: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                            zIndex: 1000,
                            maxHeight: '260px',
                            overflowY: 'auto',
                            padding: '0.35rem'
                        }}>
                            {categories.map(c => {
                                const isSelected = !isCreatingCategory && selectedType === c.name
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            handleTypeChange(c.name)
                                            setIsDropdownOpen(false)
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.45rem 0.6rem',
                                            borderRadius: '4px',
                                            background: isSelected ? 'var(--color-surface-hover)' : 'transparent',
                                            cursor: 'pointer',
                                            transition: 'background 0.1s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                        onMouseLeave={e => e.currentTarget.style.background = isSelected ? 'var(--color-surface-hover)' : 'transparent'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <div style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '4px',
                                                background: `${c.color}25`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                <CodexIcon name={c.icon} color={c.color} size={14} />
                                            </div>
                                            <span style={{ fontWeight: isSelected ? 600 : 400, color: isSelected ? 'var(--color-accent)' : 'var(--color-text)' }}>
                                                {c.name}
                                            </span>
                                        </div>
                                        {isSelected && <Check size={14} color="var(--color-accent)" />}
                                    </div>
                                )
                            })}
                            <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.35rem 0' }} />
                            <div
                                onClick={() => {
                                    handleTypeChange(NEW_CATEGORY_OPTION)
                                    setIsDropdownOpen(false)
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem',
                                    padding: '0.45rem 0.6rem',
                                    borderRadius: '4px',
                                    color: 'var(--color-accent)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <Plus size={16} />
                                <span>+ New Category...</span>
                            </div>
                        </div>
                    )}
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
                <div>
                    <span style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 600, fontSize: '0.9rem' }}>Entry Name *</span>
                    <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="E.g., Excalibur, Eldoria, Bob..."
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: duplicateEntry ? '1px solid var(--color-warning)' : '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                    />
                    {duplicateEntry && (
                        <div style={{
                            marginTop: '0.4rem',
                            padding: '0.45rem 0.65rem',
                            borderRadius: '4px',
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px solid var(--color-warning)',
                            color: 'var(--color-warning)',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem'
                        }}>
                            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                            <span>
                                An entry named <strong>"{duplicateEntry.name}"</strong> already exists in {duplicateEntry.seriesId && !duplicateEntry.novelId ? 'the Series' : 'this Novel'} ({duplicateEntry.type}). Creating another may cause duplicates.
                            </span>
                        </div>
                    )}
                </div>

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
