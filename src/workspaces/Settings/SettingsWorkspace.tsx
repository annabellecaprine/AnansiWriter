import { useState } from 'react'
import { ProxyConfigManager } from '../../components/shared/ProxyConfigManager'
import { ImportMigrationTab } from './tabs/ImportMigrationTab'
import { ExportTab } from './tabs/ExportTab'
import { AppearanceTab } from './tabs/AppearanceTab'
import { ModelsTab } from './tabs/ModelsTab'
import { SnapshotsTab } from './tabs/SnapshotsTab'
import { HealthTab } from './tabs/HealthTab'
import {
    Settings as SettingsIcon,
    Key,
    Database,
    Camera,
    Sliders,
    Bot,
    Download
} from 'lucide-react'

export default function SettingsWorkspace() {
    const [activeTab, setActiveTab] = useState<'credentials' | 'models' | 'snapshots' | 'appearance' | 'health' | 'import' | 'export'>('credentials')

    return (
        <div className="workspace-view" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Main Header */}
            <header style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                    <SettingsIcon size={28} color="var(--color-accent)" /> Application Settings & System Health
                </h1>
                <p style={{ margin: '0.25rem 0 0 0', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    Configure AI credentials, manage model directories and pricing, view recovery snapshots, customize editor appearance, and monitor storage health.
                </p>
            </header>

            {/* Tabbed Navigation Bar */}
            <nav className="settings-nav">

                <div className="settings-tab-group">
                    <span className="settings-tab-label">General</span>
                    <div className="settings-tab-row">
                        <button className={`settings-btn ${activeTab === 'appearance' ? 'active' : ''}`} onClick={() => setActiveTab('appearance')}>
                            <Sliders size={14} /> Appearance
                        </button>
                    </div>
                </div>

                <div className="settings-tab-group">
                    <span className="settings-tab-label">AI Services</span>
                    <div className="settings-tab-row">
                        <button className={`settings-btn ${activeTab === 'credentials' ? 'active' : ''}`} onClick={() => setActiveTab('credentials')}>
                            <Key size={14} /> Providers
                        </button>
                        <button className={`settings-btn ${activeTab === 'models' ? 'active' : ''}`} onClick={() => setActiveTab('models')}>
                            <Bot size={14} /> Models
                        </button>
                    </div>
                </div>

                <div className="settings-tab-group">
                    <span className="settings-tab-label">Data</span>
                    <div className="settings-tab-row">
                        <button className={`settings-btn ${activeTab === 'import' ? 'active' : ''}`} onClick={() => setActiveTab('import')}>
                            <Download size={14} /> Import / Migration
                        </button>
                        <button className={`settings-btn ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
                            <Download size={14} /> Export
                        </button>
                        <button className={`settings-btn ${activeTab === 'snapshots' ? 'active' : ''}`} onClick={() => setActiveTab('snapshots')}>
                            <Camera size={14} /> Snapshots
                        </button>
                    </div>
                </div>

                <div className="settings-tab-group" style={{ marginLeft: 'auto' }}>
                    <span className="settings-tab-label">System</span>
                    <div className="settings-tab-row">
                        <button className={`settings-btn ${activeTab === 'health' ? 'active' : ''}`} onClick={() => setActiveTab('health')}>
                            <Database size={14} /> Health
                        </button>
                    </div>
                </div>

            </nav>

            {/* ============================================================ */}
            {/* Content Tabs                                                 */}
            {/* ============================================================ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1, overflowY: 'auto' }}>
                {activeTab === 'credentials' && <ProxyConfigManager />}
                {activeTab === 'models' && <ModelsTab />}
                {activeTab === 'snapshots' && <SnapshotsTab />}
                {activeTab === 'appearance' && <AppearanceTab />}
                {activeTab === 'health' && <HealthTab />}
                {activeTab === 'import' && <ImportMigrationTab />}
                {activeTab === 'export' && <ExportTab />}
            </div>
        </div>
    )
}
