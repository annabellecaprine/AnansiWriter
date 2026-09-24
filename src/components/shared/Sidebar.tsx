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
    Search as SearchIcon
} from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function Sidebar({ onOpenSearch }: { onOpenSearch?: () => void }) {
    const { isSidebarOpen, toggleSidebar, activeProjectId } = useWorkspaceStore()

    // These routes require an active project
    const projectProps = activeProjectId ? {} : {
        onClick: (e: React.MouseEvent) => e.preventDefault(),
        style: { opacity: 0.5, cursor: 'not-allowed' }
    }

    return (
        <aside className={`sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
            <div className="sidebar-header">
                {isSidebarOpen && <span className="logo">AnansiWriter</span>}
                <button className="toggle-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
                    {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
                </button>
            </div>

            <nav className="nav-links">
                <NavLink to="/project" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <FolderOpen size={20} />
                    {isSidebarOpen && <span>Project</span>}
                </NavLink>
                <button className="nav-item" onClick={onOpenSearch} style={{ border: 'none', background: 'transparent', textAlign: 'left', width: '100%', fontFamily: 'inherit', color: 'inherit', cursor: 'pointer' }}>
                    <SearchIcon size={20} />
                    {isSidebarOpen && <span>Search</span>}
                </button>
                <NavLink to="/writing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} {...projectProps}>
                    <PenTool size={20} />
                    {isSidebarOpen && <span>Writing</span>}
                </NavLink>
                <NavLink to="/planning" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} {...projectProps}>
                    <Map size={20} />
                    {isSidebarOpen && <span>Planning</span>}
                </NavLink>
                <NavLink to="/bible" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} {...projectProps}>
                    <BookOpen size={20} />
                    {isSidebarOpen && <span>Bible / Codex</span>}
                </NavLink>
                <NavLink to="/assets" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} {...projectProps}>
                    <ImageIcon size={20} />
                    {isSidebarOpen && <span>Assets</span>}
                </NavLink>
                <NavLink to="/prompts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} {...projectProps}>
                    <Wand2 size={20} />
                    {isSidebarOpen && <span>Prompts</span>}
                </NavLink>
                <NavLink to="/staging" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} {...projectProps}>
                    <Ghost size={20} />
                    {isSidebarOpen && <span>Staging</span>}
                </NavLink>
                <NavLink to="/review" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} {...projectProps}>
                    <BarChart size={20} />
                    {isSidebarOpen && <span>Review</span>}
                </NavLink>
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
