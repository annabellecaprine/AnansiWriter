import { useEffect, useState, useRef } from 'react'
import { db } from '../../db/database'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { Network } from 'lucide-react'

// Simple naive forced-directed logic wrapper
export default function RelationshipGraph() {
    const { activeProjectId } = useWorkspaceStore()
    const [nodes, setNodes] = useState<{ id: string, name: string, x: number, y: number }[]>([])
    const [edges, setEdges] = useState<{ source: string, target: string, type: string }[]>([])

    // Filters
    const [filterType, setFilterType] = useState('')
    const [filterTag, setFilterTag] = useState('')
    const [filterRel, setFilterRel] = useState('')
    const [hideDisconnected, setHideDisconnected] = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!activeProjectId) return

        const buildGraph = async () => {
            const entries = await db.bibleEntries.where({ projectId: activeProjectId }).toArray()
            const relationships = await db.relationships.where({ projectId: activeProjectId }).toArray()

            const container = containerRef.current
            const width = container ? container.clientWidth : 800
            const height = 400

            // Apply node filters
            let filteredEntries = entries
            if (filterType) filteredEntries = filteredEntries.filter(e => e.type === filterType)
            if (filterTag) filteredEntries = filteredEntries.filter(e => e.tags?.some((t: string) => t.toLowerCase().includes(filterTag.toLowerCase())))

            const cleanEdges = relationships.filter(r =>
                filteredEntries.find(n => n.id === r.sourceId) && filteredEntries.find(n => n.id === r.targetId)
                && (!filterRel || r.type.toLowerCase().includes(filterRel.toLowerCase()))
            ).map(r => ({
                source: r.sourceId,
                target: r.targetId,
                type: r.type
            }))

            if (hideDisconnected) {
                filteredEntries = filteredEntries.filter(e => cleanEdges.some(edge => edge.source === e.id || edge.target === e.id))
            }

            const nodeMap = filteredEntries.map((e, i) => ({
                id: e.id,
                name: e.name,
                x: (width / 2) + Math.cos((i / filteredEntries.length) * 2 * Math.PI) * (height / 2.5),
                y: (height / 2) + Math.sin((i / filteredEntries.length) * 2 * Math.PI) * (height / 2.5)
            }))

            setNodes(nodeMap)
            setEdges(cleanEdges)
        }

        buildGraph()
    }, [activeProjectId, filterType, filterTag, filterRel, hideDisconnected])

    return (
        <div className="spike-section" style={{ marginTop: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Network size={18} /> Relationship Topology Graph</h3>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.3rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }}>
                    <option value="">All Types</option>
                    <option value="Character">Character</option>
                    <option value="Location">Location</option>
                    <option value="Item">Item</option>
                </select>
                <input type="text" placeholder="Filter by Tag..." value={filterTag} onChange={e => setFilterTag(e.target.value)} style={{ padding: '0.3rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }} />
                <input type="text" placeholder="Filter Rel Type..." value={filterRel} onChange={e => setFilterRel(e.target.value)} style={{ padding: '0.3rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text)' }} />
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={hideDisconnected} onChange={e => setHideDisconnected(e.target.checked)} />
                    Hide Disconnected
                </label>
            </div>

            <div ref={containerRef} style={{ width: '100%', height: '400px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', position: 'relative', overflow: 'hidden' }}>

                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                    {edges.map((e, idx) => {
                        const source = nodes.find(n => n.id === e.source)
                        const target = nodes.find(n => n.id === e.target)
                        if (!source || !target) return null
                        return (
                            <g key={`edge-${idx}`}>
                                <line
                                    x1={source.x} y1={source.y}
                                    x2={target.x} y2={target.y}
                                    stroke="var(--color-border)"
                                    strokeWidth="2"
                                />
                                <text
                                    x={(source.x + target.x) / 2}
                                    y={(source.y + target.y) / 2 - 5}
                                    fill="var(--color-text-muted)"
                                    fontSize="10"
                                    textAnchor="middle"
                                >
                                    {e.type}
                                </text>
                            </g>
                        )
                    })}
                </svg>

                {nodes.map(n => (
                    <div key={n.id} style={{
                        position: 'absolute',
                        left: n.x,
                        top: n.y,
                        transform: 'translate(-50%, -50%)',
                        background: 'var(--color-surface)',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        border: '2px solid var(--color-primary)',
                        color: 'var(--color-text)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                        cursor: 'pointer',
                        zIndex: 10
                    }}>
                        {n.name}
                    </div>
                ))}

                {nodes.length === 0 && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--color-text-muted)' }}>
                        No entries found to map.
                    </div>
                )}
            </div>
        </div>
    )
}
