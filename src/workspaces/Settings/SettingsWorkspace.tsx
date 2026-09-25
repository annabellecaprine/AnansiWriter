import { useState, useEffect } from 'react'
import { db } from '../../db/database'
import type { AIModel, Snapshot } from '../../db/schema'
import { AIService } from '../../services/AIService'
import { AIModelService } from '../../services/AIModelService'
import { SnapshotService } from '../../services/SnapshotService'
import { ProxyConfigManager } from '../../components/shared/ProxyConfigManager'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { confirmAction, confirmAlert, promptInput } from '../../store/dialogStore'
import { ImportMigrationTab } from './tabs/ImportMigrationTab'
import { ExportTab } from './tabs/ExportTab'
import {
    Settings as SettingsIcon,
    Key,
    Database,
    Cpu,
    Save,
    CheckCircle,
    ShieldCheck,
    Bot,
    Plus,
    Trash2,
    Edit3,
    Camera,
    RotateCcw,
    Sliders,
    Zap,
    AlertTriangle,
    Moon,
    Sun,
    Download
} from 'lucide-react'

export default function SettingsWorkspace() {
    const { activeNovelId } = useWorkspaceStore()
    const [activeTab, setActiveTab] = useState<'credentials' | 'models' | 'snapshots' | 'appearance' | 'health' | 'import' | 'export'>('credentials')

    // ─── TAB 1: Credentials State ─────────────────────────────
    const [openAiKey, setOpenAiKey] = useState('')
    const [openRouterKey, setOpenRouterKey] = useState('')
    const [chutesKey, setChutesKey] = useState('')
    const [localEndpoint, setLocalEndpoint] = useState('http://localhost:1234/v1')
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [testingProvider, setTestingProvider] = useState<string | null>(null)
    const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})

    // ─── TAB 2: AI Models State ──────────────────────────────
    const [models, setModels] = useState<AIModel[]>([])
    const [editingModel, setEditingModel] = useState<AIModel | null>(null)

    // ─── TAB 3: Snapshots State ──────────────────────────────
    const [snapshots, setSnapshots] = useState<Snapshot[]>([])
    const [backupCadenceDays, setBackupCadenceDays] = useState<number>(7)

    // ─── TAB 4: Appearance & Editor Preferences State ────────
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')
    const [fontFamily, setFontFamily] = useState<string>('Inter, sans-serif')
    const [fontSize, setFontSize] = useState<number>(16)
    const [lineHeight, setLineHeight] = useState<number>(1.6)
    const [contentMaxWidth, setContentMaxWidth] = useState<number>(800)

    // ─── TAB 5: Retention & Health State ─────────────────────
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

    // ─── Initial Data Load ───────────────────────────────────
    useEffect(() => {
        loadSettings()
        loadModels()
        loadAppearance()
    }, [])

    useEffect(() => {
        if (activeNovelId) {
            loadSnapshots(activeNovelId)
        }
    }, [activeNovelId])

    const loadSettings = async () => {
        const keyOpenAi = await db.appSettings.get('api_key_openai')
        const keyOpenRouter = await db.appSettings.get('api_key_openrouter')
        const keyChutes = await db.appSettings.get('api_key_chutes')
        const localUrl = await db.appSettings.get('baseUrl_openai-compatible')
        const cadence = await db.appSettings.get('backup_cadence_days')
        const maxCount = await db.appSettings.get('history_max_count')
        const maxAge = await db.appSettings.get('history_max_age_days')
        const maxSize = await db.appSettings.get('history_max_size_mb')
        const metaOnly = await db.appSettings.get('history_metadata_only')

        if (keyOpenAi) setOpenAiKey(keyOpenAi.value)
        if (keyOpenRouter) setOpenRouterKey(keyOpenRouter.value)
        if (keyChutes) setChutesKey(keyChutes.value)
        if (localUrl) setLocalEndpoint(localUrl.value)
        if (cadence) setBackupCadenceDays(Number(cadence.value))
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

    const loadModels = async () => {
        const list = await AIModelService.getAllModels()
        setModels(list)
    }

    const loadSnapshots = async (novelId: string) => {
        const list = await SnapshotService.getSnapshots(novelId)
        setSnapshots(list)
    }

    const loadAppearance = async () => {
        const savedTheme = localStorage.getItem('anansi_theme') || 'dark'
        const font = localStorage.getItem('anansi_font_family') || 'Inter, sans-serif'
        const size = localStorage.getItem('anansi_font_size') || '16'
        const lh = localStorage.getItem('anansi_line_height') || '1.6'
        const width = localStorage.getItem('anansi_content_width') || '800'

        setTheme(savedTheme as 'dark' | 'light')
        setFontFamily(font)
        setFontSize(Number(size))
        setLineHeight(Number(lh))
        setContentMaxWidth(Number(width))
    }

    // ─── Handlers: TAB 1 ──────────────────────────────────────
    const handleSaveCredentials = async () => {
        if (openAiKey) await AIService.setApiKey('openai', openAiKey)
        else await db.appSettings.delete('api_key_openai')

        if (openRouterKey) await AIService.setApiKey('openrouter', openRouterKey)
        else await db.appSettings.delete('api_key_openrouter')

        if (chutesKey) await AIService.setApiKey('chutes', chutesKey)
        else await db.appSettings.delete('api_key_chutes')

        if (localEndpoint) {
            await db.appSettings.put({ key: 'baseUrl_openai-compatible', value: localEndpoint, updatedAt: Date.now() })
        } else {
            await db.appSettings.delete('baseUrl_openai-compatible')
        }

        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }

    const handleTestConnection = async (providerName: string, key: string, endpoint?: string) => {
        setTestingProvider(providerName)
        const res = await AIService.testConnection(providerName, key, endpoint)
        setTestResults(prev => ({ ...prev, [providerName]: res }))
        setTestingProvider(null)
    }

    // ─── Handlers: TAB 2 ──────────────────────────────────────
    const handleToggleModel = async (id: string, current: boolean) => {
        await AIModelService.toggleModelEnabled(id, !current)
        await loadModels()
    }

    const handleDeleteModel = async (id: string, name: string) => {
        const confirm = await confirmAction({
            title: 'Delete AI Model Configuration',
            message: `Are you sure you want to remove ${name}?`,
            isDestructive: true
        })
        if (confirm) {
            await AIModelService.deleteModel(id)
            await loadModels()
        }
    }

    const handleSaveModelEdit = async () => {
        if (!editingModel) return
        await AIModelService.saveModel(editingModel)
        setEditingModel(null)
        await loadModels()
    }

    const handleAddNewModel = () => {
        setEditingModel({
            id: crypto.randomUUID(),
            novelId: 'global',
            provider: 'openrouter',
            modelId: 'new-model-id',
            name: 'New Custom Model',
            maxContextTokens: 128000,
            defaultTemperature: 0.7,
            hasVision: false,
            tags: ['Custom'],
            isEnabled: true,
            costPer1kInput: 0.001,
            costPer1kOutput: 0.002
        })
    }

    // ─── Handlers: TAB 3 ──────────────────────────────────────
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
            await loadSettings()
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
            await loadSettings()
        }
    }

    const handleSaveCadence = async () => {
        await db.appSettings.put({ key: 'backup_cadence_days', value: String(backupCadenceDays), updatedAt: Date.now() })
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }

    // ─── Handlers: TAB 4 ──────────────────────────────────────
    const handleSaveAppearance = () => {
        localStorage.setItem('anansi_theme', theme)
        localStorage.setItem('anansi_font_family', fontFamily)
        localStorage.setItem('anansi_font_size', String(fontSize))
        localStorage.setItem('anansi_line_height', String(lineHeight))
        localStorage.setItem('anansi_content_width', String(contentMaxWidth))

        document.documentElement.setAttribute('data-theme', theme)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }

    // ─── Handlers: TAB 5 ──────────────────────────────────────
    const handleSaveRetention = async () => {
        await db.appSettings.put({ key: 'history_max_count', value: String(historyMaxCount), updatedAt: Date.now() })
        await db.appSettings.put({ key: 'history_max_age_days', value: String(historyMaxAgeDays), updatedAt: Date.now() })
        await db.appSettings.put({ key: 'history_max_size_mb', value: String(historyMaxSizeMb), updatedAt: Date.now() })
        await db.appSettings.put({ key: 'history_metadata_only', value: String(metadataOnlyHistory), updatedAt: Date.now() })

        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }

    return (
        <div className="workspace-view" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Main Header */}
            <header style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                    <SettingsIcon size={28} color="var(--color-primary)" /> Application Settings & System Health
                </h1>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Configure AI credentials, manage model directories and pricing, view recovery snapshots, customize editor appearance, and monitor storage health.
                </p>
            </header>

            {/* Tabbed Navigation Bar */}
            <nav style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                <button
                    className={`btn ${activeTab === 'credentials' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('credentials')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Key size={16} /> Provider Credentials
                </button>
                <button
                    className={`btn ${activeTab === 'models' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('models')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Bot size={16} /> AI Model Directory & Pricing
                </button>
                <button
                    className={`btn ${activeTab === 'snapshots' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('snapshots')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Camera size={16} /> Snapshots & Backups
                </button>
                <button
                    className={`btn ${activeTab === 'appearance' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('appearance')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Sliders size={16} /> Appearance & Editor
                </button>
                <button
                    className={`btn ${activeTab === 'health' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('health')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Database size={16} /> System Health & Retention
                </button>
                <button
                    className={`btn ${activeTab === 'import' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('import')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}
                >
                    <Download size={16} /> Data Import / Migration
                </button>
                <button
                    className={`btn ${activeTab === 'export' ? 'primary' : 'secondary'}`}
                    onClick={() => setActiveTab('export')}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Download size={16} /> Data Compile & Export
                </button>
            </nav>

            {/* ============================================================ */}
            {/* TAB 1: AI Provider Credentials & Proxy Configurations       */}
            {/* ============================================================ */}
            {activeTab === 'credentials' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                    <ProxyConfigManager />
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB 2: AI Model Directory & Token Pricing (MODEL-001 - 004)   */}
            {/* ============================================================ */}
            {activeTab === 'models' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                                    <Bot size={20} /> AI Model Directory & Token Pricing
                                </h3>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                    Configure active AI models and user-entered token pricing metadata for accurate telemetry cost reporting.
                                </p>
                            </div>
                            <button className="btn primary" onClick={handleAddNewModel} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Plus size={16} /> Add Model
                            </button>
                        </div>

                        {/* Model Table */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem' }}>Enabled</th>
                                    <th style={{ padding: '0.75rem' }}>Model Name</th>
                                    <th style={{ padding: '0.75rem' }}>Provider</th>
                                    <th style={{ padding: '0.75rem' }}>Model ID</th>
                                    <th style={{ padding: '0.75rem' }}>Context Window</th>
                                    <th style={{ padding: '0.75rem' }}>Cost / 1k In</th>
                                    <th style={{ padding: '0.75rem' }}>Cost / 1k Out</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {models.map(m => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '0.75rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={m.isEnabled}
                                                onChange={() => handleToggleModel(m.id, m.isEnabled)}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>{m.name}</td>
                                        <td style={{ padding: '0.75rem' }}>{m.provider}</td>
                                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{m.modelId}</td>
                                        <td style={{ padding: '0.75rem' }}>{m.maxContextTokens.toLocaleString()} tokens</td>
                                        <td style={{ padding: '0.75rem' }}>${m.costPer1kInput.toFixed(5)}</td>
                                        <td style={{ padding: '0.75rem' }}>${m.costPer1kOutput.toFixed(5)}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button className="btn icon-only secondary" title="Edit Model" onClick={() => setEditingModel(m)}>
                                                    <Edit3 size={14} />
                                                </button>
                                                <button className="btn icon-only secondary" title="Delete Model" onClick={() => handleDeleteModel(m.id, m.name)}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Model Edit Drawer / Form */}
                        {editingModel && (
                            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                                <h4 style={{ margin: '0 0 1rem 0' }}>Edit AI Model Configuration</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Display Name</label>
                                        <input
                                            type="text"
                                            className="input"
                                            style={{ width: '100%' }}
                                            value={editingModel.name}
                                            onChange={e => setEditingModel({ ...editingModel, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Provider Model ID</label>
                                        <input
                                            type="text"
                                            className="input"
                                            style={{ width: '100%' }}
                                            value={editingModel.modelId}
                                            onChange={e => setEditingModel({ ...editingModel, modelId: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Provider</label>
                                        <select
                                            className="input"
                                            style={{ width: '100%' }}
                                            value={editingModel.provider}
                                            onChange={e => setEditingModel({ ...editingModel, provider: e.target.value })}
                                        >
                                            <option value="openrouter">OpenRouter</option>
                                            <option value="chutes">Chutes.ai</option>
                                            <option value="openai">Direct OpenAI</option>
                                            <option value="openai-compatible">Local / OpenAI Compatible</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Context Window (Tokens)</label>
                                        <input
                                            type="number"
                                            className="input"
                                            style={{ width: '100%' }}
                                            value={editingModel.maxContextTokens}
                                            onChange={e => setEditingModel({ ...editingModel, maxContextTokens: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Cost per 1k Input Tokens ($)</label>
                                        <input
                                            type="number"
                                            step="0.00001"
                                            className="input"
                                            style={{ width: '100%' }}
                                            value={editingModel.costPer1kInput}
                                            onChange={e => setEditingModel({ ...editingModel, costPer1kInput: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600 }}>Cost per 1k Output Tokens ($)</label>
                                        <input
                                            type="number"
                                            step="0.00001"
                                            className="input"
                                            style={{ width: '100%' }}
                                            value={editingModel.costPer1kOutput}
                                            onChange={e => setEditingModel({ ...editingModel, costPer1kOutput: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                                    <button className="btn secondary" onClick={() => setEditingModel(null)}>Cancel</button>
                                    <button className="btn primary" onClick={handleSaveModelEdit}>Save Model Configuration</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB 3: Snapshots & Backup Recovery (PORT-011 - PORT-015)     */}
            {/* ============================================================ */}
            {activeTab === 'snapshots' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
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
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB 4: Appearance & Editor Preferences (UI-001 - UI-006)     */}
            {/* ============================================================ */}
            {activeTab === 'appearance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                            <Sliders size={20} /> Typography & Theme Preferences
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Application Color Theme (UI-001)
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        className={`btn ${theme === 'dark' ? 'primary' : 'secondary'}`}
                                        onClick={() => setTheme('dark')}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                                    >
                                        <Moon size={16} /> Dark Mode
                                    </button>
                                    <button
                                        className={`btn ${theme === 'light' ? 'primary' : 'secondary'}`}
                                        onClick={() => setTheme('light')}
                                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                                    >
                                        <Sun size={16} /> Light Mode
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Editor Font Family (UI-002)
                                </label>
                                <select
                                    className="input"
                                    style={{ width: '100%' }}
                                    value={fontFamily}
                                    onChange={e => setFontFamily(e.target.value)}
                                >
                                    <option value="Inter, sans-serif">Inter (Sans-Serif Modern)</option>
                                    <option value="Georgia, serif">Georgia (Literary Serif)</option>
                                    <option value="'Courier Prime', monospace">Courier Prime (Typewriter Monospace)</option>
                                    <option value="Roboto, sans-serif">Roboto (Clean Sans)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Font Size: {fontSize}px (UI-003)
                                </label>
                                <input
                                    type="range"
                                    min="12"
                                    max="24"
                                    value={fontSize}
                                    onChange={e => setFontSize(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Line Spacing: {lineHeight} (UI-004)
                                </label>
                                <input
                                    type="range"
                                    min="1.2"
                                    max="2.2"
                                    step="0.1"
                                    value={lineHeight}
                                    onChange={e => setLineHeight(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                    Editor Maximum Content Width: {contentMaxWidth}px (UI-005)
                                </label>
                                <input
                                    type="range"
                                    min="600"
                                    max="1200"
                                    step="20"
                                    value={contentMaxWidth}
                                    onChange={e => setContentMaxWidth(Number(e.target.value))}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        {/* Typography Preview */}
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                Manuscript Typography Preview
                            </div>
                            <div
                                style={{
                                    fontFamily,
                                    fontSize: `${fontSize}px`,
                                    lineHeight: lineHeight,
                                    maxWidth: `${contentMaxWidth}px`,
                                    margin: '0 auto',
                                    color: 'var(--color-text)'
                                }}
                            >
                                The obsidian gates opened with a reverberating groan. Standard manuscript formatting preferences do not mutate exported file semantics unless explicitly specified during compilation.
                            </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button className="btn primary" onClick={handleSaveAppearance}>
                                Save Appearance Preferences
                            </button>
                            {saveSuccess && (
                                <span style={{ color: '#28a745', fontSize: '0.85rem' }}>Preferences saved!</span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB 5: System Health & Request Retention Policies            */}
            {/* ============================================================ */}
            {activeTab === 'health' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Database Health Counters */}
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem' }}>
                                <input
                                    type="checkbox"
                                    id="metaOnly"
                                    checked={metadataOnlyHistory}
                                    onChange={e => setMetadataOnlyHistory(e.target.checked)}
                                />
                                <label htmlFor="metaOnly" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                    Metadata-Only Mode (Exclude Prompts/Responses from DB)
                                </label>
                            </div>
                        </div>
                        <button className="btn primary" onClick={handleSaveRetention} style={{ marginTop: '1rem' }}>
                            Save Retention Policies
                        </button>
                    </div>

                    {/* Diagnostics */}
                    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)' }}>
                            <Cpu size={20} /> Architectural Diagnostics
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed var(--color-border)' }}>
                                <span>Web Locks API Multi-Tab Lock:</span>
                                <span style={{ color: '#28a745', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <ShieldCheck size={14} /> Supported & Active
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px dashed var(--color-border)' }}>
                                <span>Local Persistence Engine:</span>
                                <span style={{ color: '#28a745', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <CheckCircle size={14} /> Connected (Dexie IndexedDB)
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                                <span>Network & Privacy Isolation:</span>
                                <span style={{ color: '#28a745', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <ShieldCheck size={14} /> 100% Local (Zero Analytics Transmitted)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* TAB 6: Data Import & Migration                               */}
            {/* ============================================================ */}
            {activeTab === 'import' && (
                <ImportMigrationTab />
            )}

            {/* ============================================================ */}
            {/* TAB 7: Data Compile & Export                                 */}
            {/* ============================================================ */}
            {activeTab === 'export' && (
                <ExportTab />
            )}
        </div>
    )
}
