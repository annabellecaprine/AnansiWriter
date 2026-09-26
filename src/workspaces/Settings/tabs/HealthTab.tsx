import React, { useState, useEffect } from 'react'
import { Database } from 'lucide-react'
import { db } from '../../../db/database'

export function HealthTab() {
    const [stats, setStats] = useState({
        projects: 0,
        scenes: 0,
        bibleEntries: 0,
        assets: 0,
        revisions: 0,
        snapshotsCount: 0
    })
    const [historyMaxCount, setHistoryMaxCount] = useState<number>(500)
    const [historyMaxAgeDays, setHistoryMaxAgeDays] = useState<number>(90)
    const [historyMaxSizeMb, setHistoryMaxSizeMb] = useState<number>(50)
    const [metadataOnlyHistory, setMetadataOnlyHistory] = useState<boolean>(false)
    const [saveSuccess, setSaveSuccess] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        const maxCount = await db.appSettings.get('history_max_count')
        const maxAge = await db.appSettings.get('history_max_age_days')
        const maxSize = await db.appSettings.get('history_max_size_mb')
        const metaOnly = await db.appSettings.get('history_metadata_only')

        if (maxCount) setHistoryMaxCount(Number(maxCount.value))
        if (maxAge) setHistoryMaxAgeDays(Number(maxAge.value))
        if (maxSize) setHistoryMaxSizeMb(Number(maxSize.value))
        if (metaOnly) setMetadataOnlyHistory(metaOnly.value === 'true')

        const projectCount = await db.series.count()
        const sceneCount = await db.scenes.count()
        const bibleCount = await db.bibleEntries.count()
        const assetCount = await db.assets.count()
        const revisionCount = await db.sceneRevisions.count()
        const snapshotCount = await db.snapshots.count()

        setStats({
            projects: projectCount,
            scenes: sceneCount,
            bibleEntries: bibleCount,
            assets: assetCount,
            revisions: revisionCount,
            snapshotsCount: snapshotCount
        })
    }

    const handleSaveRetention = async () => {
        await db.appSettings.put({ key: 'history_max_count', value: String(historyMaxCount), updatedAt: Date.now() })
        await db.appSettings.put({ key: 'history_max_age_days', value: String(historyMaxAgeDays), updatedAt: Date.now() })
        await db.appSettings.put({ key: 'history_max_size_mb', value: String(historyMaxSizeMb), updatedAt: Date.now() })
        await db.appSettings.put({ key: 'history_metadata_only', value: String(metadataOnlyHistory), updatedAt: Date.now() })

        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Database Health Counters */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)' }}>
                    <Database size={20} /> IndexedDB Entity Counters
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                    <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Projects</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.projects}</div>
                    </div>
                    <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Scenes</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.scenes}</div>
                    </div>
                    <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Bible Entries</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.bibleEntries}</div>
                    </div>
                    <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Binary Assets</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.assets}</div>
                    </div>
                    <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Scene Revisions</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.revisions}</div>
                    </div>
                    <div style={{ background: 'var(--color-bg)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Recovery Snapshots</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.snapshotsCount}</div>
                    </div>
                </div>
            </div>

            {/* AI History Retention Settings (AIH-001 - AIH-004) */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0' }}>AI Request History Retention Policies (AIH-001 – AIH-004)</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                    Configure auto-pruning limits for stored AI request payloads and metadata.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Max Request Log Count</label>
                        <input
                            type="number"
                            className="input"
                            style={{ width: '100%' }}
                            value={historyMaxCount}
                            onChange={e => setHistoryMaxCount(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Max Log Retention (Days)</label>
                        <input
                            type="number"
                            className="input"
                            style={{ width: '100%' }}
                            value={historyMaxAgeDays}
                            onChange={e => setHistoryMaxAgeDays(Number(e.target.value))}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Max History Storage (MB)</label>
                        <input
                            type="number"
                            className="input"
                            style={{ width: '100%' }}
                            value={historyMaxSizeMb}
                            onChange={e => setHistoryMaxSizeMb(Number(e.target.value))}
                        />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                        <input
                            type="checkbox"
                            checked={metadataOnlyHistory}
                            onChange={e => setMetadataOnlyHistory(e.target.checked)}
                        />
                        <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Metadata Only (Do not store full completion strings)</label>
                    </div>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn primary" onClick={handleSaveRetention}>
                        Save Retention Policies
                    </button>
                    {saveSuccess && (
                        <span style={{ color: '#28a745', fontSize: '0.85rem' }}>Policies updated!</span>
                    )}
                </div>
            </div>
        </div>
    )
}
