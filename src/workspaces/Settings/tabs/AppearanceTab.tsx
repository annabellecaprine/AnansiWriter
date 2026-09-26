import React, { useState, useEffect } from 'react'
import { Sliders, Moon, Sun } from 'lucide-react'

export function AppearanceTab() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark')
    const [fontFamily, setFontFamily] = useState<string>('Inter, sans-serif')
    const [fontSize, setFontSize] = useState<number>(16)
    const [lineHeight, setLineHeight] = useState<number>(1.6)
    const [contentMaxWidth, setContentMaxWidth] = useState<number>(800)
    const [saveSuccess, setSaveSuccess] = useState(false)

    useEffect(() => {
        loadAppearance()
    }, [])

    const loadAppearance = async () => {
        const savedTheme = localStorage.getItem('anansi_theme') || 'dark'
        const font = localStorage.getItem('anansi_font_family') || 'Inter, sans-serif'
        const size = localStorage.getItem('anansi_font_size') || '16'
        const lh = localStorage.getItem('anansi_line_height') || '1.6'
        const width = localStorage.getItem('anansi_content_width') || '800'

        setTheme(savedTheme as 'dark' | 'light')
        setFontFamily(font)
        setFontSize(Number(size))
        setLineHeight(Number(lh))
        setContentMaxWidth(Number(width))
    }

    const handleSaveAppearance = () => {
        localStorage.setItem('anansi_theme', theme)
        localStorage.setItem('anansi_font_family', fontFamily)
        localStorage.setItem('anansi_font_size', String(fontSize))
        localStorage.setItem('anansi_line_height', String(lineHeight))
        localStorage.setItem('anansi_content_width', String(contentMaxWidth))

        document.documentElement.setAttribute('data-theme', theme)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-accent)' }}>
                    <Sliders size={20} /> Typography & Theme Preferences
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Application Color Theme (UI-001)
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                className={`btn ${theme === 'dark' ? 'primary' : 'secondary'}`}
                                onClick={() => setTheme('dark')}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                            >
                                <Moon size={16} /> Dark Mode
                            </button>
                            <button
                                className={`btn ${theme === 'light' ? 'primary' : 'secondary'}`}
                                onClick={() => setTheme('light')}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
                            >
                                <Sun size={16} /> Light Mode
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Editor Font Family (UI-002)
                        </label>
                        <select
                            className="input"
                            style={{ width: '100%' }}
                            value={fontFamily}
                            onChange={e => setFontFamily(e.target.value)}
                        >
                            <option value="Inter, sans-serif">Inter (Sans-Serif Modern)</option>
                            <option value="Georgia, serif">Georgia (Literary Serif)</option>
                            <option value="'Courier Prime', monospace">Courier Prime (Typewriter Monospace)</option>
                            <option value="Roboto, sans-serif">Roboto (Clean Sans)</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Font Size: {fontSize}px (UI-003)
                        </label>
                        <input
                            type="range"
                            min="12"
                            max="24"
                            value={fontSize}
                            onChange={e => setFontSize(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Line Spacing: {lineHeight} (UI-004)
                        </label>
                        <input
                            type="range"
                            min="1.2"
                            max="2.2"
                            step="0.1"
                            value={lineHeight}
                            onChange={e => setLineHeight(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                            Editor Maximum Content Width: {contentMaxWidth}px (UI-005)
                        </label>
                        <input
                            type="range"
                            min="600"
                            max="1200"
                            step="20"
                            value={contentMaxWidth}
                            onChange={e => setContentMaxWidth(Number(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>

                {/* Typography Preview */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                        Manuscript Typography Preview
                    </div>
                    <div
                        style={{
                            fontFamily,
                            fontSize: `${fontSize}px`,
                            lineHeight: lineHeight,
                            maxWidth: `${contentMaxWidth}px`,
                            margin: '0 auto',
                            color: 'var(--color-text)'
                        }}
                    >
                        The obsidian gates opened with a reverberating groan. Standard manuscript formatting preferences do not mutate exported file semantics unless explicitly specified during compilation.
                    </div>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button className="btn primary" onClick={handleSaveAppearance}>
                        Save Appearance Preferences
                    </button>
                    {saveSuccess && (
                        <span style={{ color: '#28a745', fontSize: '0.85rem' }}>Preferences saved!</span>
                    )}
                </div>
            </div>
        </div>
    )
}
