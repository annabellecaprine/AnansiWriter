import React, { useEffect, useState } from 'react';
import { db } from '../../db/database';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { Activity, Zap } from 'lucide-react';

export default function TokenHabitChart() {
    const { activeNovelId } = useWorkspaceStore();
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (!activeNovelId) return;

        const compileData = async () => {
            // Aggregate all AI requests
            const reqs = await db.aiRequestHistory.where({ novelId: activeNovelId }).toArray();

            // Get chapters to group natively
            const chapters = await db.chapters.where({ novelId: activeNovelId }).toArray();
            chapters.sort((a, b) => a.sortOrder - b.sortOrder);
            const scenes = await db.scenes.where({ novelId: activeNovelId }).toArray();

            // Map Scene IDs up to Chapter IDs
            const sceneToChapter: Record<string, string> = {};
            scenes.forEach(s => { sceneToChapter[s.id] = s.chapterId; });

            // Initialize chapter bins
            const bins: Record<string, { name: string, tokens: number, words: number }> = {};
            chapters.forEach((c, idx) => {
                bins[c.id] = { name: `Ch ${idx + 1}: ${c.name}`, tokens: 0, words: 0 };
            });

            // Bin tokens
            reqs.forEach(req => {
                let targetLocId = req.sourceId;
                // If it targetted a scene, map it to the chapter for macro-level viewing
                if (targetLocId && sceneToChapter[targetLocId]) {
                    targetLocId = sceneToChapter[targetLocId];
                }

                // If the prompt explicitly hit a chapter or a scene mapped to one
                if (targetLocId && bins[targetLocId]) {
                    // Cost / Budget
                    bins[targetLocId].tokens += (req.tokenCount || 0);
                }
            });

            // Bin words
            scenes.forEach(s => {
                if (bins[s.chapterId]) {
                    bins[s.chapterId].words += (s.wordCount || 0);
                }
            });

            const dataArr = chapters.map(c => bins[c.id]);
            setChartData(dataArr);
        };

        compileData();
    }, [activeNovelId]);

    return (
        <div className="surface-panel" style={{ marginTop: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}><Zap size={18} /> Resource Burn & Velocity Tracker</h3>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Track manual words written plotted explicitly against AI Token expenditure across your novel's structure.
            </p>

            <div style={{ height: '350px', background: 'var(--color-bg)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} style={{ userSelect: 'none' }} />
                            <YAxis yAxisId="left" orientation="left" stroke="var(--color-accent)" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="right" orientation="right" stroke="var(--color-warning)" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }} />
                            <Legend />
                            <Bar yAxisId="left" dataKey="words" name="Current Word Count" fill="var(--color-accent)" radius={[4, 4, 0, 0]} opacity={0.8} />
                            <Line yAxisId="right" type="monotone" dataKey="tokens" name="AI Tokens Burned" stroke="var(--color-warning)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                        No structural chapter tracking found.
                    </div>
                )}
            </div>
        </div>
    );
}
