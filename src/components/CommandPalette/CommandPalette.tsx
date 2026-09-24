import { useEffect, useState } from 'react'
import { Search, Hash, Users, Sparkles } from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useNavigate } from 'react-router-dom'
import { db } from '../../db/database'

export default function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const { activeProjectId } = useWorkspaceStore()
    const navigate = useNavigate()
    const [results, setResults] = useState<{ id: string, name: string, type: string, action: string, path?: string, execute?: boolean, payload?: string, entity?: string, callback?: () => void }[]>([])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen(o => !o)
            }
            if (e.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        if (!open || !activeProjectId) {
            setResults([])
            return
        }

        const buildIndex = async () => {
            const s = await db.scenes.where({ projectId: activeProjectId }).toArray()
            const b = await db.bibleEntries.where({ projectId: activeProjectId }).toArray()

            let cmds: any[] = []
            const cleanQuery = query.toLowerCase()

            if (cleanQuery.startsWith('/')) {
                const aiMatch = cleanQuery.match(/^\/ai\s+(.*)/)
                const charMatch = cleanQuery.match(/^\/char\s+(.*)/)

                if (aiMatch) cmds.push({ id: 'rapid-ai', name: `Ask AI: ${aiMatch[1]}`, type: 'Rapid AI', action: 'Execute', execute: true, payload: aiMatch[1] })
                if (charMatch) cmds.push({ id: 'create-char', name: `Create Character: ${charMatch[1]}`, type: 'Action', action: 'Insert', execute: true, entity: 'Character', payload: charMatch[1] })

                cmds = cmds.concat([
                    { id: 'create-scene', name: 'Create new empty Scene', type: 'Action', action: 'Create', path: '/writing' },
                    { id: 'invoke-ai', name: 'Open Context Sandbox', type: 'Action', action: 'AI', path: '/sandbox' }
                ].filter(c => c.name.toLowerCase().includes(cleanQuery.slice(1))))
            } else {
                const mappedS = s.filter(x => x.name.toLowerCase().includes(cleanQuery)).map(x => ({ id: x.id, name: x.name, type: 'Scene', action: 'Jump To', path: '/writing', callback: () => useWorkspaceStore.getState().setActiveScene(x.id) }))
                const mappedB = b.filter(x => x.name.toLowerCase().includes(cleanQuery)).map(x => ({ id: x.id, name: x.name, type: `Bible: ${x.type}`, action: 'Jump To', path: '/bible' }))

                cmds = [...mappedS, ...mappedB]
                if ("project settings".includes(cleanQuery)) cmds.push({ id: 'settings', name: 'Project Settings', type: 'Settings', action: 'Navigate', path: '/settings' })
            }

            setResults(cmds.slice(0, 10))
        }

        buildIndex()
    }, [query, open, activeProjectId])

    if (!open) return null

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', justifyContent: 'center', paddingTop: '10vh' }} onClick={() => setOpen(false)}>
            <div style={{ background: 'var(--color-surface)', width: '600px', maxHeight: '500px', borderRadius: 'var(--radius-lg)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Search size={20} color="var(--color-text-muted)" />
                    <input
                        autoFocus
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Type to search scenes, entities, or commands (start with / for actions)..."
                        style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--color-text)', fontSize: '1.2rem', outline: 'none' }}
                    />
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {results.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No matching indices found.</div>
                    ) : (
                        results.map(r => (
                            <div key={r.id} className="hover-bg" style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={async () => {
                                if (r.execute && r.payload) {
                                    if (r.id === 'create-char') {
                                        const id = crypto.randomUUID()
                                        await db.bibleEntries.add({ id, projectId: activeProjectId as string, type: 'Character', name: r.payload || 'Unnamed', aliases: [], tags: [], createdAt: Date.now(), updatedAt: Date.now() })
                                        navigate('/bible')
                                    }
                                    if (r.id === 'rapid-ai') {
                                        alert(`Rapid AI invoked with query: ${r.payload}\n(Context engine hook fired)`)
                                    }
                                } else {
                                    if (r.callback) r.callback()
                                    if (r.path) navigate(r.path)
                                }
                                setOpen(false)
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    {r.type === 'Scene' ? <Hash size={16} color="var(--color-text-muted)" /> : r.type.includes('Bible') ? <Users size={16} color="var(--color-text-muted)" /> : <Sparkles size={16} color="var(--color-text-muted)" />}
                                    <strong>{r.name}</strong>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ padding: '0.2rem 0.5rem', background: 'var(--color-bg)', borderRadius: '4px' }}>{r.type}</span>
                                    <span style={{ color: 'var(--color-primary)' }}>{r.action}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div style={{ padding: '0.8rem 1rem', background: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
                    <span><kbd>Enter</kbd> to select</span>
                    <span><kbd>Esc</kbd> to dismiss</span>
                </div>
            </div>
        </div>
    )
}
