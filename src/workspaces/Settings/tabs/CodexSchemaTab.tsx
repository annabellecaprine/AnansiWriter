import React, { useState, useEffect } from 'react'
import {
    CodexConfigService,
    type CodexCategoryDefinition,
    type RelationshipTypeDefinition,
    RECOMMENDED_CATEGORY_PRESETS,
    type CodexCategoryPreset
} from '../../../services/CodexConfigService'
import { CodexIcon, AVAILABLE_CODEX_ICONS, CODEX_COLOR_PALETTE } from '../../../components/shared/CodexIcon'
import { Dialog } from '../../../components/shared/Dialog'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import {
    Plus,
    Edit2,
    Trash2,
    ArrowRight,
    ArrowLeftRight,
    BookOpen,
    Link,
    X,
    Check,
    Layers,
    AlertCircle,
    RefreshCw,
    Sparkles
} from 'lucide-react'

export function CodexSchemaTab() {
    const { activeNovelId } = useWorkspaceStore()
    const [subTab, setSubTab] = useState<'categories' | 'relationships'>('categories')
    const [categories, setCategories] = useState<CodexCategoryDefinition[]>([])
    const [relTypes, setRelTypes] = useState<RelationshipTypeDefinition[]>([])
    const [statusMessage, setStatusMessage] = useState<string | null>(null)
    const [isBackfilling, setIsBackfilling] = useState(false)

    // Category Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<CodexCategoryDefinition | null>(null)
    const [catName, setCatName] = useState('')
    const [catIcon, setCatIcon] = useState('Tag')
    const [catColor, setCatColor] = useState('#8b5cf6')
    const [catFields, setCatFields] = useState<string[]>([])
    const [newFieldInput, setNewFieldInput] = useState('')
    const [applyCatRename, setApplyCatRename] = useState(false)

    // Relationship Modal State
    const [isRelModalOpen, setIsRelModalOpen] = useState(false)
    const [editingRelType, setEditingRelType] = useState<RelationshipTypeDefinition | null>(null)
    const [relName, setRelName] = useState('')
    const [relReverseName, setRelReverseName] = useState('')
    const [relDirection, setRelDirection] = useState<'outbound' | 'inbound' | 'bidirectional'>('outbound')
    const [relColor, setRelColor] = useState('#3b82f6')
    const [applyRelRename, setApplyRelRename] = useState(false)

    const loadData = async () => {
        const [cats, rels] = await Promise.all([
            CodexConfigService.getCategories(),
            CodexConfigService.getRelationshipTypes()
        ])
        setCategories(cats)
        setRelTypes(rels)
    }

    useEffect(() => {
        loadData()
    }, [])

    const flashStatus = (msg: string) => {
        setStatusMessage(msg)
        setTimeout(() => setStatusMessage(null), 4000)
    }

    const handleBackfillCategory = async (categoryName: string) => {
        if (!activeNovelId) {
            flashStatus('No active novel selected to backfill entries.')
            return
        }
        setIsBackfilling(true)
        try {
            const res = await CodexConfigService.backfillStarterFields(activeNovelId, categoryName)
            flashStatus(`Backfill complete: updated ${res.entriesUpdated} "${categoryName}" entries, added ${res.fieldsAdded} missing starter fields.`)
        } catch (err: any) {
            flashStatus(`Backfill failed: ${err.message}`)
        } finally {
            setIsBackfilling(false)
        }
    }

    const handleBackfillAll = async () => {
        if (!activeNovelId) {
            flashStatus('No active novel selected to backfill entries.')
            return
        }
        setIsBackfilling(true)
        try {
            const res = await CodexConfigService.backfillStarterFields(activeNovelId)
            flashStatus(`Backfill complete: updated ${res.entriesUpdated} entries, added ${res.fieldsAdded} missing starter fields across all categories.`)
        } catch (err: any) {
            flashStatus(`Backfill failed: ${err.message}`)
        } finally {
            setIsBackfilling(false)
        }
    }

    // ==========================================
    // Category Modal Handlers
    // ==========================================
    const openAddCategory = () => {
        setEditingCategory(null)
        setCatName('')
        setCatIcon('Tag')
        setCatColor('#8b5cf6')
        setCatFields([])
        setNewFieldInput('')
        setApplyCatRename(false)
        setIsCategoryModalOpen(true)
    }

    const openEditCategory = (cat: CodexCategoryDefinition) => {
        setEditingCategory(cat)
        setCatName(cat.name)
        setCatIcon(cat.icon || 'Tag')
        setCatColor(cat.color || '#8b5cf6')
        setCatFields([...(cat.defaultFields || [])])
        setNewFieldInput('')
        setApplyCatRename(false)
        setIsCategoryModalOpen(true)
    }

    const handleSaveCategory = async () => {
        if (!catName.trim()) return

        if (editingCategory) {
            const res = await CodexConfigService.updateCategory(
                editingCategory.id,
                {
                    name: catName.trim(),
                    icon: catIcon,
                    color: catColor,
                    defaultFields: catFields
                },
                applyCatRename
            )
            flashStatus(`Category "${res.category.name}" updated.${res.modifiedCount > 0 ? ` (${res.modifiedCount} existing entries migrated)` : ''}`)
        } else {
            const created = await CodexConfigService.addCategory({
                name: catName.trim(),
                icon: catIcon,
                color: catColor,
                defaultFields: catFields
            })
            flashStatus(`Created category "${created.name}".`)
        }

        setIsCategoryModalOpen(false)
        loadData()
    }

    const handleDeleteCategory = async (id: string, name: string) => {
        if (window.confirm(`Delete category "${name}"? Existing entries will keep their type label, but the category template will be removed.`)) {
            await CodexConfigService.deleteCategory(id)
            flashStatus(`Deleted category "${name}".`)
            loadData()
        }
    }

    const handleAddField = () => {
        const trimmed = newFieldInput.trim()
        if (trimmed && !catFields.includes(trimmed)) {
            setCatFields([...catFields, trimmed])
            setNewFieldInput('')
        }
    }

    const handleRemoveField = (fieldToRemove: string) => {
        setCatFields(catFields.filter(f => f !== fieldToRemove))
    }

    // ==========================================
    // Relationship Type Modal Handlers
    // ==========================================
    const openAddRelType = () => {
        setEditingRelType(null)
        setRelName('')
        setRelReverseName('')
        setRelDirection('outbound')
        setRelColor('#3b82f6')
        setApplyRelRename(false)
        setIsRelModalOpen(true)
    }

    const openEditRelType = (rel: RelationshipTypeDefinition) => {
        setEditingRelType(rel)
        setRelName(rel.name)
        setRelReverseName(rel.reverseName || '')
        setRelDirection(rel.defaultDirection)
        setRelColor(rel.color || '#3b82f6')
        setApplyRelRename(false)
        setIsRelModalOpen(true)
    }

    const handleSaveRelType = async () => {
        if (!relName.trim()) return

        if (editingRelType) {
            const res = await CodexConfigService.updateRelationshipType(
                editingRelType.id,
                {
                    name: relName.trim(),
                    reverseName: relReverseName.trim() || undefined,
                    defaultDirection: relDirection,
                    color: relColor
                },
                applyRelRename
            )
            flashStatus(`Relationship type "${res.relType.name}" updated.${res.modifiedCount > 0 ? ` (${res.modifiedCount} existing links migrated)` : ''}`)
        } else {
            const created = await CodexConfigService.addRelationshipType({
                name: relName.trim(),
                reverseName: relReverseName.trim() || undefined,
                defaultDirection: relDirection,
                color: relColor
            })
            flashStatus(`Created relationship type "${created.name}".`)
        }

        setIsRelModalOpen(false)
        loadData()
    }

    const handleDeleteRelType = async (id: string, name: string) => {
        if (window.confirm(`Delete relationship type "${name}"? Existing mapped links will retain their label.`)) {
            await CodexConfigService.deleteRelationshipType(id)
            flashStatus(`Deleted relationship type "${name}".`)
            loadData()
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1000px' }}>
            {/* Header info */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem' }}>
                        <Layers size={22} color="var(--color-accent)" /> Codex & Relationship Schema
                    </h2>
                    {statusMessage && (
                        <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid var(--color-success)', borderRadius: '4px', fontSize: '0.85rem' }}>
                            {statusMessage}
                        </div>
                    )}
                </div>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Customize lore categories, starter template fields, and cross-reference relationship types (e.g. "Possesses a...", "Ally of").
                </p>

                {/* Sub-tab navigation */}
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                    <button
                        className={`btn ${subTab === 'categories' ? 'primary' : 'outline'}`}
                        onClick={() => setSubTab('categories')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.4rem 0.9rem' }}
                    >
                        <BookOpen size={16} /> Codex Categories & Templates ({categories.length})
                    </button>
                    <button
                        className={`btn ${subTab === 'relationships' ? 'primary' : 'outline'}`}
                        onClick={() => setSubTab('relationships')}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', padding: '0.4rem 0.9rem' }}
                    >
                        <Link size={16} /> Relationship Types & Cross-References ({relTypes.length})
                    </button>
                </div>
            </div>

            {/* ============================================================ */}
            {/* Categories & Templates View                                 */}
            {/* ============================================================ */}
            {subTab === 'categories' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Master Category List</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <button
                                className="btn outline"
                                onClick={handleBackfillAll}
                                disabled={isBackfilling}
                                title="Safely backfill missing starter fields across all entries for the active novel"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                            >
                                <RefreshCw size={14} className={isBackfilling ? 'animate-spin' : ''} />
                                {isBackfilling ? 'Backfilling...' : 'Backfill All Entries'}
                            </button>
                            <button className="btn primary" onClick={openAddCategory} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Plus size={16} /> New Category
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
                        {categories.map(cat => (
                            <div
                                key={cat.id}
                                style={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    borderTop: `4px solid ${cat.color || 'var(--color-accent)'}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: `${cat.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <CodexIcon name={cat.icon} color={cat.color} size={18} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text)' }}>{cat.name}</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {cat.isBuiltIn ? 'System Default' : 'Custom Category'}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button className="icon-btn" onClick={() => openEditCategory(cat)} title="Edit Category & Fields">
                                            <Edit2 size={15} />
                                        </button>
                                        <button className="icon-btn danger" onClick={() => handleDeleteCategory(cat.id, cat.name)} title="Delete Category">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* Default template fields */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
                                        Starter Fields ({cat.defaultFields?.length || 0}):
                                    </div>
                                    {cat.defaultFields && cat.defaultFields.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                            {cat.defaultFields.map(f => (
                                                <span
                                                    key={f}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        padding: '0.15rem 0.45rem',
                                                        borderRadius: '4px',
                                                        background: 'var(--color-bg)',
                                                        border: '1px solid var(--color-border)',
                                                        color: 'var(--color-text)'
                                                    }}
                                                >
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>No default fields configured</span>
                                    )}
                                </div>

                                {/* Category Backfill Action */}
                                {cat.defaultFields && cat.defaultFields.length > 0 && (
                                    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.6rem', display: 'flex', justifyContent: 'flex-end' }}>
                                        <button
                                            type="button"
                                            className="btn outline"
                                            onClick={() => handleBackfillCategory(cat.name)}
                                            disabled={isBackfilling}
                                            title={`Add missing starter fields to existing ${cat.name} entries`}
                                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                                        >
                                            <RefreshCw size={11} className={isBackfilling ? 'animate-spin' : ''} />
                                            Backfill to Entries
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Relationship Types View                                      */}
            {/* ============================================================ */}
            {subTab === 'relationships' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Master Relationship Types</h3>
                        <button className="btn primary" onClick={openAddRelType} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Plus size={16} /> New Relationship Type
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '1rem' }}>
                        {relTypes.map(rel => (
                            <div
                                key={rel.id}
                                style={{
                                    background: 'var(--color-surface)',
                                    border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '1.25rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.75rem',
                                    borderLeft: `4px solid ${rel.color || 'var(--color-accent)'}`
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: rel.color || 'var(--color-accent)' }} />
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--color-text)' }}>{rel.name}</h4>
                                        </div>
                                        {rel.reverseName && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                                                Reverse: <em>{rel.reverseName}</em>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button className="icon-btn" onClick={() => openEditRelType(rel)} title="Edit Type">
                                            <Edit2 size={15} />
                                        </button>
                                        <button className="icon-btn danger" onClick={() => handleDeleteRelType(rel.id, rel.name)} title="Delete Type">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'auto' }}>
                                    {rel.defaultDirection === 'bidirectional' ? (
                                        <>
                                            <ArrowLeftRight size={14} color="var(--color-success)" />
                                            <span>Bidirectional (Mutual association)</span>
                                        </>
                                    ) : (
                                        <>
                                            <ArrowRight size={14} color="var(--color-accent)" />
                                            <span>Directional (Source → Target)</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* Category Add/Edit Modal                                      */}
            {/* ============================================================ */}
            {isCategoryModalOpen && (
                <Dialog
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'New Codex Category'}
                    width="550px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Recommended Presets */}
                        {!editingCategory && (
                            <div style={{ padding: '0.6rem 0.75rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                                    Quick Presets (Bradley-approved templates):
                                </span>
                                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {RECOMMENDED_CATEGORY_PRESETS.map(preset => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => {
                                                setCatName(preset.name)
                                                setCatIcon(preset.icon)
                                                setCatColor(preset.color)
                                                setCatFields([...preset.defaultFields])
                                            }}
                                            style={{
                                                padding: '0.25rem 0.55rem',
                                                borderRadius: '4px',
                                                border: catName === preset.name ? `1px solid ${preset.color}` : '1px solid var(--color-border)',
                                                background: catName === preset.name ? `${preset.color}20` : 'var(--color-surface)',
                                                color: catName === preset.name ? preset.color : 'var(--color-text)',
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
                        )}

                        {/* Name */}
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Category Name *</label>
                            <input
                                type="text"
                                className="input-field"
                                value={catName}
                                onChange={e => setCatName(e.target.value)}
                                placeholder="E.g., Species, Plot Thread, Magic System..."
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            />
                        </div>

                        {/* Icon Picker */}
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Icon</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(38px, 1fr))', gap: '0.4rem', maxHeight: '130px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg)' }}>
                                {AVAILABLE_CODEX_ICONS.map(i => (
                                    <button
                                        key={i.name}
                                        type="button"
                                        onClick={() => setCatIcon(i.name)}
                                        title={i.label}
                                        style={{
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: catIcon === i.name ? `2px solid ${catColor}` : '1px solid transparent',
                                            background: catIcon === i.name ? `${catColor}25` : 'transparent',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <CodexIcon name={i.name} size={18} color={catIcon === i.name ? catColor : 'var(--color-text-muted)'} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Color Swatch</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {CODEX_COLOR_PALETTE.map(c => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        onClick={() => setCatColor(c.hex)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: c.hex,
                                            border: catColor === c.hex ? '2px solid #FFF' : 'none',
                                            boxShadow: catColor === c.hex ? '0 0 0 2px var(--color-accent)' : 'none',
                                            cursor: 'pointer'
                                        }}
                                        title={c.label}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={catColor}
                                    onChange={e => setCatColor(e.target.value)}
                                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                                    title="Custom Hex"
                                />
                            </div>
                        </div>

                        {/* Starter Template Fields */}
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                Starter Template Fields
                            </label>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                New entries created with this category will automatically start with these attribute fields.
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={newFieldInput}
                                    onChange={e => setNewFieldInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddField(); } }}
                                    placeholder="Add field key (e.g. Weight, Rarity, Source)..."
                                    style={{ flex: 1, padding: '0.45rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                                />
                                <button type="button" className="btn outline" onClick={handleAddField}>
                                    <Plus size={14} /> Add
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '40px', padding: '0.5rem', border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg)' }}>
                                {catFields.length === 0 ? (
                                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No fields configured yet.</span>
                                ) : (
                                    catFields.map(f => (
                                        <span
                                            key={f}
                                            style={{
                                                fontSize: '0.8rem',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '4px',
                                                background: 'var(--color-surface)',
                                                border: '1px solid var(--color-border)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem'
                                            }}
                                        >
                                            {f}
                                            <X size={12} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => handleRemoveField(f)} />
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Rename Safety Option */}
                        {editingCategory && editingCategory.name !== catName && (
                            <div style={{ padding: '0.75rem', background: 'rgba(255, 170, 0, 0.1)', border: '1px solid var(--color-warning)', borderRadius: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={applyCatRename}
                                        onChange={e => setApplyCatRename(e.target.checked)}
                                        style={{ marginTop: '0.15rem' }}
                                    />
                                    <div>
                                        <strong>Apply name change to existing Codex entries</strong>
                                        <p style={{ margin: '0.2rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                            When checked, all existing entries currently categorized as "{editingCategory.name}" will be updated to "{catName}". When unchecked, existing entries retain their historical label.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button className="btn outline" onClick={() => setIsCategoryModalOpen(false)}>Cancel</button>
                            <button className="btn primary" onClick={handleSaveCategory} disabled={!catName.trim()}>Save Category</button>
                        </div>
                    </div>
                </Dialog>
            )}

            {/* ============================================================ */}
            {/* Relationship Type Add/Edit Modal                             */}
            {/* ============================================================ */}
            {isRelModalOpen && (
                <Dialog
                    isOpen={isRelModalOpen}
                    onClose={() => setIsRelModalOpen(false)}
                    title={editingRelType ? `Edit Relationship: ${editingRelType.name}` : 'New Relationship Type'}
                    width="550px"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Name (Outbound) */}
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Outbound Label *</label>
                            <input
                                type="text"
                                className="input-field"
                                value={relName}
                                onChange={e => setRelName(e.target.value)}
                                placeholder="E.g., Possesses a..., Wields, Allied With, Parent Of..."
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>How the relationship reads from the Source to Target.</span>
                        </div>

                        {/* Reverse Name (Inbound) */}
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Reverse / Inbound Label (Optional)</label>
                            <input
                                type="text"
                                className="input-field"
                                value={relReverseName}
                                onChange={e => setRelReverseName(e.target.value)}
                                placeholder="E.g., Possessed by..., Wielded By, Child Of..."
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>How the relationship reads when viewed from the Target entry.</span>
                        </div>

                        {/* Default Direction */}
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Default Direction</label>
                            <select
                                value={relDirection}
                                onChange={e => setRelDirection(e.target.value as any)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                            >
                                <option value="outbound">Directional (Source → Target)</option>
                                <option value="bidirectional">Bidirectional (Mutual association: Source ↔ Target)</option>
                                <option value="inbound">Inbound (Target → Source)</option>
                            </select>
                        </div>

                        {/* Color */}
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Badge Color</label>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                {CODEX_COLOR_PALETTE.map(c => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        onClick={() => setRelColor(c.hex)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: c.hex,
                                            border: relColor === c.hex ? '2px solid #FFF' : 'none',
                                            boxShadow: relColor === c.hex ? '0 0 0 2px var(--color-accent)' : 'none',
                                            cursor: 'pointer'
                                        }}
                                        title={c.label}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={relColor}
                                    onChange={e => setRelColor(e.target.value)}
                                    style={{ width: '32px', height: '32px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                                    title="Custom Hex"
                                />
                            </div>
                        </div>

                        {/* Rename Safety Option */}
                        {editingRelType && editingRelType.name !== relName && (
                            <div style={{ padding: '0.75rem', background: 'rgba(255, 170, 0, 0.1)', border: '1px solid var(--color-warning)', borderRadius: '4px' }}>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={applyRelRename}
                                        onChange={e => setApplyRelRename(e.target.checked)}
                                        style={{ marginTop: '0.15rem' }}
                                    />
                                    <div>
                                        <strong>Apply name change to existing relationship links</strong>
                                        <p style={{ margin: '0.2rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                            When checked, all existing relationships currently mapped as "{editingRelType.name}" will be updated to "{relName}". When unchecked, existing links remain unchanged.
                                        </p>
                                    </div>
                                </label>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button className="btn outline" onClick={() => setIsRelModalOpen(false)}>Cancel</button>
                            <button className="btn primary" onClick={handleSaveRelType} disabled={!relName.trim()}>Save Relationship Type</button>
                        </div>
                    </div>
                </Dialog>
            )}
        </div>
    )
}
