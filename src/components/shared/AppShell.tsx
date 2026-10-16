import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useWorkspaceStore } from '../../store/workspaceStore'
import { useProjectLock } from '../../hooks/useProjectLock'
import { AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { SearchModal } from '../SearchModal'
import CommandPalette from '../CommandPalette/CommandPalette'
import DialogModal from './DialogModal'
import MasterChatOverlay from './MasterChatOverlay'
import AIPromptInvocationHub from '../ai/AIPromptInvocationHub'

export default function AppShell() {
    const [searchOpen, setSearchOpen] = useState(false)
    const { activeNovelId } = useWorkspaceStore()

    // Phase 1A integration: Single writer lock
    const { isReadOnly, dismiss, retry } = useProjectLock(activeNovelId || undefined)

    return (
        <div className="app-shell">
            <Sidebar onOpenSearch={() => setSearchOpen(true)} />
            <main className="main-content">
                {isReadOnly === true && (
                    <div className="readonly-banner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={18} />
                            <span>
                                <strong>Read-Only Mode:</strong> This project is currently marked as open in another tab.
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={retry}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid currentColor',
                                    color: 'inherit',
                                    borderRadius: '4px',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Check Again
                            </button>
                            <button
                                type="button"
                                onClick={dismiss}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid currentColor',
                                    color: 'inherit',
                                    borderRadius: '4px',
                                    padding: '0.2rem 0.5rem',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
                <div className="workspace-container">
                    <Outlet />
                </div>
            </main>
            {searchOpen && (
                <SearchModal onClose={() => setSearchOpen(false)} />
            )}
            <CommandPalette />
            <DialogModal />
            <MasterChatOverlay />
            <AIPromptInvocationHub />
        </div>
    )
}
