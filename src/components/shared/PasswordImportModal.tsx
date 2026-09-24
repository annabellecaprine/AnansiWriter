import { useState } from 'react'
import { XCircle, Unlock } from 'lucide-react'

export interface PasswordImportModalProps {
    onClose: () => void
    onSubmit: (password: string) => void
    incorrect?: boolean
}

export default function PasswordImportModal({ onClose, onSubmit, incorrect = false }: PasswordImportModalProps) {
    const [password, setPassword] = useState('')

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'var(--color-surface)', width: '400px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
                    <h2 style={{ margin: 0, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Unlock size={20} /> Encrypted Project</h2>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><XCircle /></button>
                </header>

                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>This .storyproject archive is encrypted. Please enter the password to unlock and import it.</p>

                    {incorrect && <div style={{ color: 'var(--color-warning)', background: 'rgba(255,100,100,0.1)', padding: '0.8rem', borderRadius: '4px' }}>Incorrect password. Please try again.</div>}

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Password:</label>
                        <input
                            type="password"
                            className="input"
                            autoFocus
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') onSubmit(password)
                                if (e.key === 'Escape') onClose()
                            }}
                            style={{ width: '100%', padding: '0.6rem' }}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                        <button className="btn" onClick={onClose}>Cancel</button>
                        <button className="btn active" onClick={() => onSubmit(password)} disabled={!password}>Unlock</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
