import { useState, useEffect, useRef } from 'react'
import { BibleService } from '../../../services/BibleService'
import { AssetService } from '../../../services/AssetService'
import { useWorkspaceStore } from '../../../store/workspaceStore'
import { Wand2 } from 'lucide-react'
import { useAIStore } from '../../../store/aiStore'
import { AIWritableFieldCapability } from '../../../components/ai/AITypes'

export default function OverviewTab({ entry, assets, onUpdated }: { entry: any, assets: any[], onUpdated: () => void }) {
    const { activeNovelId } = useWorkspaceStore()
    const descriptionRef = useRef<HTMLTextAreaElement>(null)
    const [description, setDescription] = useState(entry.description || '')
    const [aliasesInput, setAliasesInput] = useState('')
    const [tagsInput, setTagsInput] = useState('')
    const [keywordsInput, setKeywordsInput] = useState('')
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Primary image logic: assume role "primary_portrait" or first asset is primary
    const primaryAsset = assets.find(a => a.linkRole === 'primary_portrait') || assets[0]
    const [primaryUrl, setPrimaryUrl] = useState<string | null>(null)

    useEffect(() => {
        if (primaryAsset?.blob) {
            const url = URL.createObjectURL(primaryAsset.blob)
            setPrimaryUrl(url)
            return () => URL.revokeObjectURL(url)
        }
        setPrimaryUrl(null)
    }, [primaryAsset])

    // Initialize inputs
    useEffect(() => {
        setDescription(entry.description || '')
        setAliasesInput((entry.aliases || []).join(', '))
        setTagsInput((entry.tags || []).join(', '))
        setKeywordsInput((entry.keywords || []).join(', '))
    }, [entry])

    const handleSave = async () => {
        if (!activeNovelId) return
        setSaveStatus('saving')
        setErrorMessage(null)

        try {
            const aliases = aliasesInput.split(',').map(s => s.trim()).filter(Boolean)
            const tags = tagsInput.split(',').map(s => s.trim()).filter(Boolean)
            const keywords = keywordsInput.split(',').map(s => s.trim()).filter(Boolean)

            await BibleService.updateEntry(activeNovelId, entry.id, {
                description,
                aliases,
                tags,
                keywords
            })
            setSaveStatus('saved')
            onUpdated()
            setTimeout(() => setSaveStatus('idle'), 2500)
        } catch (e: any) {
            setSaveStatus('error')
            setErrorMessage(e.message)
        }
    }

    return (
        <div style={{ display: 'flex', gap: '2rem', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                {/* Image Section */}
                <div style={{ width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ width: '100%', height: '300px', backgroundColor: 'var(--color-surface-hover)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {primaryUrl ? (
                            <img src={primaryUrl} alt="Primary" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <span style={{ color: 'var(--color-text-muted)' }}>No Image</span>
                        )}
                    </div>
                </div>

                {/* Core Attributes Editor */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <label>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 600 }}>Description</span>
                            {saveStatus === 'saving' && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Saving...</span>}
                            {saveStatus === 'saved' && <span style={{ fontSize: '0.75rem', color: 'var(--color-accent)' }}>Saved ✓</span>}
                            {saveStatus === 'error' && <span style={{ fontSize: '0.75rem', color: 'var(--color-error)' }}>Save error: {errorMessage}</span>}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <textarea
                                ref={descriptionRef}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                onBlur={handleSave}
                                placeholder="Primary reference description..."
                                rows={8}
                                style={{ width: '100%', padding: '0.75rem', paddingRight: '2rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', resize: 'vertical' }}
                            />
                            <button
                                className="icon-btn"
                                type="button"
                                style={{ position: 'absolute', top: '0.5rem', right: '0.2rem', padding: '0.15rem', color: 'var(--color-accent)' }}
                                title="Invoke AI Editor"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    const el = descriptionRef.current;
                                    if (!el) return;

                                    const start = el.selectionStart;
                                    const end = el.selectionEnd;

                                    const capability: AIWritableFieldCapability = {
                                        kind: 'codexText',
                                        captureSelection: () => ({ id: `codex-overview-${Date.now()}`, from: start, to: end, contextType: 'codexText' }),
                                        getSelectedText: (bm) => bm.from === bm.to ? null : el.value.substring(bm.from, bm.to),
                                        applyResult: (bm, text) => {
                                            el.focus();
                                            el.setRangeText(text, bm.from, bm.to, 'end');
                                            el.dispatchEvent(new Event('input', { bubbles: true }));
                                        },
                                        onCancel: (bm) => {
                                            el.focus();
                                            el.setSelectionRange(bm.from, bm.to);
                                        },
                                        getFieldConstraints: () => ({ description: "Primary Codex Entry text block. Assure narrative fidelity." })
                                    };
                                    useAIStore.getState().openHub(capability);
                                }}
                            >
                                <Wand2 size={12} />
                            </button>
                        </div>
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <label>
                            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Aliases</span>
                            <input
                                type="text"
                                value={aliasesInput}
                                onChange={(e) => setAliasesInput(e.target.value)}
                                onBlur={handleSave}
                                placeholder="E.g., Bobby, Bob-o"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>Direct identifiers.</small>
                        </label>

                        <label>
                            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Tags</span>
                            <input
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                onBlur={handleSave}
                                placeholder="E.g., Support, Needs Work"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>Author labels.</small>
                        </label>

                        <label>
                            <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Keywords</span>
                            <input
                                type="text"
                                value={keywordsInput}
                                onChange={(e) => setKeywordsInput(e.target.value)}
                                onBlur={handleSave}
                                placeholder="E.g., mechanic, garage"
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                            />
                            <small style={{ color: 'var(--color-text-muted)', display: 'block', marginTop: '0.25rem' }}>Search/indexing concepts.</small>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    )
}
