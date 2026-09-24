import { useWorkspaceStore } from '../../store/workspaceStore'

export default function PlanningDashboard() {
    const { activeProjectId } = useWorkspaceStore()

    if (!activeProjectId) {
        return (
            <div className="workspace-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '1.2rem' }}>
                    Please open or create a project to load the planning workspace.
                </p>
            </div>
        )
    }

    return (
        <div className="workspace-view">
            <header className="workspace-header">
                <h1>Planning & Outlining</h1>
            </header>

            <div className="project-grid">
                <div className="project-card">
                    <h3>Series & Books</h3>
                    <p className="subtitle">High-level narrative arcs and overarching plots.</p>
                    <div className="project-actions">
                        <button className="btn">Open Series Planner</button>
                    </div>
                </div>

                <div className="project-card">
                    <h3>Act & Chapter Structure</h3>
                    <p className="subtitle">Pacing, beats, and structural outlining.</p>
                    <div className="project-actions">
                        <button className="btn">Open Structure Planner</button>
                    </div>
                </div>

                <div className="project-card">
                    <h3>Scene Beats</h3>
                    <p className="subtitle">Pre-writing plot points and dialogue targets.</p>
                    <div className="project-actions">
                        <button className="btn">Open Scene Planner</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
