import { useState, useEffect, useRef } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { db } from '../../db/database'
import { AssetService } from '../../services/AssetService'
import { Image as ImageIcon, Upload, Trash2, Link as LinkIcon, Search, Eye, FileText, X } from 'lucide-react'

export default function AssetsWorkspace() {
    const { activeProjectId } = useWorkspaceStore()
    const [assets, setAssets] = useState<any[]>([])
    const [assetLinks, setAssetLinks] = useState<any[]>([])
    const [bibleEntries, setBibleEntries] = useState<any[]>([])
    const [scenes, setScenes] = useState<any[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [previewAsset, setPreviewAsset] = useState<any | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [dragOver, setDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Load assets and metadata
    const loadData = async () => {
        if (!activeProjectId) {
            setAssets([])
            return
        }

        const projectAssets = await db.assets.where({ projectId: activeProjectId }).toArray()
        const projectLinks = await db.assetLinks.where({ projectId: activeProjectId }).toArray()
        const entries = await db.bibleEntries.where({ projectId: activeProjectId }).toArray()
        const projectScenes = await db.scenes.where({ projectId: activeProjectId }).toArray()

        setAssets(projectAssets.sort((a, b) => b.createdAt - a.createdAt))
        setAssetLinks(projectLinks)
        setBibleEntries(entries)
        setScenes(projectScenes)
    }

    useEffect(() => {
        loadData()
    }, [activeProjectId])

    // Generate Object URLs for asset previews
    const [objectUrls, setObjectUrls] = useState<Record<string, string>>({})

    useEffect(() => {
        const urls: Record<string, string> = {}
        assets.forEach(asset => {
            if (asset.blob && asset.mimeType?.startsWith('image/')) {
                urls[asset.id] = URL.createObjectURL(asset.blob)
            }
        })
        setObjectUrls(urls)

        return () => {
            Object.values(urls).forEach(url => URL.revokeObjectURL(url))
        }
    }, [assets])

    const handleFileUpload = async (files: FileList | File[]) => {
        if (!activeProjectId || files.length === 0) return
        setIsUploading(true)

        try {
            for (let i = 0; i < files.length; i++) {
                await AssetService.uploadAsset(activeProjectId, files[i])
            }
            await loadData()
        } catch (err) {
            console.error('Asset upload failed:', err)
        } finally {
            setIsUploading(false)
        }
    }

    const handleDeleteAsset = async (assetId: string) => {
        if (!confirm('Are you sure you want to delete this asset?')) return
        await db.assets.delete(assetId)
        await db.assetLinks.where({ assetId }).delete()
        if (previewAsset?.id === assetId) {
            setPreviewAsset(null)
            setPreviewUrl(null)
        }
        await loadData()
    }

    const formatSize = (bytes: number) => {
        if (!bytes) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    const filteredAssets = assets.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.mimeType.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!activeProjectId) {
        return (
            <div className="workspace-view" style={{ padding: '2rem', textAlign: 'center' }}>
                <ImageIcon size={48} color="var(--color-text-muted)" style={{ marginBottom: '1rem' }} />
                <h2>No Active Project Selected</h2>
                <p style={{ color: 'var(--color-text-muted)' }}>Please select or create a project from the Project Dashboard to view and manage assets.</p>
            </div>
        )
    }

    return (
        <div className="workspace-view" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <ImageIcon size={28} color="var(--color-primary)" /> Project Asset Library
                    </h1>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                        Manage images, documents, and visual references bound to your story universe.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ position: 'relative', width: '250px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Filter assets..."
                            className="input"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ paddingLeft: '2.25rem', width: '100%' }}
                            aria-label="Filter Assets"
                        />
                    </div>
                    <button
                        className="btn primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        aria-label="Upload Assets"
                    >
                        <Upload size={16} /> {isUploading ? 'Uploading...' : 'Upload Assets'}
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={e => e.target.files && handleFileUpload(e.target.files)}
                        multiple
                        style={{ display: 'none' }}
                    />
                </div>
            </header>

            {/* Drop Zone */}
            <div
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                    e.preventDefault()
                    setDragOver(false)
                    if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files)
                }}
                style={{
                    border: `2px dashed ${dragOver ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.5rem',
                    textAlign: 'center',
                    marginBottom: '2rem',
                    background: dragOver ? 'rgba(var(--color-primary-rgb), 0.05)' : 'var(--color-surface)',
                    transition: 'all 0.2s ease'
                }}
            >
                <Upload size={24} color="var(--color-text-muted)" style={{ marginBottom: '0.5rem' }} />
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    Drag and drop files here, or click <strong>Upload Assets</strong> above.
                </p>
            </div>

            {/* Asset Grid */}
            {filteredAssets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                    <ImageIcon size={36} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <p style={{ margin: 0 }}>No assets found matching your criteria.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
                    {filteredAssets.map(asset => {
                        const url = objectUrls[asset.id]
                        const isImage = asset.mimeType?.startsWith('image/')
                        const links = assetLinks.filter(l => l.assetId === asset.id)

                        return (
                            <div
                                key={asset.id}
                                style={{
                                    background: 'var(--color-surface)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--color-border)',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                                }}
                            >
                                {/* Thumbnail Container */}
                                <div style={{ height: '160px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                    {isImage && url ? (
                                        <img
                                            src={url}
                                            alt={asset.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <FileText size={48} color="var(--color-text-muted)" />
                                    )}

                                    <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                                        {url && (
                                            <button
                                                className="btn"
                                                onClick={() => { setPreviewAsset(asset); setPreviewUrl(url) }}
                                                style={{ padding: '0.35rem', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff' }}
                                                title="Preview Asset"
                                                aria-label="Preview Asset"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        )}
                                        <button
                                            className="btn"
                                            onClick={() => handleDeleteAsset(asset.id)}
                                            style={{ padding: '0.35rem', background: 'rgba(220,53,69,0.8)', border: 'none', color: '#fff' }}
                                            title="Delete Asset"
                                            aria-label="Delete Asset"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Details */}
                                <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={asset.name}>
                                            {asset.name}
                                        </h4>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span>{formatSize(asset.sizeBytes)}</span>
                                            <span>{new Date(asset.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {/* Linkage Badges */}
                                    <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.25rem' }}>
                                            <LinkIcon size={12} /> Linked Entities ({links.length}):
                                        </div>
                                        {links.length === 0 ? (
                                            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Unlinked</span>
                                        ) : (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {links.map(link => {
                                                    const entry = bibleEntries.find(e => e.id === link.targetId)
                                                    const scene = scenes.find(s => s.id === link.targetId)
                                                    const label = entry ? entry.name : scene ? scene.title : 'Entity'
                                                    return (
                                                        <span
                                                            key={link.id}
                                                            style={{
                                                                fontSize: '0.7rem',
                                                                background: 'var(--color-bg)',
                                                                border: '1px solid var(--color-border)',
                                                                padding: '0.1rem 0.4rem',
                                                                borderRadius: '3px'
                                                            }}
                                                        >
                                                            {label}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Preview Modal */}
            {previewAsset && previewUrl && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', maxWidth: '90vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>{previewAsset.name}</h3>
                            <button className="btn" onClick={() => { setPreviewAsset(null); setPreviewUrl(null) }} style={{ padding: '0.25rem' }} aria-label="Close Preview">
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ padding: '1rem', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto' }}>
                            <img src={previewUrl} alt={previewAsset.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
