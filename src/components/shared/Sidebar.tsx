import { NavLink } from 'react-router-dom'
import {
    FolderOpen,
    PenTool,
    Map,
    BookOpen,
    Image as ImageIcon,
    Wand2,
    Ghost,
    BarChart,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
    Search as SearchIcon,
    MessageSquare
} from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function Sidebar({ onOpenSearch }: { onOpenSearch?: () => void }) {
    const { isSidebarOpen, toggleSidebar, activeNovelId } = useWorkspaceStore()

    return (
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                {isSidebarOpen && <span className="logo">AnansiWriter</span>}
                <button className="toggle-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
                    {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                </button>
            </div>

            <nav className="nav-links">
                <NavLink to="/library" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <FolderOpen size={20} />
                    {isSidebarOpen && <span>Library</span>}
                </NavLink>
                <button className="nav-item" onClick={onOpenSearch} style={{ border: 'none', background: 'transparent', textAlign: 'left', width: '100%', fontFamily: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                    <SearchIcon size={20} />
                    {isSidebarOpen && <span>Search</span>}
                </button>

                {activeNovelId && (
                    <>
                        <div style={{ height: '1px', background: 'var(--color-border)', margin: '1rem 0' }} />
                        <div style={{ padding: '0 1rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
                            {isSidebarOpen ? 'Novel' : '...'}
                        </div>
                        <NavLink to={`/novel/${activeNovelId}/plan`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Map size={20} />
                            {isSidebarOpen && <span>Plan</span>}
                        </NavLink>
                        <NavLink to={`/novel/${activeNovelId}/write`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <PenTool size={20} />
                            {isSidebarOpen && <span>Write</span>}
                        </NavLink>
                        <NavLink to={`/novel/${activeNovelId}/codex`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <BookOpen size={20} />
                            {isSidebarOpen && <span>Codex</span>}
                        </NavLink>
                        <NavLink to={`/novel/${activeNovelId}/assets`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <ImageIcon size={20} />
                            {isSidebarOpen && <span>Assets</span>}
                        </NavLink>
                        <NavLink to={`/novel/${activeNovelId}/prompts`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Wand2 size={20} />
                            {isSidebarOpen && <span>Prompts</span>}
                        </NavLink>
                        <NavLink to={`/novel/${activeNovelId}/staging`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <Ghost size={20} />
                            {isSidebarOpen && <span>Staging</span>}
                        </NavLink>
                        <NavLink to={`/novel/${activeNovelId}/review`} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <BarChart size={20} />
                            {isSidebarOpen && <span>Review</span>}
                        </NavLink>

                        <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 1rem' }} />
                        <button
                            className="nav-item"
                            onClick={useWorkspaceStore.getState().toggleChatPane}
                            style={{ border: 'none', background: 'transparent', textAlign: 'left', width: '100%', fontFamily: 'inherit', color: 'inherit', cursor: 'pointer' }}
                        >
                            <MessageSquare size={20} />
                            {isSidebarOpen && <span>AI Chat</span>}
                        </button>
                    </>
                )}
            </nav>

            <div className="sidebar-footer">
                <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Settings size={20} />
                    {isSidebarOpen && <span>Settings</span>}
                </NavLink>
            </div>
        </aside>
    )
}
