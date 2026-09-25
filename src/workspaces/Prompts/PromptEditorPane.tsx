import { useState } from 'react'
import { Star, Copy, Trash2, ShieldQuestion, Globe, Lock } from 'lucide-react'
import type { Prompt, PromptCategory } from '../../db/schema'
import { PromptService } from '../../services/PromptService'
import { confirmAction } from '../../store/dialogStore'
import { useNavigate } from 'react-router-dom'

import GeneralTab from './tabs/GeneralTab'
import InstructionsTab from './tabs/InstructionsTab'
import InputsTab from './tabs/InputsTab'
import DescriptionTab from './tabs/DescriptionTab'

interface PromptEditorPaneProps {
    activePrompt: Prompt | undefined;
    categories: PromptCategory[];
    reloadPrompts: () => Promise<void>;
}

export default function PromptEditorPane({ activePrompt, categories, reloadPrompts }: PromptEditorPaneProps) {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<'general' | 'instructions' | 'inputs' | 'description'>('general')

    if (!activePrompt) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface)' }}>
                Please select a prompt from the library to edit.
            </div>
        )
    }

    const handleDelete = async () => {
        const confirmed = await confirmAction({
            title: 'Delete Prompt',
            message: `Are you sure you want to move "${activePrompt.name}" to Trash?`,
            isDestructive: true,
            confirmLabel: 'Move to Trash'
        })
        if (confirmed) {
            try {
                await PromptService.softDeletePrompt(activePrompt.id)
                await reloadPrompts()
            } catch (err: any) {
                alert(err.message)
            }
        }
    }

    const handleDuplicate = async () => {
        // Automatically duplicates to the current project or global
        const targetScope = activePrompt.novelId ? 'project' : 'global'
        await PromptService.duplicatePrompt(activePrompt, targetScope, activePrompt.novelId)
        await reloadPrompts()
    }

    const toggleFavorite = async () => {
        await PromptService.updatePrompt(activePrompt.id, { isFavorite: !activePrompt.isFavorite })
        await reloadPrompts()
    }

    const getScopeIcon = (scope: string) => {
        if (scope === 'built-in') return <Lock size={14} color="var(--color-text-muted)" />
        if (scope === 'global') return <Globe size={14} color="var(--color-info)" />
        return null
    }

    const isSystem = activePrompt.scope === 'built-in'

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--color-surface)', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '2rem 3rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>{activePrompt.name}</h1>
                        {getScopeIcon(activePrompt.scope)}
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', background: 'var(--color-bg)', padding: '0.2rem 0.5rem', borderRadius: '4px', textTransform: 'capitalize' }}>
                            {activePrompt.scope}
                        </span>
                    </div>
                    {isSystem && <p style={{ fontSize: '0.85rem', color: 'var(--color-warning)', margin: 0 }}>Built-in prompts cannot be edited directly. Duplicate it to make changes.</p>}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="icon-btn" onClick={toggleFavorite} title="Favorite">
                        <Star size={18} color="var(--color-warning)" fill={activePrompt.isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button className="icon-btn" onClick={handleDuplicate} title="Duplicate Prompt">
                        <Copy size={18} />
                    </button>
                    <button className="btn" title="Test Prompt" onClick={() => navigate(`/sandbox?promptId=${activePrompt.id}`)}>
                        <ShieldQuestion size={16} /> Test
                    </button>
                    <button
                        className="icon-btn"
                        title="Move to Trash"
                        style={{ color: isSystem ? 'var(--color-text-muted)' : 'var(--color-danger)', opacity: isSystem ? 0.5 : 1 }}
                        disabled={isSystem}
                        onClick={handleDelete}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div style={{ padding: '0 3rem', borderBottom: '1px solid var(--color-border)', marginTop: '2rem', display: 'flex', gap: '2rem' }}>
                {['general', 'instructions', 'inputs', 'description'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '0.75rem 0',
                            fontSize: '1rem',
                            fontWeight: activeTab === tab ? 600 : 400,
                            color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content Canvas */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ maxWidth: '1000px', margin: '0 auto', background: 'var(--color-bg)', minHeight: '100%', borderLeft: '1px solid var(--color-border)', borderRight: '1px solid var(--color-border)' }}>
                    {activeTab === 'general' && <GeneralTab activePrompt={activePrompt} categories={categories} reloadPrompts={reloadPrompts} />}
                    {activeTab === 'instructions' && <InstructionsTab activePrompt={activePrompt} reloadPrompts={reloadPrompts} />}
                    {activeTab === 'inputs' && <InputsTab activePrompt={activePrompt} reloadPrompts={reloadPrompts} />}
                    {activeTab === 'description' && <DescriptionTab activePrompt={activePrompt} reloadPrompts={reloadPrompts} />}
                </div>
            </div>
        </div>
    )
}
