import { useState } from 'react'
import { DocxImportService } from '../../services/DocxImportService'
import { db } from '../../db/database'
import { FileUp, CheckCircle, XCircle } from 'lucide-react'
import { confirmAlert } from '../../store/dialogStore'

export default function DocxImportModal({ novelId, onClose }: { novelId: string, onClose: () => void }) {
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<any[] | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0]
        if (!selected) return
        setFile(selected)
        setLoading(true)
        setError('')
        try {
            const result = await DocxImportService.importDocxToTipTap(selected)
            if (result.type !== 'doc') {
                setError('Invalid parse result from mammoth.')
                return
            }
            setPreview(result.content || [])
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const applyData = async () => {
        if (!preview) return
        try {
            setLoading(true)
            // Just drop the parsed content into a single imported scene for now, 
            // mimicking standard transactional safe-adds. 
            // In a deeper split mode, we'd parse Heading 1s into chapters.
            await db.scenes.add({
                id: crypto.randomUUID(),
                novelId,
                chapterId: 'imported',
                name: file?.name.replace('.docx', '') || 'Imported Word Doc',
                content: { type: 'doc', content: preview },
                status: 'Draft',
                wordCount: 0,
                notes: 'Imported via DOCX sandbox',
                sortOrder: 9999,
                createdAt: Date.now(),
                updatedAt: Date.now()
            })
            await confirmAlert({
                title: 'Import Successful',
                message: 'Successfully transacted imported DOCX nodes into the database.'
            })
            onClose()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--color-surface)', width: '700px', maxHeight: '80vh', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0 }}><FileUp /> Word Document Sandbox</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }} aria-label="Close"><XCircle /></button>
                </header>

                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {!preview ? (
                        <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>Select a .docx file to preview its Abstract Syntax Tree prior to transactional mapping.</p>
                            <input type="file" accept=".docx" onChange={handleFileChange} disabled={loading} style={{ marginTop: '1rem' }} />
                            {loading && <p>Parsing with Mammoth.js...</p>}
                            {error && <p style={{ color: 'var(--color-warning)' }}>{error}</p>}
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                                <div>
                                    <strong>{file?.name}</strong>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{preview.length} root nodes detected</div>
                                </div>
                                <button className="btn active" onClick={applyData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-accent)', color: '#fff' }}><CheckCircle size={16} /> Transactional Apply</button>
                            </div>

                            <div style={{ background: '#000', padding: '1rem', borderRadius: 'var(--radius-sm)', overflowX: 'auto', fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                {JSON.stringify(preview, null, 2)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
