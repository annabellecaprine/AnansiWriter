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

export default function AppShell() {
    const [searchOpen, setSearchOpen] = useState(false)
    const { activeNovelId } = useWorkspaceStore()

    // Phase 1A integration: Single writer lock
    const isReadOnly = useProjectLock(activeNovelId || undefined)

    return (
        <div className="app-shell">
            <Sidebar onOpenSearch={() => setSearchOpen(true)} />
            <main className="main-content">
                {isReadOnly === true && (
                    <div className="readonly-banner">
                        <AlertCircle size={18} />
                        <strong>Read-Only Mode:</strong> This project is currently open for editing in another tab. Changes made here will not be saved.
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
        </div>
    )
}
