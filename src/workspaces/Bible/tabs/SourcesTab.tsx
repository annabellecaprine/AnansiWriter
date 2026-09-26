import { useMemo, useState } from 'react'
import ReferencedByPanel from '../ReferencedByPanel'
import { BookOpen, ExternalLink } from 'lucide-react'
import { BibleService } from '../../../services/BibleService'

export default function SourcesTab({ entry, fields, onUpdated }: { entry: any, fields: any[], onUpdated: () => void }) {
    const [notes, setNotes] = useState(entry.researchNotes || '')

    const handleSaveNotes = async () => {
        if (notes !== entry.researchNotes) {
            await BibleService.updateEntry(entry.novelId, entry.id, { researchNotes: notes })
            onUpdated()
        }
    }

    // Aggregate provenance data across all fields
    const factsWithProvenance = useMemo(() => {
        return fields.filter(f => f.provenance && f.provenance.length > 0)
    }, [fields])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', maxWidth: '800px' }}>

            {/* External References / Research Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ExternalLink size={18} /> Research Notes & External References
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Store external links, historical context, or general research notes that inform this entry.
                </p>
                <textarea
                    className="input"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleSaveNotes}
                    placeholder="E.g., Based on 19th-century locomotive schematics... Link: https://wikipedia..."
                    style={{ minHeight: '150px', resize: 'vertical', fontSize: '0.9rem', padding: '0.75rem', lineHeight: '1.5' }}
                />
            </div>

            {/* Field-level Provenance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={18} /> Established Facts (Provenance)
                </h3>

                {factsWithProvenance.length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No fields explicitly establish provenance to a source scene.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {factsWithProvenance.map(f => (
                            <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>{f.fieldKey}: <span style={{ fontWeight: 400 }}>{f.value}</span></span>
                                    <span className="status-badge">{f.state}</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.5rem' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Sources:</span>
                                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
                                        {f.provenance.map((provId: string) => (
                                            <li key={provId}>
                                                <a href={`#/writing/${provId}`} style={{ color: 'var(--color-accent)', textDecoration: 'none' }}>
                                                    Source ID: {provId.slice(0, 8)}...
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* General Referenced By extraction panel  */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '2rem' }}>
                <h3 style={{ margin: 0 }}>Reference Extraction</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', margin: 0 }}>
                    Scenes mapped automatically by explicitly linking this entity or through heuristic queue confirmations.
                </p>
                <ReferencedByPanel entryId={entry.id} novelId={entry.novelId || ''} />
            </div>

        </div>
    )
}
