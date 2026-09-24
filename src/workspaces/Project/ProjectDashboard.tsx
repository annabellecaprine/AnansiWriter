import { useEffect, useState } from 'react'
import { ProjectService } from '../../services/ProjectService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import type { Project } from '../../db/schema'
import { Plus, Trash2, Upload } from 'lucide-react'
import ActiveProjectDashboard from './ActiveProjectDashboard'

export default function ProjectDashboard() {
    const [projects, setProjects] = useState<Project[]>([])
    const { activeProjectId, setActiveProject } = useWorkspaceStore()
    const [newName, setNewName] = useState('New Project')

    const loadProjects = async () => {
        const list = await ProjectService.listActiveProjects()
        setProjects(list)
    }

    useEffect(() => { loadProjects() }, [])

    const handleCreate = async () => {
        const id = await ProjectService.createNewProject(newName)
        setActiveProject(id)
        loadProjects()
    }

    return (
        <div className="workspace-view">
            <header className="workspace-header">
                <h1>Your Projects</h1>
                <div>
                    <input
                        type="file"
                        id="import-project"
                        accept=".storyproject,.zip"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            try {
                                const { ImportService } = await import('../../services/ImportService')
                                await ImportService.validateAndImportProject(file)
                                loadProjects()
                            } catch (err: any) {
                                if (err.message === 'CollisionDetected') {
                                    if (window.confirm('Project already exists. Import as a copy?')) {
                                        const { ImportService } = await import('../../services/ImportService')
                                        await ImportService.validateAndImportProject(file, { importAsCopy: true })
                                        loadProjects()
                                    }
                                } else {
                                    alert(`Import failed: ${err.message}`)
                                }
                            }
                            e.target.value = '' // reset
                        }}
                    />
                    <button
                        className="btn"
                        onClick={() => document.getElementById('import-project')?.click()}
                        style={{ marginRight: '1rem' }}
                    >
                        <Upload size={18} />
                        Import Project
                    </button>
                </div>
            </header>

            {activeProjectId && <ActiveProjectDashboard />}

            <div className="project-grid">
                <h3 style={{ gridColumn: '1 / -1', marginTop: activeProjectId ? '1rem' : '0', marginBottom: '0.5rem' }}>
                    {activeProjectId ? 'Switch Project' : 'Select a Project to Begin'}
                </h3>
                {/* Create New Card */}
                <div className="project-card create-new">
                    <h3>Create New Project</h3>
                    <div className="form-row">
                        <input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Project Name"
                        />
                        <button className="btn" onClick={handleCreate}><Plus size={16} /> Create</button>
                    </div>
                </div>

                {/* Existing Projects */}
                {projects.map(p => (
                    <div key={p.id} className={`project-card ${activeProjectId === p.id ? 'active' : ''}`}>
                        <h3>{p.name}</h3>
                        <p className="subtitle">Created: {new Date(p.createdAt).toLocaleDateString()}</p>

                        <div className="project-actions">
                            {activeProjectId === p.id ? (
                                <button className="btn" style={{ background: 'var(--color-success)', color: '#000' }} onClick={() => setActiveProject(null)}>
                                    Close Project
                                </button>
                            ) : (
                                <button className="btn" onClick={() => setActiveProject(p.id)}>
                                    Open Project
                                </button>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="icon-btn"
                                    onClick={async () => {
                                        const { SafetyService } = await import('../../services/SafetyService')
                                        await SafetyService.duplicateProject(p.id)
                                        loadProjects()
                                    }}
                                    title="Duplicate Project"
                                >
                                    Duplicate
                                </button>
                                <button
                                    className="icon-btn"
                                    onClick={async () => {
                                        const { ExportService } = await import('../../services/ExportService')
                                        const blob = await ExportService.exportProject(p.id)
                                        const url = URL.createObjectURL(blob)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = `${p.name.replace(/\s+/g, '_')}.storyproject`
                                        a.click()
                                        URL.revokeObjectURL(url)
                                        loadProjects()
                                    }}
                                    title="Export .storyproject"
                                >
                                    Export
                                </button>
                                <button
                                    className="icon-btn danger"
                                    onClick={async () => {
                                        await ProjectService.moveToTrash(p.id)
                                        if (activeProjectId === p.id) setActiveProject(null)
                                        loadProjects()
                                    }}
                                    aria-label="Move to Trash"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
