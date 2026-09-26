import { useState } from 'react'
import { WritingService } from '../../services/WritingService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { X, Search, Replace } from 'lucide-react'
import { confirmAction } from '../../store/dialogStore'

interface Props {
    onClose: () => void
}

export default function GlobalSearchReplace({ onClose }: Props) {
    const { activeNovelId, setActiveScene } = useWorkspaceStore()
    const [query, setQuery] = useState('')
    const [replacement, setReplacement] = useState('')
    const [matchCase, setMatchCase] = useState(false)
    const [results, setResults] = useState<{ sceneId: string, sceneName: string, snippet: string }[]>([])
    const [hasSearched, setHasSearched] = useState(false)

    const handleSearch = async () => {
        if (!activeNovelId || !query.trim()) {
            setResults([])
            setHasSearched(false)
            return
        }
        const matches = await WritingService.searchNovelText(activeNovelId, query, matchCase)
        setResults(matches)
        setHasSearched(true)
    }

    const handleReplaceAll = async () => {
        if (!activeNovelId || !query.trim()) return

        const count = await WritingService.globalReplaceText(activeNovelId, query, replacement, matchCase)
        if (count > 0) {
            await confirmAction({ title: 'Replace Complete', message: `Successfully replaced ${count} occurrences across the manuscript.`, confirmLabel: 'OK' })
            handleSearch() // Refresh results
        } else {
            await confirmAction({ title: 'No Matches', message: `Found 0 occurrences to replace.`, confirmLabel: 'OK' })
        }
    }

    return (
        <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
            <div style={{
                position: 'fixed', top: '10vh', left: '50%', transform: 'translateX(-50%)',
                background: 'var(--color-surface)', width: '600px', maxWidth: '90vw',
                borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                border: '1px solid var(--color-border)', zIndex: 9999, display: 'flex', flexDirection: 'column',
                maxHeight: '80vh'
            }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text)' }}>
                        <Search size={18} color="var(--color-accent)" /> Global Search & Replace
                    </div>
                    <button className="btn" onClick={onClose}><X size={18} /></button>
                </header>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Find</label>
                            <input
                                type="text"
                                className="input"
                                style={{ width: '100%', fontSize: '0.9rem' }}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                autoFocus
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Replace with</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className="input"
                                    style={{ width: '100%', fontSize: '0.9rem' }}
                                    value={replacement}
                                    onChange={e => setReplacement(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} />
                            Match Case
                        </label>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn primary" onClick={handleSearch} disabled={!query.trim()}>
                                Find All
                            </button>
                            <button className="btn" style={{ borderColor: 'var(--color-warning)', color: 'var(--color-warning)' }} onClick={handleReplaceAll} disabled={!query.trim()}>
                                <Replace size={14} style={{ marginRight: '0.25rem' }} /> Replace All
                            </button>
                        </div>
                    </div>
                </div>

                {hasSearched && (
                    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', padding: '1rem', borderBottomLeftRadius: 'inherit', borderBottomRightRadius: 'inherit' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>{results.length} matches found</div>

                        {results.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>No occurrences matching "{query}" found in manuscript.</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {results.map((r, i) => (
                                    <div key={i} style={{ background: 'var(--color-surface)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.1s' }} onClick={() => { setActiveScene(r.sceneId); onClose() }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-surface)')}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)', marginBottom: '0.25rem' }}>{r.sceneName}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text)', fontStyle: 'italic' }}>{r.snippet}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
