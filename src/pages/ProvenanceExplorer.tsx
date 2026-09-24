import { useEffect, useState } from 'react'
import { db } from '../db/database'
import { Microscope, Search, GitCommit, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function ProvenanceExplorer() {
    const [entries, setEntries] = useState<any[]>([])
    const [selectedEntryId, setSelectedEntryId] = useState<string>('')
    const [fieldValues, setFieldValues] = useState<any[]>([])
    const [selectedFieldId, setSelectedFieldId] = useState<string>('')
    const [trajectory, setTrajectory] = useState<any[]>([])

    useEffect(() => {
        // Load all entities globally
        db.bibleEntries.toArray().then(docs => {
            const sorted = docs.sort((a, b) => a.name.localeCompare(b.name))
            setEntries(sorted)
        })
    }, [])

    useEffect(() => {
        if (!selectedEntryId) {
            setFieldValues([])
            return
        }
        db.fieldValues.where({ entryId: selectedEntryId }).toArray().then(setFieldValues)
    }, [selectedEntryId])

    useEffect(() => {
        if (!selectedFieldId) {
            setTrajectory([])
            return
        }

        const buildTrajectory = async () => {
            const field = fieldValues.find(f => f.id === selectedFieldId)
            if (!field) return

            // Query provenance array
            const scenes = await Promise.all(
                (field.provenance || []).map(async (sceneId: string) => {
                    const sc = await db.scenes.get(sceneId)
                    return sc ? { ...sc, type: 'Provenance Block' } : null
                })
            )

            const compactPath = scenes.filter(s => s !== null).sort((a: any, b: any) => a.sortOrder - b.sortOrder)
            setTrajectory([
                { action: 'Creation / Injection', time: field.createdAt, boundary: 'Canon' },
                ...compactPath,
                { action: 'Current Bound State', validFrom: field.validFrom, validUntil: field.validUntil }
            ])
        }

        buildTrajectory()
    }, [selectedFieldId, fieldValues])

    const formatBound = (pos: any) => pos ? `Sequence ${pos.sequence}` : 'Eternal'

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <Link to="/" className="btn">Back to Dashboard</Link>
                <div style={{ flex: 1, textAlign: 'right' }}>
                    <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: '0.8rem', margin: 0 }}><Microscope size={28} /> Provenance Explorer</h1>
                    <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Query the exact trajectory of a single FieldValue across its historical execution.</p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>

                {/* Search Target Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="spike-section">
                        <label htmlFor="global-bible-query" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', display: 'block' }}><Search size={14} /> Global Bible Query</label>
                        <select
                            id="global-bible-query"
                            aria-label="Select an Entity Focus"
                            className="input"
                            value={selectedEntryId}
                            onChange={e => { setSelectedEntryId(e.target.value); setSelectedFieldId('') }}
                            style={{ width: '100%', padding: '0.6rem' }}
                        >
                            <option value="">Select an Entity Focus...</option>
                            {entries.map(e => <option key={e.id} value={e.id}>{e.name} ({e.type})</option>)}
                        </select>
                    </div>

                    {selectedEntryId && (
                        <div className="spike-section">
                            <h4 style={{ margin: '0 0 1rem 0' }}>Fact Variables (FieldValues)</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {fieldValues.length === 0 ? <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No explicit fields mapped.</div> : null}
                                {fieldValues.map(f => (
                                    <button
                                        key={f.id}
                                        onClick={() => setSelectedFieldId(f.id)}
                                        style={{
                                            textAlign: 'left',
                                            padding: '0.6rem',
                                            background: selectedFieldId === f.id ? 'var(--color-primary)' : 'var(--color-surface)',
                                            color: selectedFieldId === f.id ? '#fff' : 'var(--color-text)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <strong>{f.fieldKey}</strong>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {typeof f.value === 'string' ? f.value : JSON.stringify(f.value)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Trajectory Canvas */}
                <div className="spike-section" style={{ background: 'var(--color-bg)' }}>
                    {selectedFieldId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {trajectory.map((step, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: '2rem' }}>
                                    {/* Trajectory Axis */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <GitCommit size={14} color="#fff" />
                                        </div>
                                        {idx < trajectory.length - 1 && <div style={{ width: '2px', height: '100%', background: 'var(--color-border)', minHeight: '40px' }} />}
                                    </div>

                                    {/* Execution Node */}
                                    <div style={{ paddingBottom: '2rem', flex: 1 }}>
                                        {step.action === 'Creation / Injection' ? (
                                            <div style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--color-primary)' }}>
                                                <strong style={{ color: 'var(--color-primary)' }}>Origin Mutation</strong>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Created at {new Date(step.time).toLocaleString()}</div>
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>The explicit value was committed structurally into local DB state.</div>
                                            </div>
                                        ) : step.action === 'Current Bound State' ? (
                                            <div style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                                <strong>Current Active Chronology Bound</strong>
                                                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                                    <div><span style={{ color: 'var(--color-text-muted)' }}>Start:</span> {formatBound(step.validFrom)}</div>
                                                    <div><ArrowRight size={14} color="var(--color-text-muted)" /></div>
                                                    <div><span style={{ color: 'var(--color-text-muted)' }}>End:</span> {formatBound(step.validUntil)}</div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                                                <strong>Referenced executing inside: {step.name}</strong>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Scene Sequence {step.sortOrder}</div>
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                                                    This Fact was directly queried, utilized, or confirmed within the canonical text boundary of this Scene.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                            <h2>Select a Fact to Trace Execution</h2>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}
