import { useState, useMemo } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import type { BibleEntry } from '../../db/schema'

export function BibleLibraryPane({
    entries,
    activeEntryId,
    onSelectEntry,
    onNewEntry
}: {
    entries: BibleEntry[],
    activeEntryId: string | null,
    onSelectEntry: (id: string) => void,
    onNewEntry: () => void
}) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedType, setSelectedType] = useState<string | null>(null)

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: 0, background: 'var(--color-surface)', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Codex Library</h2>
                    <button className="btn primary" onClick={onNewEntry} style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                        <Plus size={16} style={{ marginRight: '0.2rem' }} /> New
                    </button>
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
                        {Object.entries(categoryCounts).map(([type, count]) => (
                            <li key={type}>
                                <button
                                    onClick={() => setSelectedType(type === selectedType ? null : type)}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        padding: '0.5rem',
                                        background: selectedType === type ? 'var(--color-surface-hover)' : 'transparent',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        color: selectedType === type ? 'var(--color-accent)' : 'var(--color-text)',
                                        textAlign: 'left'
                                    }}
                                >
                                    <span>{type}</span>
                                    <span style={{ fontSize: '0.8rem', background: 'var(--color-bg)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>{count}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Entries ({filteredEntries.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    {filteredEntries.map(e => (
                        <button
                            key={e.id}
                            onClick={() => onSelectEntry(e.id)}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 0.75rem',
                                background: activeEntryId === e.id ? 'var(--color-accent-transparent, rgba(100, 150, 255, 0.1))' : 'transparent',
                                border: 'none',
                                borderLeft: activeEntryId === e.id ? '3px solid var(--color-accent)' : '3px solid transparent',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.25rem'
                            }}
                        >
                            <span style={{ fontWeight: activeEntryId === e.id ? 600 : 500, color: activeEntryId === e.id ? 'var(--color-accent)' : 'var(--color-text)' }}>
                                {e.name}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{e.type}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
