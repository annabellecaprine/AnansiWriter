import React, { useState, useEffect } from 'react'
import { Camera, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { db } from '../../../db/database'
import { SnapshotService } from '../../../services/SnapshotService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { confirmAction, confirmAlert, promptInput } from '../../../store/dialogStore'
import type { Snapshot } from '../../../db/schema'

export function SnapshotsTab() {
    const { activeNovelId } = useWorkspaceStore()
    const [snapshots, setSnapshots] = useState<Snapshot[]>([])
    const [backupCadenceDays, setBackupCadenceDays] = useState<number>(7)
    const [saveSuccess, setSaveSuccess] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    useEffect(() => {
        if (activeNovelId) {
            loadSnapshots(activeNovelId)
        }
    }, [activeNovelId])

    const loadSettings = async () => {
        const cadence = await db.appSettings.get('backup_cadence_days')
        if (cadence) setBackupCadenceDays(Number(cadence.value))
    }

    const loadSnapshots = async (novelId: string) => {
        const list = await SnapshotService.getSnapshots(novelId)
        setSnapshots(list)
    }

    const handleCreateSnapshot = async () => {
        if (!activeNovelId) {
            await confirmAlert({
                title: 'No Active Project',
                message: 'Please open a project first before creating a snapshot.',
                isDestructive: true
            })
            return
        }

        const name = await promptInput({
            title: 'Create Recovery Snapshot',
            message: 'Enter a label or title for this recovery snapshot:',
            placeholder: 'Pre-edit backup'
        })

        if (name) {
            await SnapshotService.createManualSnapshot(activeNovelId, name, 'manual')
            await loadSnapshots(activeNovelId)
            await confirmAlert({
                title: 'Snapshot Created',
                message: 'Manual recovery checkpoint successfully saved.'
            })
        }
    }

    const handleRestoreSnapshot = async (snapshotId: string, name: string) => {
        const confirm = await confirmAction({
            title: 'Restore Project Snapshot',
            message: `Restoring "${name}" will overwrite current project data with the snapshot state. Are you sure you want to proceed?`,
            isDestructive: true,
            confirmLabel: 'Restore Snapshot'
        })

        if (confirm) {
            await SnapshotService.restoreSnapshot(snapshotId)
            await confirmAlert({
                title: 'Snapshot Restored',
                message: 'Project data restored successfully!'
            })
            window.location.reload()
        }
    }

    const handleDeleteSnapshot = async (snapshotId: string) => {
        const confirm = await confirmAction({
            title: 'Delete Snapshot',
            message: 'Permanently remove this recovery checkpoint?',
            isDestructive: true
        })

        if (confirm) {
            await SnapshotService.deleteSnapshot(snapshotId)
            if (activeNovelId) await loadSnapshots(activeNovelId)
        }
    }

    const handleSaveCadence = async () => {
        await db.appSettings.put({ key: 'backup_cadence_days', value: String(backupCadenceDays), updatedAt: Date.now() })
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)' }}>
                            <Camera size={20} /> Action-Based Recovery Snapshots
                        </h3>
                        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                            Action snapshots protect against destructive operations, bulk edits, or schema migrations.
                        </p>
                    </div>
                    <button className="btn primary" onClick={handleCreateSnapshot} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Plus size={16} /> Create Manual Snapshot
                    </button>
                </div>

                {/* Snapshots List */}
                {snapshots.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        No recovery snapshots recorded for the current project.
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {snapshots.map(s => (
                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                        Reason: <span style={{ textTransform: 'capitalize' }}>{s.reason}</span> • Saved: {new Date(s.createdAt).toLocaleString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn secondary" onClick={() => handleRestoreSnapshot(s.id, s.name)} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}>
                                        <RotateCcw size={14} /> Restore
                                    </button>
                                    <button className="btn icon-only secondary" title="Delete Snapshot" onClick={() => handleDeleteSnapshot(s.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Backup Cadence Warning Setting */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>Backup Warning Cadence (PORT-014)</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Configure how often the application reminds you to create a full `.storyproject` ZIP backup export.
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Backup Warning Threshold (Days):</label>
                    <input
                        type="number"
                        className="input"
                        style={{ width: '100px' }}
                        value={backupCadenceDays}
                        onChange={e => setBackupCadenceDays(Number(e.target.value))}
                    />
                    <button className="btn primary" onClick={handleSaveCadence}>Save Cadence</button>
                    {saveSuccess && <span style={{ color: '#28a745', fontSize: '0.85rem' }}>Saved!</span>}
                </div>
            </div>
        </div>
    )
}
