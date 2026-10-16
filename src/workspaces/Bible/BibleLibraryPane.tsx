import { useState, useMemo, useEffect } from 'react'
import { Plus, Search, Layers, Download, CheckSquare, Check, X, ArrowRightLeft } from 'lucide-react'
import type { BibleEntry } from '../../db/schema'
import { BibleExporter } from '../../services/export/BibleExporter'
import { CodexConfigService, type CodexCategoryDefinition } from '../../services/CodexConfigService'
import { CodexIcon } from '../../components/shared/CodexIcon'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'

export function BibleLibraryPane({
    entries,
    activeEntryId,
    onSelectEntry,
    onNewEntry,
    onRefreshLibrary
}: {
    entries: BibleEntry[],
    activeEntryId: string | null,
    onSelectEntry: (id: string) => void,
    onNewEntry: () => void,
    onRefreshLibrary?: () => void
}) {
    const { activeNovelId } = useWorkspaceStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [categories, setCategories] = useState<CodexCategoryDefinition[]>([])

    // Batch Selection Mode
    const [isBatchMode, setIsBatchMode] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [targetBulkCategory, setTargetBulkCategory] = useState<string>('')
    const [isMoving, setIsMoving] = useState(false)

    useEffect(() => {
        CodexConfigService.getCategories().then(cats => {
            setCategories(cats)
            if (cats.length > 0 && !targetBulkCategory) {
                setTargetBulkCategory(cats[0].name)
            }
        })
    }, [entries])

    const categoryMap = useMemo(() => {
        const map = new Map<string, CodexCategoryDefinition>()
        categories.forEach(c => map.set(c.name.toLowerCase(), c))
        return map
    }, [categories])

    const handleExport = async () => {
        if (!activeNovelId || isExporting) return
        setIsExporting(true)
        try {
            const blob = await BibleExporter.exportBible(activeNovelId)
            const novel = await db.novels.get(activeNovelId)
            const titleSlug = (novel?.title || 'codex').replace(/[^a-zA-Z0-9_\-]/g, '_').toLowerCase()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${titleSlug}_codex.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch (err: any) {
            console.error('Codex Export Failed:', err)
            alert(err.message || 'Failed to export Codex.')
        } finally {
            setIsExporting(false)
        }
    }

    // Compute categories and counts
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        entries.forEach(e => {
            counts[e.type] = (counts[e.type] || 0) + 1
        })
        return counts
    }, [entries])

    // Filter entries
    const filteredEntries = useMemo(() => {
        return entries.filter(e => {
            if (selectedType && e.type !== selectedType) return false
            if (!searchQuery) return true

            const q = searchQuery.toLowerCase()
            return e.name.toLowerCase().includes(q)
                || e.aliases?.some(a => a.toLowerCase().includes(q))
                || e.keywords?.some(k => k.toLowerCase().includes(q))
                || e.tags?.some(t => t.toLowerCase().includes(q))
        })
    }, [entries, searchQuery, selectedType])

    const toggleSelect = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const handleBulkMove = async () => {
        if (selectedIds.size === 0 || !targetBulkCategory) return
        setIsMoving(true)
        try {
            const ids = Array.from(selectedIds)
            await db.bibleEntries
                .where('id')
                .anyOf(ids)
                .modify({ type: targetBulkCategory, updatedAt: Date.now() })

            setSelectedIds(new Set())
            setIsBatchMode(false)
            onRefreshLibrary?.()
        } finally {
            setIsMoving(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'sticky', top: 0, background: 'var(--color-surface)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Codex Library</h2>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                            className={`btn ${isBatchMode ? 'primary' : 'outline'}`}
                            onClick={() => {
                                setIsBatchMode(!isBatchMode)
                                setSelectedIds(new Set())
                            }}
                            title="Toggle Batch Re-categorization Mode"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                            <CheckSquare size={13} />
                            {isBatchMode ? 'Done' : 'Batch'}
                        </button>
                        <button
                            className="btn outline"
                            onClick={handleExport}
                            disabled={isExporting}
                            title="Export Codex as Markdown ZIP"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                            <Download size={13} />
                            {isExporting ? '...' : 'Export'}
                        </button>
                        <button className="btn primary" onClick={onNewEntry} style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}>
                            <Plus size={15} style={{ marginRight: '0.15rem' }} /> New
                        </button>
                    </div>
                </div>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search Name, Alias, Tag, Keyword..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ paddingLeft: '2rem', width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
                    />
                </div>
            </div>

            <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Categories</span>
                        {selectedType && (
                            <button onClick={() => setSelectedType(null)} style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.8rem' }}>Clear Filter</button>
                        )}
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {Object.entries(categoryCounts).map(([type, count]) => {
                            const catDef = categoryMap.get(type.toLowerCase())
                            const catColor = catDef?.color || 'var(--color-accent)'
                            return (
                                <li key={type}>
                                    <button
                                        onClick={() => setSelectedType(type === selectedType ? null : type)}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.5rem',
                                            background: selectedType === type ? 'var(--color-surface-hover)' : 'transparent',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            color: selectedType === type ? 'var(--color-accent)' : 'var(--color-text)',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <CodexIcon name={catDef?.icon} color={catColor} size={15} />
                                            <span>{type}</span>
                                        </div>
                                        <span style={{ fontSize: '0.8rem', background: 'var(--color-bg)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{count}</span>
                                    </button>
                                </li>
                            )
                        })}
                    </ul>
                </div>

                {/* Batch Action Bar */}
                {isBatchMode && (
                    <div style={{
                        marginBottom: '1rem',
                        padding: '0.75rem',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-accent)',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                            <strong style={{ color: 'var(--color-accent)' }}>{selectedIds.size} Selected</strong>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds(new Set(filteredEntries.map(e => e.id)))}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                                >
                                    Select All
                                </button>
                                <span style={{ opacity: 0.5 }}>|</span>
                                <button
                                    type="button"
                                    onClick={() => setSelectedIds(new Set())}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.75rem', padding: 0 }}
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {selectedIds.size > 0 && (
                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.25rem' }}>
                                <select
                                    value={targetBulkCategory}
                                    onChange={(e) => setTargetBulkCategory(e.target.value)}
                                    style={{ flex: 1, padding: '0.35rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: '0.8rem' }}
                                >
                                    {categories.map(c => (
                                        <option key={c.id} value={c.name}>Move to {c.name}</option>
                                    ))}
                                </select>
                                <button
                                    className="btn primary"
                                    onClick={handleBulkMove}
                                    disabled={isMoving}
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                >
                                    {isMoving ? 'Moving...' : 'Apply'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Entries ({filteredEntries.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {filteredEntries.map(e => {
                        const catDef = categoryMap.get(e.type.toLowerCase())
                        const catColor = catDef?.color || 'var(--color-text-muted)'
                        const isSelected = selectedIds.has(e.id)
                        return (
                            <div
                                key={e.id}
                                onClick={() => {
                                    if (isBatchMode) {
                                        toggleSelect(e.id)
                                    } else {
                                        onSelectEntry(e.id)
                                    }
                                }}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '0.5rem 0.75rem',
                                    background: isSelected
                                        ? 'rgba(139, 92, 246, 0.15)'
                                        : activeEntryId === e.id
                                            ? 'var(--color-accent-transparent, rgba(100, 150, 255, 0.1))'
                                            : 'transparent',
                                    borderRadius: '4px',
                                    border: isSelected ? '1px solid var(--color-accent)' : '1px solid transparent',
                                    borderLeft: activeEntryId === e.id ? `3px solid ${catDef?.color || 'var(--color-accent)'}` : (isSelected ? '3px solid var(--color-accent)' : '3px solid transparent'),
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.6rem'
                                }}
                            >
                                {isBatchMode && (
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(ev) => toggleSelect(e.id, ev as any)}
                                        style={{ cursor: 'pointer' }}
                                    />
                                )}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <span style={{ fontWeight: activeEntryId === e.id ? 600 : 500, color: activeEntryId === e.id ? 'var(--color-accent)' : 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {e.name}
                                        {!e.novelId && e.seriesId && <span title="Series-level Entry"><Layers size={14} color="var(--color-warning)" /></span>}
                                    </span>
                                    <span style={{ fontSize: '0.8rem', color: catColor, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <CodexIcon name={catDef?.icon} color={catColor} size={12} />
                                        {e.type}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
