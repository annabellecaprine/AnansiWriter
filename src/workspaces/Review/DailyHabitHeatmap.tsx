import React, { useEffect, useState } from 'react';
import { db } from '../../db/database';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { CalendarDays } from 'lucide-react';

export default function DailyHabitHeatmap() {
    const { activeNovelId } = useWorkspaceStore();
    const [daysObj, setDaysObj] = useState<Record<string, number>>({});
    const [maxHeat, setMaxHeat] = useState(1);

    useEffect(() => {
        if (!activeNovelId) return;

        const buildHabitMatrix = async () => {
            // Aggregate all Scene Revisions to determine chronological diffs
            const revisions = await db.sceneRevisions.where({ novelId: activeNovelId }).toArray();

            const matrix: Record<string, number> = {};
            let localMax = 1;

            // Simple heuristic for now: Map the raw volume of changes (words edited/stored per day)
            // A more rigorous delta would require comparing pairs of snapshots within the same scene.
            revisions.forEach(rev => {
                const d = new Date(rev.createdAt);
                const iso = d.toISOString().split('T')[0]; // YYYY-MM-DD

                if (!matrix[iso]) matrix[iso] = 0;

                // Represent magnitude of writing habit. 
                // We'll count the sheer amount of snapshots * baseline size to proxy effort if deltas aren't calculable.
                matrix[iso] += Math.max(1, rev.wordCount * 0.1);

                if (matrix[iso] > localMax) localMax = matrix[iso];
            });

            // Additionally map AI Requests as effort
            const aiReqs = await db.aiRequestHistory.where({ novelId: activeNovelId }).toArray();
            aiReqs.forEach(req => {
                const d = new Date(req.timestamp);
                const iso = d.toISOString().split('T')[0];
                if (!matrix[iso]) matrix[iso] = 0;
                matrix[iso] += Math.max(1, (req.tokenCount || 0) * 0.05); // Fractional representation of effort

                if (matrix[iso] > localMax) localMax = matrix[iso];
            });

            setDaysObj(matrix);
            setMaxHeat(localMax);
        };

        buildHabitMatrix();
    }, [activeNovelId]);

    // Generate last 365 days
    const totalDays = 365;
    const squares = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Reverse build blocks to fill grid (columns are weeks, rows are Mon-Sun)
    const blocksByWeek: { iso: string, date: Date }[][] = [];
    let currentWeek: { iso: string, date: Date }[] = [];

    for (let i = totalDays; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const iso = d.toISOString().split('T')[0];

        currentWeek.push({ iso, date: d });

        // Push week if hitting Saturday or End
        if (d.getDay() === 6 || i === 0) {
            blocksByWeek.push([...currentWeek]);
            currentWeek = [];
        }
    }

    return (
        <div className="spike-section" style={{ marginTop: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><CalendarDays size={18} /> 365-Day Writing Trajectory</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Observe strict chronological momentum. Intense green blocks indicate massive human-edits or structural AI generation instances.
            </p>

            <div style={{ display: 'flex', gap: '3px', background: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
                {blocksByWeek.map((week, wIdx) => (
                    <div key={`w-${wIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {/* Pad offset if first week doesn't start on Sunday */}
                        {wIdx === 0 && week[0].date.getDay() > 0 && Array.from({ length: week[0].date.getDay() }).map((_, padIdx) => (
                            <div key={`pad-${padIdx}`} style={{ width: '12px', height: '12px' }} />
                        ))}

                        {week.map(day => {
                            const val = daysObj[day.iso] || 0;
                            const intensity = val > 0 ? Math.max(0.2, val / maxHeat) : 0;
                            const bg = val > 0 ? `rgba(0, 200, 100, ${intensity})` : 'rgba(255, 255, 255, 0.05)';

                            return (
                                <div
                                    key={day.iso}
                                    title={`${day.iso} | Effort Block: ${val > 0 ? val.toFixed(0) : 'None'}`}
                                    style={{
                                        width: '12px',
                                        height: '12px',
                                        background: bg,
                                        borderRadius: '2px',
                                        border: val > 0 ? '1px solid rgba(0, 200, 100, 0.2)' : '1px solid rgba(255, 255, 255, 0.02)'
                                    }}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                <span>Less</span>
                <div style={{ width: '10px', height: '10px', background: 'rgba(255, 255, 255, 0.05)' }} />
                <div style={{ width: '10px', height: '10px', background: 'rgba(0, 200, 100, 0.3)' }} />
                <div style={{ width: '10px', height: '10px', background: 'rgba(0, 200, 100, 0.6)' }} />
                <div style={{ width: '10px', height: '10px', background: 'rgba(0, 200, 100, 1)' }} />
                <span>More</span>
            </div>
        </div>
    );
}
