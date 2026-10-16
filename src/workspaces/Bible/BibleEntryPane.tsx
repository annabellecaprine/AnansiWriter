import { useState, useEffect } from 'react'
import { BibleService } from '../../services/BibleService'
import { AssetService } from '../../services/AssetService'
import { CodexConfigService, type CodexCategoryDefinition, normalizeCategoryName } from '../../services/CodexConfigService'
import { CodexIcon } from '../../components/shared/CodexIcon'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Save, Trash2, Layers, ChevronDown, Edit2, Check, X } from 'lucide-react'
import { confirmAction } from '../../store/dialogStore'

import OverviewTab from './tabs/OverviewTab'
import DetailsTab from './tabs/DetailsTab'
import RelationshipsTab from './tabs/RelationshipsTab'
import MediaTab from './tabs/MediaTab'
import TimelineTab from './tabs/TimelineTab'
import SourcesTab from './tabs/SourcesTab'
import AdvancedTab from './tabs/AdvancedTab'

type TabKeys = 'Overview' | 'Details' | 'Relationships' | 'Media' | 'Timeline' | 'Sources' | 'Advanced'

export function BibleEntryPane({ entryId, onRefreshLibrary, onClose }: { entryId: string, onRefreshLibrary: () => void, onClose: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [entry, setEntry] = useState<any>(null)
    const [fields, setFields] = useState<any[]>([])
    const [assets, setAssets] = useState<any[]>([])
    const [categories, setCategories] = useState<CodexCategoryDefinition[]>([])

    // Name editing state
    const [isEditingName, setIsEditingName] = useState(false)
    const [nameInput, setNameInput] = useState('')

    const [activeTab, setActiveTab] = useState<TabKeys>('Overview')

    const loadEntry = () => {
        if (activeNovelId && entryId) {
            BibleService.getEntryWithFields(activeNovelId, entryId).then(data => {
                if (data) {
                    setEntry(data)
                    setFields(data.fields)
                }
            })
            AssetService.getLinkedAssets(activeNovelId, entryId).then(setAssets)
        }
    }

    useEffect(() => {
        setIsEditingName(false)
        loadEntry()
        CodexConfigService.getCategories().then(setCategories)
    }, [activeNovelId, entryId])

    if (!entry) {
        return <div style={{ padding: '2rem', color: 'var(--color-text-muted)' }}>Loading...</div>
    }

    const handleSaveName = async () => {
        const trimmed = nameInput.trim()
        if (trimmed && activeNovelId && trimmed !== entry.name) {
            await BibleService.updateEntry(activeNovelId, entry.id, { name: trimmed })
            setEntry((prev: any) => prev ? { ...prev, name: trimmed } : prev)
            onRefreshLibrary()
        }
        setIsEditingName(false)
    }

    const handleCategoryChange = async (newType: string) => {
        if (!activeNovelId || !entry || newType === entry.type) return
        await BibleService.updateEntry(activeNovelId, entry.id, { type: newType })
        setEntry({ ...entry, type: newType })
        onRefreshLibrary()
    }

    const canonicalCategoryName = normalizeCategoryName(entry.type, categories)
    const currentCat = categories.find(c => c.name.toLowerCase() === canonicalCategoryName.toLowerCase())

    const handleDelete = async () => {
        if (!activeNovelId) return
        const confirm = await confirmAction({
            title: 'Delete Entry',
            message: `Are you sure you want to move "${entry.name}" to the Trash? Existing relationship links will be preserved but hidden.`,
            isDestructive: true,
            confirmLabel: 'Move to Trash'
        })

        if (confirm) {
            await BibleService.moveToTrash(activeNovelId, entryId)
            onRefreshLibrary()
            onClose()
        }
    }

    const tabs: TabKeys[] = ['Overview', 'Details', 'Relationships', 'Media', 'Timeline', 'Sources', 'Advanced']

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{ padding: '2rem 2rem 0 2rem', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, marginRight: '1rem' }}>
                        {isEditingName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <input
                                    autoFocus
                                    type="text"
                                    value={nameInput}
                                    onChange={e => setNameInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSaveName()
                                        if (e.key === 'Escape') setIsEditingName(false)
                                    }}
                                    style={{
                                        fontSize: '1.6rem',
                                        fontWeight: 700,
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        border: '1px solid var(--color-accent)',
                                        background: 'var(--color-bg)',
                                        color: 'var(--color-text)',
                                        minWidth: '280px',
                                        maxWidth: '500px'
                                    }}
                                />
                                <button
                                    className="btn primary"
                                    onClick={handleSaveName}
                                    style={{ padding: '0.4rem 0.6rem' }}
                                    title="Save Name (Enter)"
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    className="btn outline"
                                    onClick={() => setIsEditingName(false)}
                                    style={{ padding: '0.4rem 0.6rem' }}
                                    title="Cancel (Esc)"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <h1
                                    style={{ margin: 0, fontSize: '2rem', cursor: 'pointer' }}
                                    onDoubleClick={() => {
                                        setNameInput(entry.name)
                                        setIsEditingName(true)
                                    }}
                                    title="Double-click to rename"
                                >
                                    {entry.name}
                                </h1>
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => {
                                        setNameInput(entry.name)
                                        setIsEditingName(true)
                                    }}
                                    style={{
                                        opacity: 0.6,
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text)',
                                        cursor: 'pointer',
                                        padding: '0.25rem',
                                        display: 'inline-flex',
                                        alignItems: 'center'
                                    }}
                                    title="Rename Entry"
                                >
                                    <Edit2 size={16} />
                                </button>
                            </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.35rem' }}>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    padding: '0.2rem 0.6rem',
                                    borderRadius: '6px',
                                    background: `${currentCat?.color || 'var(--color-accent)'}18`,
                                    border: `1px solid ${currentCat?.color || 'var(--color-accent)'}40`,
                                    color: currentCat?.color || 'var(--color-accent)',
                                    fontSize: '0.85rem',
                                    fontWeight: 600
                                }}
                            >
                                <CodexIcon name={currentCat?.icon} color={currentCat?.color || 'var(--color-accent)'} size={14} />
                                <select
                                    value={entry.type}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                    title="Click to re-categorize this entry"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'inherit',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        outline: 'none',
                                        paddingRight: '0.2rem'
                                    }}
                                >
                                    {categories.map(c => (
                                        <option key={c.id} value={c.name} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                            {c.name}
                                        </option>
                                    ))}
                                    {!categories.some(c => c.name.toLowerCase() === entry.type.toLowerCase()) && (
                                        <option value={entry.type} style={{ background: 'var(--color-surface)', color: 'var(--color-text)' }}>
                                            {entry.type}
                                        </option>
                                    )}
                                </select>
                            </div>
                            {!entry.novelId && entry.seriesId && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <Layers size={13} /> Series-level
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn outline" onClick={handleDelete} title="Move to Trash">
                            <Trash2 size={16} color="var(--color-error)" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                    {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '0.5rem 0',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === tab ? '2px solid var(--color-accent)' : '2px solid transparent',
                                color: activeTab === tab ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                fontWeight: activeTab === tab ? 600 : 500,
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Payload */}
            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
                {activeTab === 'Overview' && <OverviewTab entry={entry} assets={assets} onUpdated={() => { loadEntry(); onRefreshLibrary(); }} />}
                {activeTab === 'Details' && <DetailsTab entry={entry} fields={fields} onUpdated={loadEntry} />}
                {activeTab === 'Relationships' && <RelationshipsTab entryId={entryId} />}
                {activeTab === 'Media' && <MediaTab entry={entry} assets={assets} onUpdated={loadEntry} />}
                {activeTab === 'Timeline' && <TimelineTab entryId={entryId} fields={fields} onUpdated={loadEntry} />}
                {activeTab === 'Sources' && <SourcesTab entry={entry} fields={fields} onUpdated={() => { loadEntry(); onRefreshLibrary(); }} />}
                {activeTab === 'Advanced' && <AdvancedTab entry={entry} onUpdated={() => { loadEntry(); onRefreshLibrary(); }} />}
            </div>
        </div>
    )
}
