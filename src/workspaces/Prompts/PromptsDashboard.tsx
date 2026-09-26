import { useState, useEffect } from 'react'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { PromptService } from '../../services/PromptService'
import type { Prompt, PromptCategory } from '../../db/schema'
import PromptLibraryPane from './PromptLibraryPane'
import PromptEditorPane from './PromptEditorPane'

export default function PromptsDashboard() {
    const { activeNovelId } = useWorkspaceStore()
    const [prompts, setPrompts] = useState<Prompt[]>([])
    const [categories, setCategories] = useState<PromptCategory[]>([])
    const [activePromptId, setActivePromptId] = useState<string | null>(null)

    const loadData = async () => {
        if (!activeNovelId) return
        const [p, c] = await Promise.all([
            PromptService.getPrompts(activeNovelId, false),
            PromptService.getCategories(activeNovelId)
        ])
        setPrompts(p)
        setCategories(c)
    }

    useEffect(() => {
        loadData()
    }, [activeNovelId])

    const activePrompt = prompts.find(p => p.id === activePromptId)

    if (!activeNovelId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>Please open a project to access Prompts.</p>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'row', height: '100%', padding: 0, overflow: 'hidden', width: '100%' }}>
            <PromptLibraryPane
                activePromptId={activePromptId}
                onSelect={setActivePromptId}
                prompts={prompts}
                categories={categories}
                reloadPrompts={loadData}
            />
            <PromptEditorPane
                activePrompt={activePrompt}
                categories={categories}
                reloadPrompts={loadData}
            />
        </div>
    )
}
