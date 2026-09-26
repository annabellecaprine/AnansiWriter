import { useEffect, useState } from 'react'
import { Play, Pause, Target } from 'lucide-react'
import { useWorkspaceStore } from '../../store/workspaceStore'

export default function SprintHUD() {
    const {
        dailyWordCount,
        dailyWordTarget,
        sprintSecondsRemaining,
        isSprintActive,
        startSprint,
        stopSprint,
        tickSprint
    } = useWorkspaceStore()

    const [isHovered, setIsHovered] = useState(false)

    useEffect(() => {
        if (!isSprintActive) return
        const interval = setInterval(() => {
            tickSprint()
        }, 1000)
        return () => clearInterval(interval)
    }, [isSprintActive, tickSprint])

    const progressPct = Math.min(100, Math.round((dailyWordCount / (dailyWordTarget || 1)) * 100))
    const minutes = Math.floor(sprintSecondsRemaining / 60)
    const seconds = sprintSecondsRemaining % 60
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`

    return (
        <div
            className="sprint-hud"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: 'fixed',
                bottom: '1.5rem',
                right: '25rem', // Offset slightly to avoid chat pane overlap if open
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '0.75rem 1.25rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem',
                zIndex: 40, // Below generic popovers but above primary layout
                opacity: isHovered || isSprintActive ? 1 : 0.4,
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                transform: isHovered ? 'translateY(-2px)' : 'none'
            }}
        >
            {/* Daily Goal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '130px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Target size={12} color="var(--color-accent)" />
                        Daily
                    </div>
                    <span style={{ fontFamily: 'monospace' }}>{dailyWordCount} / {dailyWordTarget}</span>
                </div>
                <div style={{ height: '4px', background: 'var(--color-bg)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--color-accent)', transition: 'width 0.3s ease' }} />
                </div>
            </div>

            <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />

            {/* Sprint Timer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Sprint</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, fontFamily: 'monospace', color: sprintSecondsRemaining > 0 ? 'var(--color-accent)' : 'var(--color-text)' }}>
                        {isSprintActive || sprintSecondsRemaining > 0 ? timeString : "15:00"}
                    </span>
                </div>
                <button
                    className={`btn ${isSprintActive ? '' : 'primary'}`}
                    onClick={() => isSprintActive ? stopSprint() : startSprint(15)}
                    style={{ padding: '0.45rem', borderRadius: '50%' }}
                    title={isSprintActive ? "Stop Sprint" : "Start 15min Sprint"}
                >
                    {isSprintActive ? <Pause size={16} color="var(--color-text)" /> : <Play size={16} />}
                </button>
            </div>
        </div>
    )
}
