import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackupService } from '../../../services/BackupService'
import { confirmAlert, confirmAction } from '../../../store/dialogStore'
import { Download, Upload, AlertTriangle, Loader2, Layers } from 'lucide-react'
import { ImportProjectModal } from '../../../components/shared/ImportProjectModal'
import { useWorkspaceStore } from '../../../store/workspaceStore'

export function BackupTab() {
    const navigate = useNavigate()
    const { setActiveNovel } = useWorkspaceStore()
    const [isExporting, setIsExporting] = useState(false)
    const [isRestoring, setIsRestoring] = useState(false)
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
    const [progressStatus, setProgressStatus] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleExport = async () => {
        if (isExporting || isRestoring) return
        setIsExporting(true)
        setProgressStatus('Serializing entire database (this may take a moment)...')

        try {
            const blob = await BackupService.exportFullSystem((progress) => {
                setProgressStatus(`Exporting: ${progress.completedRows} rows processed...`)
                return true
            })

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url

            const date = new Date()
            const pad = (n: number) => n.toString().padStart(2, '0')
            const timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`

            a.download = `anansi_backup_${timestamp}.json`
            a.click()
            URL.revokeObjectURL(url)
        } catch (err: any) {
            await confirmAlert({
                title: 'Export Failed',
                message: err.message || 'An error occurred during export.'
            })
        } finally {
            setIsExporting(false)
            setProgressStatus('')
        }
    }

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsRestoring(true)
        setProgressStatus('Reading backup metadata...')

        try {
            const meta = await BackupService.peakBackupMetadata(file)

            if (meta?.data?.databaseName !== 'AnansiWriterDB') {
                throw new Error('This file does not appear to be a valid AnansiWriter backup (missing database schema tags).')
            }

            const confirmed = await confirmAction({
                title: 'Restore Full Backup',
                message: `Are you sure you want to restore this backup? This operation is DESTRUCTIVE and will permanently replace all current local AnansiWriter data!\n\nBackup Metadata:\n- Tables: ${meta.data.tables.length}\n- Dexie Export Format Version: ${meta.formatVersion}`,
                confirmLabel: 'Yes, Replace Data',
                cancelLabel: 'Cancel',
                isDestructive: true
            })

            if (!confirmed) {
                if (fileInputRef.current) fileInputRef.current.value = ''
                return
            }

            setProgressStatus('Restoring database (clearing existing tables)...')

            await BackupService.restoreBackup(file, (progress) => {
                setProgressStatus(`Restoring: ${progress.completedRows} rows restored...`)
                return true
            })

            // Hard reload upon complete success!
            window.location.reload()

        } catch (err: any) {
            await confirmAlert({
                title: 'Restore Failed',
                message: err.message || 'The backup file is invalid or corrupted.'
            })
            if (fileInputRef.current) fileInputRef.current.value = ''
        } finally {
            setIsRestoring(false)
            setProgressStatus('')
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
            <div>
                <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-accent)' }}>Full System Backup</h2>
                <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                    Securely export and restore all AnansiWriter local data into a portable backup file, including text, media assets, codex entries, and prompts. API Secret Keys are strictly excluded from backups for your security.
                </p>
            </div>

            <div className="surface-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--color-info)' }}>
                <div>
                    <h3 style={{ margin: '0 0 0.25rem 0' }}>Export Full Backup</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        Creates a portable backup of all AnansiWriter data except API keys and authentication secrets.
                    </p>
                </div>

                <div>
                    <button
                        className="btn primary"
                        onClick={handleExport}
                        disabled={isExporting || isRestoring}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                        {isExporting ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
                        {isExporting ? 'Exporting...' : 'Export Full Backup'}
                    </button>
                </div>
            </div>

            <div className="surface-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--color-danger)' }}>
                <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-danger)' }}>Restore Full Backup</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        Replaces all local AnansiWriter data with the contents of a previous backup. This will permanently overwrite current content!
                    </p>
                </div>

                <div>
                    <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        disabled={isExporting || isRestoring}
                    />
                    <button
                        className="btn outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isExporting || isRestoring}
                    >
                        {isRestoring ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                        {isRestoring ? 'Restoring...' : 'Choose Backup File'}
                    </button>
                </div>
            </div>

            {(isExporting || isRestoring) && progressStatus && (
                <div style={{ padding: '1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Loader2 size={18} className="spin" color="var(--color-accent)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{progressStatus}</span>
                </div>
            )}

            <div className="surface-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid var(--color-accent)' }}>
                <div>
                    <h3 style={{ margin: '0 0 0.25rem 0', color: 'var(--color-accent)' }}>Single Project Archive Import</h3>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                        Looking to import a standalone novel or series archive (<code>.storyproject</code> / <code>.zip</code>) instead of overwriting your entire database? Use the project archive importer with duplicate collision protection.
                    </p>
                </div>
                <div>
                    <button
                        className="btn outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={() => setIsProjectModalOpen(true)}
                    >
                        <Layers size={16} /> Import Project Archive (.storyproject / .zip)
                    </button>
                </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '1rem', color: 'var(--color-danger)' }}>
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }}>
                    <strong>Warning:</strong> Restoring a full database backup is a destructive action that completely replaces your active workspace cache. You will lose any un-exported drafts or stories. Upon completion, the application will forcefully reload to reset application state correctly.
                </p>
            </div>

            <ImportProjectModal
                isOpen={isProjectModalOpen}
                onClose={() => setIsProjectModalOpen(false)}
                onProjectImported={(novelId) => {
                    setActiveNovel(novelId);
                    navigate(`/novel/${novelId}/write`);
                }}
                onSystemRestored={() => {
                    window.location.reload();
                }}
            />
        </div>
    )
}
