import { useEffect, useState } from 'react'
import { db } from '../../db/database'
import { User, MapPin, Tag, Search } from 'lucide-react'

interface MentionAutocompleteProps {
    novelId: string
    query: string
    onSelect: (entry: { id: string, name: string, type: string }) => void
    onClose: () => void
}

export default function MentionAutocomplete({ novelId, query, onSelect, onClose }: MentionAutocompleteProps) {
    const [entries, setEntries] = useState<any[]>([])
    const [selectedIndex, setSelectedIndex] = useState(0)

    useEffect(() => {
        if (!novelId) return

        let mounted = true
        db.bibleEntries.where({ novelId }).toArray().then(allEntries => {
            if (!mounted) return
            const filtered = allEntries.filter(e =>
                e.name.toLowerCase().includes(query.toLowerCase()) ||
                (e.type && e.type.toLowerCase().includes(query.toLowerCase()))
            )
            setEntries(filtered.slice(0, 8))
            setSelectedIndex(0)
        })

        return () => { mounted = false }
    }, [novelId, query])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex(prev => (entries.length > 0 ? (prev + 1) % entries.length : 0))
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(prev => (entries.length > 0 ? (prev - 1 + entries.length) % entries.length : 0))
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (entries[selectedIndex]) {
                    onSelect({ id: entries[selectedIndex].id, name: entries[selectedIndex].name, type: entries[selectedIndex].type })
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [entries, selectedIndex, onSelect, onClose])

    if (entries.length === 0) {
        return (
            <div
                style={{
                    position: 'absolute',
                    zIndex: 9999,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                    padding: '0.75rem 1rem',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                    width: '220px'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Search size={14} /> No matching entities found
                </div>
            </div>
        )
    }

    return (
        <div
            style={{
                position: 'absolute',
                zIndex: 9999,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                width: '260px',
                overflow: 'hidden'
            }}
            aria-label="Mention Autocomplete Popup"
        >
            <div style={{ padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Insert Entity Link Chip
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {entries.map((entry, idx) => {
                    const isSelected = idx === selectedIndex
                    return (
                        <div
                            key={entry.id}
                            onClick={() => onSelect({ id: entry.id, name: entry.name, type: entry.type })}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            style={{
                                padding: '0.5rem 0.75rem',
                                background: isSelected ? 'var(--color-bg)' : 'transparent',
                                borderLeft: `3px solid ${isSelected ? 'var(--color-primary)' : 'transparent'}`,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.85rem'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: isSelected ? 600 : 400 }}>
                                {entry.type === 'Character' && <User size={14} color="var(--color-primary)" />}
                                {entry.type === 'Location' && <MapPin size={14} color="#28a745" />}
                                {entry.type !== 'Character' && entry.type !== 'Location' && <Tag size={14} color="#ffc107" />}
                                {entry.name}
                            </span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.7, background: 'var(--color-surface)', padding: '0.1rem 0.3rem', borderRadius: '3px' }}>
                                {entry.type}
                            </span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
