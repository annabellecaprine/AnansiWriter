import React, { useState, useEffect, useRef } from 'react'
import { ProxyConfigService, type ProxyConfig } from '../../services/ProxyConfigService'
import { AIService } from '../../services/AIService'
import { Plus, Key, Zap, CheckCircle, AlertTriangle } from 'lucide-react'

interface ProxyConfigManagerProps {
    onActiveChanged?: (activeConfig: ProxyConfig) => void
}

export const ProxyConfigManager: React.FC<ProxyConfigManagerProps> = ({ onActiveChanged }) => {
    const [configs, setConfigs] = useState<ProxyConfig[]>([])
    const [isFormOpen, setIsFormOpen] = useState<boolean>(false)
    const [editingConfigId, setEditingConfigId] = useState<string | null>(null)

    // Form inputs
    const [formName, setFormName] = useState('')
    const [formProxyUrl, setFormProxyUrl] = useState('')
    const [formApiKey, setFormApiKey] = useState('')
    const [formModel, setFormModel] = useState('')
    const [showApiKey, setShowApiKey] = useState(false)

    // Connection Testing State
    const [testingId, setTestingId] = useState<string | null>(null)
    const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        loadConfigs()
    }, [])

    const loadConfigs = async () => {
        const list = await ProxyConfigService.getProxyConfigs()
        setConfigs(list)
        const active = list.find(c => c.isActive) || list[0]
        if (active && onActiveChanged) onActiveChanged(active)
    }

    const handleOpenNewForm = () => {
        setEditingConfigId(null)
        setFormName('')
        setFormProxyUrl('')
        setFormApiKey('')
        setFormModel('')
        setShowApiKey(false)
        setTestResult(null)
        setIsFormOpen(true)
    }

    const handleOpenEditForm = (config: ProxyConfig, e: React.MouseEvent) => {
        e.stopPropagation()
        setEditingConfigId(config.id)
        setFormName(config.name)
        setFormProxyUrl(config.proxyUrl)
        setFormApiKey(config.apiKey)
        setFormModel(config.model)
        setShowApiKey(false)
        setTestResult(null)
        setIsFormOpen(true)
    }

    const handleTestConfig = async (id: string, proxyUrl: string, apiKey: string, model: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation()
        setTestingId(id)
        setTestResult(null)

        let formattedUrl = proxyUrl.trim()
        if (formattedUrl && !formattedUrl.includes('/chat/completions') && !formattedUrl.endsWith('/')) {
            if (!formattedUrl.endsWith('/v1')) {
                formattedUrl += '/v1/chat/completions'
            } else {
                formattedUrl += '/chat/completions'
            }
        }

        const res = await AIService.testConnection('openai-compatible', apiKey, formattedUrl, model)
        setTestResult({ id, success: res.success, message: res.message })
        setTestingId(null)
    }

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault()
        let formattedUrl = formProxyUrl.trim()
        if (formattedUrl && !formattedUrl.includes('/chat/completions') && !formattedUrl.endsWith('/')) {
            if (!formattedUrl.endsWith('/v1')) {
                formattedUrl += '/v1/chat/completions'
            } else {
                formattedUrl += '/chat/completions'
            }
        }

        const updatedList = await ProxyConfigService.saveProxyConfig({
            id: editingConfigId || undefined,
            name: formName || 'My Custom Proxy',
            proxyUrl: formattedUrl || 'https://proxy.com/v1/chat/completions',
            apiKey: formApiKey,
            model: formModel || 'gpt-4'
        })

        setConfigs(updatedList)
        setIsFormOpen(false)
        setEditingConfigId(null)
        setTestResult(null)

        const active = updatedList.find(c => c.isActive)
        if (active && onActiveChanged) onActiveChanged(active)
    }

    const handleSelectActive = async (id: string) => {
        const updatedList = await ProxyConfigService.setActiveProxyConfig(id)
        setConfigs(updatedList)
        const active = updatedList.find(c => c.isActive)
        if (active && onActiveChanged) onActiveChanged(active)
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        const updatedList = await ProxyConfigService.deleteProxyConfig(id)
        setConfigs(updatedList)
        if (editingConfigId === id) {
            setIsFormOpen(false)
            setEditingConfigId(null)
            setTestResult(null)
        }
    }

    const handleExport = async () => {
        await ProxyConfigService.exportProxyConfigs()
    }

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const text = await file.text()
        try {
            const updated = await ProxyConfigService.importProxyConfigs(text)
            setConfigs(updated)
        } catch (err: any) {
            alert('Failed to import proxy configurations: ' + err.message)
        }
    }

    const handleRecoverDefaults = async () => {
        if (confirm('Reset proxy configurations to default presets?')) {
            const defaults = await ProxyConfigService.seedDefaultProxies()
            setConfigs(defaults)
            setIsFormOpen(false)
            setTestResult(null)
        }
    }

    // Helper to format subtitle: <model> • <domain>
    const getSubtitle = (proxyUrl: string, model: string) => {
        let domain = ''
        try {
            const urlObj = new URL(proxyUrl)
            domain = urlObj.hostname
        } catch {
            domain = proxyUrl || 'custom-host'
        }
        return `${model || 'default-model'} • ${domain}`
    }

    return (
        <div style={{
            background: 'var(--color-surface, #242428)',
            border: '1px solid var(--color-border, #3a3a40)',
            borderRadius: '12px',
            padding: '1.25rem',
            width: '100%',
            maxWidth: '580px',
            boxSizing: 'border-box',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: 'var(--color-text, #e2e8f0)'
        }}>
            {/* BYOK Header & Description */}
            <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-primary, #3b82f6)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Key size={20} /> Bring Your Own Key (BYOK) Proxy Configurations
                </h3>
                <p style={{ margin: 0, fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    Credentials remain strictly local to your browser's IndexedDB. They are never exported into <code>.storyproject</code> files or shared with external analytics.
                </p>
            </div>

            {/* List Header & Add Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                    Proxy presets & custom endpoints
                </h4>
                <button
                    onClick={handleOpenNewForm}
                    style={{
                        background: 'transparent',
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f1f5f9',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'all 0.2s ease'
                    }}
                >
                    <Plus size={14} /> New
                </button>
            </div>

            {/* Creation / Edit Form Card */}
            {isFormOpen && (
                <form onSubmit={handleSaveForm} style={{
                    background: 'var(--color-bg, #1a1a1e)',
                    border: '1px solid #3b82f6',
                    borderRadius: '10px',
                    padding: '1rem',
                    marginBottom: '1rem'
                }}>
                    <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem', color: '#ffffff', borderBottom: '1px solid #2e2e34', paddingBottom: '0.5rem' }}>
                        {editingConfigId ? 'Edit Configuration' : 'New Configuration'}
                    </div>

                    {/* Name */}
                    <div style={{ marginBottom: '0.85rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>
                            Name
                        </label>
                        <input
                            type="text"
                            placeholder="My Custom Proxy"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#121215',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '0.5rem 0.75rem',
                                color: '#f8fafc',
                                fontSize: '0.875rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Proxy URL */}
                    <div style={{ marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>Proxy URL</label>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Add /chat/completions</span>
                        </div>
                        <input
                            type="text"
                            placeholder="https://proxy.com/v1/chat/completions"
                            value={formProxyUrl}
                            onChange={e => setFormProxyUrl(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#121215',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '0.5rem 0.75rem',
                                color: '#f8fafc',
                                fontSize: '0.875rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* API Key */}
                    <div style={{ marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>API key</label>
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.75rem', cursor: 'pointer' }}
                            >
                                {showApiKey ? 'Hide' : 'Show'}
                            </button>
                        </div>
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="sk-... (optional)"
                            value={formApiKey}
                            onChange={e => setFormApiKey(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#121215',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '0.5rem 0.75rem',
                                color: '#f8fafc',
                                fontSize: '0.875rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Model */}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.25rem' }}>
                            Model
                        </label>
                        <input
                            type="text"
                            placeholder="gpt-4, claude-3-opus, etc."
                            value={formModel}
                            onChange={e => setFormModel(e.target.value)}
                            style={{
                                width: '100%',
                                background: '#121215',
                                border: '1px solid #334155',
                                borderRadius: '8px',
                                padding: '0.5rem 0.75rem',
                                color: '#f8fafc',
                                fontSize: '0.875rem',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {/* Test Results Output */}
                    {testResult && testResult.id === (editingConfigId || 'new') && (
                        <div style={{
                            marginBottom: '1rem',
                            padding: '0.65rem 0.85rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            background: testResult.success ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${testResult.success ? '#22c55e' : '#ef4444'}`,
                            color: testResult.success ? '#4ade80' : '#f87171'
                        }}>
                            {testResult.success ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                            <span>{testResult.message}</span>
                        </div>
                    )}

                    {/* Form Buttons */}
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {editingConfigId && (
                            <button
                                type="button"
                                onClick={(e) => handleDelete(editingConfigId, e)}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #ef4444',
                                    color: '#ef4444',
                                    borderRadius: '6px',
                                    padding: '0.35rem 0.75rem',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    marginRight: 'auto'
                                }}
                            >
                                Delete
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => handleTestConfig(editingConfigId || 'new', formProxyUrl, formApiKey, formModel)}
                            disabled={testingId === (editingConfigId || 'new')}
                            style={{
                                background: 'transparent',
                                border: '1px solid #eab308',
                                color: '#facc15',
                                borderRadius: '6px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.8rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                            }}
                        >
                            <Zap size={14} /> {testingId === (editingConfigId || 'new') ? 'Testing…' : 'Test Connection'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsFormOpen(false)}
                            style={{
                                background: 'transparent',
                                border: '1px solid #475569',
                                color: '#94a3b8',
                                borderRadius: '6px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            style={{
                                background: '#2563eb',
                                border: 'none',
                                color: '#ffffff',
                                borderRadius: '6px',
                                padding: '0.35rem 0.85rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Save
                        </button>
                    </div>
                </form>
            )}

            {/* List of Proxy Configurations */}
            <div style={{
                background: 'var(--color-bg, #1a1a1e)',
                border: '1px solid #2e2e34',
                borderRadius: '10px',
                overflow: 'hidden'
            }}>
                {configs.map((c, index) => (
                    <React.Fragment key={c.id}>
                        <div
                            onClick={() => handleSelectActive(c.id)}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '0.85rem 1rem',
                                borderBottom: index < configs.length - 1 ? '1px solid #2a2a30' : 'none',
                                cursor: 'pointer',
                                background: c.isActive ? 'rgba(236, 72, 153, 0.06)' : 'transparent',
                                transition: 'background 0.15s ease'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {/* Pink Active Indicator Dot */}
                                <div style={{ width: '8px', height: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {c.isActive && (
                                        <div style={{
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            background: '#ec4899', // Pink dot from screenshot
                                            boxShadow: '0 0 6px #ec4899'
                                        }} />
                                    )}
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f8fafc' }}>
                                        {c.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.15rem' }}>
                                        {getSubtitle(c.proxyUrl, c.model)}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    onClick={(e) => handleTestConfig(c.id, c.proxyUrl, c.apiKey, c.model, e)}
                                    disabled={testingId === c.id}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid #334155',
                                        color: '#cbd5e1',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.25rem'
                                    }}
                                >
                                    <Zap size={12} color="#facc15" /> {testingId === c.id ? 'Testing…' : 'Test'}
                                </button>
                                <button
                                    onClick={(e) => handleOpenEditForm(c, e)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#94a3b8',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px'
                                    }}
                                >
                                    Edit
                                </button>
                            </div>
                        </div>

                        {/* Inline Test Result below list row if tested from list */}
                        {testResult && testResult.id === c.id && !isFormOpen && (
                            <div style={{
                                padding: '0.5rem 1rem 0.5rem 2.25rem',
                                background: testResult.success ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                borderBottom: '1px solid #2a2a30',
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                                color: testResult.success ? '#4ade80' : '#f87171'
                            }}>
                                {testResult.success ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                                <span>{testResult.message}</span>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>

            {/* Footer Buttons: Export, Import, Recover */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', fontSize: '0.85rem' }}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    style={{ display: 'none' }}
                />
                <button
                    onClick={handleExport}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 500 }}
                >
                    Export
                </button>
                <button
                    onClick={handleImportClick}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 500 }}
                >
                    Import
                </button>
                <button
                    onClick={handleRecoverDefaults}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontWeight: 500 }}
                >
                    Recover
                </button>
            </div>
        </div>
    )
}
