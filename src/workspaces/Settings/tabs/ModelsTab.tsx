import React, { useState, useEffect } from 'react'
import { Bot, Plus, Trash2, Edit3 } from 'lucide-react'
import { AIModelService } from '../../../services/AIModelService'
import { confirmAction } from '../../../store/dialogStore'
import type { AIModel } from '../../../db/schema'

export function ModelsTab() {
    const [models, setModels] = useState<AIModel[]>([])
    const [editingModel, setEditingModel] = useState<AIModel | null>(null)

    useEffect(() => {
        loadModels()
    }, [])

    const loadModels = async () => {
        const list = await AIModelService.getAllModels()
        setModels(list)
    }

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

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)' }}>
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
    )
}
