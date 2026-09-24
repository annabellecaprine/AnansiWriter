import type { ContextAssembly, ContextSource, ContextExclusion } from '../services/ai/ContextEngine'
import { FileText, CheckCircle, XCircle } from 'lucide-react'

interface Props {
    assembly: ContextAssembly | null;
}

export default function ContextPreview({ assembly }: Props) {
    if (!assembly) return (
        <div style={{ padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)' }}>
            Awaiting assembly vectors...
        </div>
    )

    const budgetPercent = Math.min(100, Math.round((assembly.totalEstimatedTokens / assembly.budgetLimit) * 100))
    const isBudgetExceeded = assembly.totalEstimatedTokens >= assembly.budgetLimit

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--color-surface)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>

            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><FileText size={16} /> Context Continuity Assembly</h4>
                <div style={{ fontSize: '0.9rem', color: isBudgetExceeded ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    Est. Tokens: <strong>{assembly.totalEstimatedTokens}</strong> / {assembly.budgetLimit} ({budgetPercent}%)
                </div>
            </header>

            <div style={{ background: 'var(--color-bg)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}>
                <div style={{
                    height: '6px',
                    background: isBudgetExceeded ? 'var(--color-danger)' : 'var(--color-accent)',
                    width: `${budgetPercent}%`,
                    borderRadius: '3px',
                    transition: 'width 0.3s'
                }} />
            </div>

            <div style={{ display: 'flex', gap: '2rem' }}>
                <ul style={{ flex: 1, listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                    <h5 style={{ color: 'var(--color-success)', marginBottom: '0.5rem' }}>✓ Included Objects</h5>
                    {assembly.includedSources.length === 0 && <span style={{ color: 'var(--color-text-muted)' }}>Void.</span>}
                    {assembly.includedSources.map((s: ContextSource) => (
                        <li key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={14} color="var(--color-success)" /> {s.name} ({s.type})</span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>~{s.estimatedTokens} t</span>
                        </li>
                    ))}
                </ul>

                <ul style={{ flex: 1, listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem' }}>
                    <h5 style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>○ Excluded / Truncated</h5>
                    {assembly.excludedSources.length === 0 && <span style={{ color: 'var(--color-text-muted)' }}>Uncompromised mapping.</span>}
                    {assembly.excludedSources.map((s: ContextExclusion) => (
                        <li key={s.id} style={{ padding: '0.2rem 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><XCircle size={14} color="var(--color-danger)" /> {s.name}</div>
                            <div style={{ color: 'var(--color-warning)', fontSize: '0.8rem', marginLeft: '1.2rem' }}>{s.reason}</div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
