import { useState, useMemo } from 'react'
import { Plus, Search, ChevronDown, ChevronRight, Wand2, Star, Globe, Lock, Trash2, Edit2 } from 'lucide-react'
import type { Prompt, PromptCategory } from '../../db/schema'
import { PromptService } from '../../services/PromptService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { promptInput, confirmAlert } from '../../store/dialogStore'

interface PromptLibraryPaneProps {
    activePromptId: string | null;
    onSelect: (id: string) => void;
    prompts: Prompt[];
    categories: PromptCategory[];
    reloadPrompts: () => Promise<void>;
}

export default function PromptLibraryPane({ activePromptId, onSelect, prompts, categories, reloadPrompts }: PromptLibraryPaneProps) {
    const { activeNovelId } = useWorkspaceStore()
    const [searchQuery, setSearchQuery] = useState('')
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null)

    const handleCreate = async () => {
        if (!activeNovelId) return
        const name = await promptInput({
            title: 'Create Prompt',
            message: 'Enter a name for the new Prompt:',
            placeholder: 'Prompt Name'
        })
        if (!name) return

        const defaultCatId = categories.length > 0 ? categories[0].id : ''
        const newId = await PromptService.createPrompt(name, defaultCatId, 'project', activeNovelId)
        await reloadPrompts()
        onSelect(newId)
    }

    const handleCreateCategory = async () => {
        const name = await promptInput({
            title: 'Create Category',
            message: 'Enter a name for the new Category:',
            placeholder: 'Category Name'
        })
        if (!name) return
        await PromptService.createCategory(name, false, activeNovelId || undefined)
        await reloadPrompts()
    }

    const handleEditCategory = async (e: React.MouseEvent, cat: PromptCategory) => {
        e.stopPropagation()
        const newName = await promptInput({
            title: 'Rename Category',
            message: 'Enter a new name:',
            placeholder: cat.name,
            defaultValue: cat.name
        })
        if (!newName || newName === cat.name) return
        await PromptService.updateCategory(cat.id, { name: newName })
        await reloadPrompts()
    }

    const handleDeleteCategory = async (e: React.MouseEvent, cat: PromptCategory) => {
        e.stopPropagation()
        if (cat.isSystem) return

        const targetName = await promptInput({
            title: 'Delete Category',
            message: `Deleting "${cat.name}".\n\nProvide the name of a fallback category to move its Prompts into.\nLeave blank to move to "Uncategorized":`,
            placeholder: 'Fallback Category Name',
            allowEmpty: true
        })

        // If they specifically hit cancel, targetName is null. If they hit okay with blank, it is empty string.
        if (targetName === null) return

        let targetCatId = ''
        if (targetName.trim() !== '') {
            const match = categories.find(c => c.name.toLowerCase() === targetName.trim().toLowerCase())
            if (match) {
                targetCatId = match.id
            } else {
                await confirmAlert({
                    title: 'Category Not Found',
                    message: `Could not find a category named "${targetName}". Deletion cancelled.`
                })
                return
            }
        }

        try {
            await PromptService.deleteCategory(cat.id, targetCatId)
            await reloadPrompts()
        } catch (err: any) {
            await confirmAlert({
                title: 'Error Deleting Category',
                message: err.message,
                isDestructive: true
            })
        }
    }

    const toggleCategory = (catId: string) => {
        setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }))
    }

    const filteredPrompts = useMemo(() => {
        let result = prompts
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            result = result.filter(p => {
                const matchName = p.name.toLowerCase().includes(query)
                const matchDesc = p.description?.toLowerCase().includes(query)
                const matchTags = p.tags?.some(tag => tag.toLowerCase().includes(query))

                if (matchName || matchDesc || matchTags) return true

                const cat = categories.find(c => c.id === p.categoryId)
                return cat && cat.name.toLowerCase().includes(query)
            })
        }
        return result
    }, [prompts, searchQuery, categories])

    // Group prompts by category ID
    const groupedPrompts: Record<string, Prompt[]> = {}
    for (const p of filteredPrompts) {
        const catId = p.categoryId || 'uncategorized'
        if (!groupedPrompts[catId]) groupedPrompts[catId] = []
        groupedPrompts[catId].push(p)
    }

    const getScopeIcon = (scope: string) => {
        if (scope === 'built-in') return <span title="Built-in" style={{ display: 'flex' }}><Lock size={12} color="var(--color-text-muted)" /></span>
        if (scope === 'global') return <span title="Global" style={{ display: 'flex' }}><Globe size={12} color="var(--color-info)" /></span>
        return null
    }

    return (
        <div style={{ width: '320px', background: 'var(--color-bg)', borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wand2 size={18} />
                    Prompts
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} onClick={handleCreateCategory} title="New Category"><Plus size={14} /> Category</button>
                    <button className="btn primary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }} onClick={handleCreate} title="New Prompt"><Plus size={14} /> Prompt</button>
                </div>
            </div>

            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.5rem', top: '0.5rem' }} />
                    <input
                        className="input"
                        placeholder="Search prompts..."
                        style={{ paddingLeft: '2rem', width: '100%', fontSize: '0.9rem' }}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                {Object.keys(groupedPrompts).length === 0 ? (
                    <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem 0', fontSize: '0.9rem' }}>No prompts found.</p>
                ) : (
                    <>
                        {categories.map(cat => {
                            const catPrompts = groupedPrompts[cat.id] || []
                            if (catPrompts.length === 0 && searchQuery) return null

                            const isExpanded = expandedCategories[cat.id] !== false
                            return (
                                <div key={cat.id} style={{ marginBottom: '0.5rem' }} onMouseEnter={() => setHoveredCategory(cat.id)} onMouseLeave={() => setHoveredCategory(null)}>
                                    <div
                                        onClick={() => toggleCategory(cat.id)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--color-text)', userSelect: 'none' }}
                                    >
                                        <div style={{ color: 'var(--color-text-muted)' }}>
                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </div>
                                        <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>{cat.name}</span>

                                        {!cat.isSystem && hoveredCategory === cat.id && (
                                            <div style={{ display: 'flex', gap: '0.2rem' }}>
                                                <button className="icon-btn" style={{ padding: '0.1rem' }} onClick={e => handleEditCategory(e, cat)}><Edit2 size={12} /></button>
                                                <button className="icon-btn" style={{ color: 'var(--color-error)', padding: '0.1rem' }} onClick={e => handleDeleteCategory(e, cat)}><Trash2 size={12} /></button>
                                            </div>
                                        )}

                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                                            {catPrompts.length}
                                        </span>
                                    </div>

                                    {isExpanded && (
                                        <div style={{ paddingLeft: '1rem', marginTop: '0.2rem' }}>
                                            {catPrompts.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => onSelect(p.id)}
                                                    style={{
                                                        padding: '0.5rem 0.5rem',
                                                        background: activePromptId === p.id ? 'var(--color-surface-hover)' : 'transparent',
                                                        borderRadius: 'var(--radius-sm)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        fontSize: '0.9rem',
                                                        marginBottom: '0.1rem'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: activePromptId === p.id ? 600 : 400, color: activePromptId === p.id ? 'var(--color-accent)' : 'var(--color-text)' }}>
                                                        {p.name}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                        {getScopeIcon(p.scope)}
                                                        {p.isFavorite && <Star size={12} color="var(--color-warning)" fill="currentColor" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}

                        {/* Rendering Uncategorized if any */}
                        {groupedPrompts['uncategorized'] && groupedPrompts['uncategorized'].length > 0 && (
                            <div style={{ marginBottom: '0.5rem' }}>
                                <div
                                    onClick={() => toggleCategory('uncategorized')}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.5rem', cursor: 'pointer', color: 'var(--color-text)', userSelect: 'none' }}
                                >
                                    <div style={{ color: 'var(--color-text-muted)' }}>
                                        {expandedCategories['uncategorized'] !== false ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </div>
                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1 }}>Uncategorized</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>
                                        {groupedPrompts['uncategorized'].length}
                                    </span>
                                </div>
                                {expandedCategories['uncategorized'] !== false && (
                                    <div style={{ paddingLeft: '1rem', marginTop: '0.2rem' }}>
                                        {groupedPrompts['uncategorized'].map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => onSelect(p.id)}
                                                style={{
                                                    padding: '0.5rem 0.5rem',
                                                    background: activePromptId === p.id ? 'var(--color-surface-hover)' : 'transparent',
                                                    borderRadius: 'var(--radius-sm)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '0.9rem',
                                                    marginBottom: '0.1rem'
                                                }}
                                            >
                                                <span style={{ fontWeight: activePromptId === p.id ? 600 : 400, color: activePromptId === p.id ? 'var(--color-accent)' : 'var(--color-text)' }}>
                                                    {p.name}
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    {getScopeIcon(p.scope)}
                                                    {p.isFavorite && <Star size={12} color="var(--color-warning)" fill="currentColor" />}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
