import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/shared/AppShell'
import Phase0Spike from './pages/Phase0Spike'
import ProjectDashboard from './workspaces/Project/ProjectDashboard'
import BibleDashboard from './workspaces/Bible/BibleDashboard'
import PlanningDashboard from './workspaces/Planning/PlanningDashboard'
import WritingContainer from './workspaces/Writing/WritingContainer'
import PromptsDashboard from './workspaces/Prompts/PromptsDashboard'
import AIWorkshop from './workspaces/Staging/StagingDashboard'
import StagingSandbox from './workspaces/Staging/StagingSandbox'
import PromptTestingSandbox from './workspaces/Staging/PromptTestingSandbox'
import InferenceTelemetry from './workspaces/Staging/InferenceTelemetry'
import ModelDirectory from './workspaces/Staging/ModelDirectory'
import ReviewWorkspace from './workspaces/Review/ReviewWorkspace'
import './index.css'

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<AppShell />}>
                {/* Default route triggers redirect to /project */}
                <Route index element={<Navigate to="/project" replace />} />

                {/* Workspaces */}
                <Route path="project" element={<ProjectDashboard />} />

                {/* Temporary stubs to test navigation */}
                <Route path="writing" element={<WritingContainer />} />
                <Route path="planning" element={<PlanningDashboard />} />
                <Route path="bible" element={<BibleDashboard />} />
                <Route path="prompts" element={<PromptsDashboard />} />
                <Route path="staging" element={<StagingSandbox />} />
                <Route path="sandbox" element={<PromptTestingSandbox />} />
                <Route path="workshop" element={<AIWorkshop />} />
                <Route path="models" element={<ModelDirectory />} />
                <Route path="metrics" element={<InferenceTelemetry />} />
                <Route path="review" element={<ReviewWorkspace />} />
                <Route path="settings" element={<div className="workspace-view"><h1>Settings</h1></div>} />
            </Route>

            {/* Existing Phase 0 test page */}
            <Route path="/spike" element={<Phase0Spike />} />
        </Routes>
    )
}
