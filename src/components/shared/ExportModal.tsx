import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import type { Book } from '../../db/schema'
import { ExportService } from '../../services/ExportService'
import { EpubService } from '../../services/EpubService'
import { PdfService } from '../../services/PdfService'
import { CryptoService } from '../../services/CryptoService'
import { XCircle, Download, Lock } from 'lucide-react'

export default function ExportModal({ projectId, projectName, onClose }: { projectId: string, projectName: string, onClose: () => void }) {
    const [books, setBooks] = useState<Book[]>([])
    const [format, setFormat] = useState<'storyproject' | 'epub' | 'pdf'>('storyproject')
    const [targetBookId, setTargetBookId] = useState<string>('all')
    const [password, setPassword] = useState('')
    const [isEncrypted, setIsEncrypted] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const load = async () => {
            const b = await db.books.where({ projectId }).toArray()
            setBooks(b)
        }
        load()
    }, [projectId])

    const handleExport = async () => {
        setLoading(true)
        setError('')
        try {
            if (format === 'storyproject') {
                let blob = await ExportService.exportProject(projectId, targetBookId !== 'all' ? { books: [targetBookId] } : undefined)
                if (isEncrypted && password) {
                    blob = await CryptoService.encryptBlob(blob, password)
                }
                triggerDownload(blob, `${projectName.replace(/\\s+/g, '_')}${targetBookId !== 'all' ? `_Book` : ''}.storyproject`)
            } else if (format === 'epub') {
                if (targetBookId === 'all' && books.length > 0) {
                    // If 'all' is selected and there are multiple books, we will just export the first one for now, 
                    // or ideally epub targets a single book struct.
                    // The prompt requires: "Entire Book export"
                    setError('Please select a specific Book to export as EPUB.')
                    setLoading(false)
                    return
                }
                const b = books.find(x => x.id === targetBookId)
                if (!b) throw new Error('Target book missing.')

                const blob = await EpubService.generateEpub(b.id, projectId, {
                    title: b.name,
                    author: 'Anansi Writer' // Could be requested via formal config UI
                })
                triggerDownload(blob, `${b.name.replace(/\\s+/g, '_')}.epub`)
            } else if (format === 'pdf') {
                if (targetBookId === 'all') {
                    setError('Please select a specific Book to export as PDF.')
                    setLoading(false)
                    return
                }
                const b = books.find(x => x.id === targetBookId)
                if (!b) throw new Error('Target book missing.')

                // Triggers native browser print-to-pdf pipeline
                await PdfService.generatePdf(b.id, projectId, { profile: 'manuscript' })
                onClose()
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const triggerDownload = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
        onClose()
    }

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--color-surface)', width: '500px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, color: 'var(--color-text)' }}>Advanced Export</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><XCircle /></button>
                </header>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Format</label>
                        <select className="input" value={format} onChange={e => setFormat(e.target.value as any)} style={{ width: '100%', padding: '0.6rem' }}>
                            <option value="storyproject">.storyproject (Archive / Backup)</option>
                            <option value="epub">.epub (Drafting / Reading)</option>
                            <option value="pdf">.pdf (Manuscript Printing)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Target</label>
                        <select className="input" value={targetBookId} onChange={e => setTargetBookId(e.target.value)} style={{ width: '100%', padding: '0.6rem' }}>
                            {format === 'storyproject' && <option value="all">Entire Project (All Books & Data)</option>}
                            {books.map(b => (
                                <option key={b.id} value={b.id}>Book: {b.name}</option>
                            ))}
                        </select>
                    </div>

                    {format === 'storyproject' && (
                        <div style={{ marginTop: '0.5rem', background: isEncrypted ? 'var(--color-bg)' : 'transparent', padding: isEncrypted ? '1rem' : '0', borderRadius: '4px', transition: 'all 0.2s' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={isEncrypted} onChange={e => { setIsEncrypted(e.target.checked); setPassword('') }} />
                                <Lock size={16} /> Password Encrypt Archive
                            </label>

                            {isEncrypted && (
                                <div style={{ marginTop: '1rem' }}>
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="Enter a strong password..."
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        style={{ width: '100%', padding: '0.6rem' }}
                                    />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem', marginBottom: '0' }}>
                                        Make sure you don't forget this! The password is required to open the project and cannot be recovered.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {error && <div style={{ color: 'var(--color-warning)', background: 'rgba(255,100,100,0.1)', padding: '0.8rem', borderRadius: '4px' }}>{error}</div>}

                    <button className="btn active" onClick={handleExport} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                        <Download size={16} /> {loading ? 'Processing...' : 'Generate Format'}
                    </button>
                </div>
            </div>
        </div>
    )
}
