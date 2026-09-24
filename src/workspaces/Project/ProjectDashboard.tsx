import { useEffect, useState } from 'react'
import { ProjectService } from '../../services/ProjectService'
import { useWorkspaceStore } from '../../store/workspaceStore'
import type { Project } from '../../db/schema'
import { Plus, Trash2, Upload } from 'lucide-react'
import ActiveProjectDashboard from './ActiveProjectDashboard'
import ExportModal from '../../components/shared/ExportModal'
import PasswordImportModal from '../../components/shared/PasswordImportModal'

export default function ProjectDashboard() {
    const [projects, setProjects] = useState<Project[]>([])
    const { activeProjectId, setActiveProject } = useWorkspaceStore()
    const [newName, setNewName] = useState('New Project')
    const [exportModalTarget, setExportModalTarget] = useState<{ id: string, name: string } | null>(null)
    const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)
    const [importErrorPass, setImportErrorPass] = useState(false)

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
                        accept=".storyproject,.zip,.docx"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return

                            if (file.name.endsWith('.docx')) {
                                e.target.value = ''
                                alert('DOCX files should be imported directly from an open project via Active Project Dashboard > Quick Actions.')
                                return
                            }

                            try {
                                const { ImportService } = await import('../../services/ImportService')
                                await ImportService.validateAndImportProject(file)
                                loadProjects()
                            } catch (err: any) {
                                if (err.message === 'ENCRYPTED_ARCHIVE') {
                                    setPendingImportFile(file)
                                    setImportErrorPass(false)
                                    e.target.value = ''
                                    return
                                }
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
                            e.target.value = ''
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
                                    onClick={() => setExportModalTarget({ id: p.id, name: p.name })}
                                    title="Export Project/Manuscript"
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

            {exportModalTarget && (
                <ExportModal
                    projectId={exportModalTarget.id}
                    projectName={exportModalTarget.name}
                    onClose={() => setExportModalTarget(null)}
                />
            )}

            {pendingImportFile && (
                <PasswordImportModal
                    incorrect={importErrorPass}
                    onClose={() => {
                        setPendingImportFile(null)
                        setImportErrorPass(false)
                    }}
                    onSubmit={async (pw) => {
                        try {
                            setImportErrorPass(false)
                            const { ImportService } = await import('../../services/ImportService')
                            await ImportService.validateAndImportProject(pendingImportFile, { password: pw })
                            loadProjects()
                            setPendingImportFile(null)
                        } catch (err: any) {
                            if (err.message === 'INCORRECT_PASSWORD') {
                                setImportErrorPass(true)
                            } else if (err.message === 'CollisionDetected') {
                                setPendingImportFile(null)
                                if (window.confirm('A project with this internal ID already exists. Import as a copy?')) {
                                    const { ImportService: IS } = await import('../../services/ImportService')
                                    await IS.validateAndImportProject(pendingImportFile, { importAsCopy: true, password: pw })
                                    loadProjects()
                                }
                            } else {
                                alert(`Import failed: ${err.message}`)
                                setPendingImportFile(null)
                            }
                        }
                    }}
                />
            )}
        </div>
    )
}
