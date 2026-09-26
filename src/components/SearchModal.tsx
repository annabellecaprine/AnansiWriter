import { useState, useEffect } from 'react'
import { db } from '../db/database'
import { useWorkspaceStore } from '../store/workspaceStore'
import { Search, X, FileText, Book } from 'lucide-react'

// Basic standalone web worker parsing for TipTap JSON
function extractTextFromJson(node: any): string {
    if (!node) return ''
    if (typeof node === 'string') return node
    if (node.type === 'text' && node.text) return node.text
    if (Array.isArray(node)) return node.map(extractTextFromJson).join(' ')
    if (node.content) return extractTextFromJson(node.content)
    return ''
}

export interface SearchResult {
    id: string;
    type: string;
    title: string;
    snippet: string;
}

export type SearchProvider = (query: string, novelId: string) => Promise<SearchResult[]>

// Registered engines. New workspaces (e.g. Planning, Assets, Prompts) just append their own provider here.
const SEARCH_PROVIDERS: SearchProvider[] = [
    // 1. Codex Search
    async (q, pid) => {
        const matches: SearchResult[] = []
        const entries = await db.bibleEntries.where({ novelId: pid }).toArray()
        for (const e of entries) {
            if (e.name.toLowerCase().includes(q) || e.aliases?.some((a: string) => a.toLowerCase().includes(q)) || e.tags?.some((t: string) => t.toLowerCase().includes(q))) {
                matches.push({ id: e.id, type: 'Codex', title: e.name, snippet: e.type })
            }
        }
        return matches
    },
    // 2. Manuscript Scene Search
    async (q, pid) => {
        const matches: SearchResult[] = []
        const scenes = await db.scenes.where({ novelId: pid }).toArray()
        for (const s of scenes) {
            if (s.name.toLowerCase().includes(q)) {
                matches.push({ id: s.id, type: 'Scene', title: s.name, snippet: 'Title match' })
            } else if (s.content) {
                const raw = extractTextFromJson(s.content)
                const normalized = raw.toLowerCase()
                const idx = normalized.indexOf(q)
                if (idx !== -1) {
                    const start = Math.max(0, idx - 40)
                    const end = Math.min(raw.length, idx + q.length + 40)
                    matches.push({ id: s.id, type: 'Scene', title: s.name, snippet: `...${raw.substring(start, end).trim()}...` })
                }
            }
        }
        return matches
    }
]

export function SearchModal({ onClose }: { onClose: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])

    useEffect(() => {
        if (!activeNovelId || query.length < 3) {
            setResults([])
            return
        }

        const runSearch = async () => {
            const q = query.toLowerCase()
            const allMatchSets = await Promise.all(SEARCH_PROVIDERS.map(p => p(q, activeNovelId)))
            const merged = allMatchSets.flat()
            setResults(merged)
        }

        const debounce = setTimeout(runSearch, 300)
        return () => clearTimeout(debounce)
    }, [query, activeNovelId])

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '10vh' }}>
            <div style={{ width: '600px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: '1.5rem', border: '1px solid var(--color-border)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <Search size={24} color="var(--color-text-muted)" />
                    <input
                        type="text"
                        autoFocus
                        placeholder="Search Manuscript and Codex... (Cmd+K)"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        style={{ flex: 1, fontSize: '1.2rem', background: 'transparent', border: 'none', outline: 'none' }}
                    />
                    <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
                </div>

                <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {query.length > 0 && query.length < 3 && (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>Keep typing...</p>
                    )}
                    {query.length >= 3 && results.length === 0 && (
                        <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>No results found across the project.</p>
                    )}
                    {results.map((r, i) => (
                        <div key={`${r.id}-${i}`} style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>
                            <div style={{ marginTop: '2px', color: 'var(--color-accent)' }}>
                                {r.type === 'Scene' ? <FileText size={18} /> : <Book size={18} />}
                            </div>
                            <div>
                                <h4 style={{ margin: 0 }}>{r.title}</h4>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>{r.snippet}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
