import { Routes, Route, Navigate, Outlet, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useWorkspaceStore } from './store/workspaceStore'
import AppShell from './components/shared/AppShell'
import Phase0Spike from './pages/Phase0Spike'
import LibraryWorkspace from './workspaces/Library/LibraryWorkspace'
import SeriesDashboard from './workspaces/Library/SeriesDashboard'
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
import AssetsWorkspace from './workspaces/Assets/AssetsWorkspace'
import SettingsWorkspace from './workspaces/Settings/SettingsWorkspace'
import ProvenanceExplorer from './pages/ProvenanceExplorer'
import './index.css'

function NovelRouteGuard() {
    const { novelId, seriesId } = useParams()
    const { activeNovelId, setActiveNovel, activeSeriesId, setActiveSeries } = useWorkspaceStore()

    useEffect(() => {
        if (novelId && novelId !== activeNovelId) {
            setActiveNovel(novelId)
        }
        if (seriesId && seriesId !== activeSeriesId) {
            setActiveSeries(seriesId)
        }
    }, [novelId, activeNovelId, setActiveNovel, seriesId, activeSeriesId, setActiveSeries])

    return <Outlet />
}
export default function App() {
    return (
        <Routes>
            <Route path="/" element={<AppShell />}>
                {/* Default route triggers redirect to /library */}
                <Route index element={<Navigate to="/library" replace />} />

                {/* Library Workspaces */}
                <Route path="library" element={
                    <LibraryWorkspace
                        onOpenSeries={(id) => window.location.hash = `#/series/${id}`}
                        onOpenNovel={(id) => window.location.hash = `#/novel/${id}`}
                    />
                } />
                <Route path="series/:seriesId" element={<SeriesDashboard />} />
                <Route path="settings" element={<SettingsWorkspace />} />

                {/* Global Auxiliary Paths kept for backward compat or generic access */}
                <Route path="sandbox" element={<PromptTestingSandbox />} />
                <Route path="workshop" element={<AIWorkshop />} />
                <Route path="models" element={<ModelDirectory />} />
                <Route path="metrics" element={<InferenceTelemetry />} />

                {/* Novel-Centric Workspaces */}
                <Route path="novel/:novelId" element={<NovelRouteGuard />}>
                    <Route index element={<Navigate to="plan" replace />} />
                    <Route path="write" element={<WritingContainer />} />
                    <Route path="plan" element={<PlanningDashboard />} />
                    <Route path="codex" element={<BibleDashboard />} />
                    <Route path="assets" element={<AssetsWorkspace />} />
                    <Route path="prompts" element={<PromptsDashboard />} />
                    <Route path="staging" element={<StagingSandbox />} />
                    <Route path="review" element={<ReviewWorkspace />} />
                </Route>
            </Route>

            {/* Existing Phase 0 test page */}
            <Route path="/spike" element={<Phase0Spike />} />

            {/* Global Auxiliary Pages */}
            <Route path="/provenance" element={<ProvenanceExplorer />} />
        </Routes>
    )
}
