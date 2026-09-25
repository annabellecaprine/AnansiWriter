import { useEffect, useRef, useState } from 'react'
import { useDialogStore } from '../../store/dialogStore'
import { AlertTriangle, Info, HelpCircle, X } from 'lucide-react'

export default function DialogModal() {
    const {
        isOpen,
        type,
        title,
        message,
        defaultValue,
        placeholder,
        confirmLabel,
        cancelLabel,
        isDestructive,
        allowEmpty,
        validate,
        close
    } = useDialogStore()

    const [inputValue, setInputValue] = useState('')
    const [error, setError] = useState<string | null>(null)

    const modalRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const confirmButtonRef = useRef<HTMLButtonElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    // Save previous activeElement and reset input when modal opens
    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement
            setInputValue(defaultValue || '')
            setError(null)

            // Focus appropriate control on open
            setTimeout(() => {
                if (type === 'prompt' && inputRef.current) {
                    inputRef.current.focus()
                    inputRef.current.select()
                } else if (confirmButtonRef.current) {
                    confirmButtonRef.current.focus()
                }
            }, 50)
        } else {
            // Restore focus when closed
            if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                previousFocusRef.current.focus()
            }
        }
    }, [isOpen, defaultValue, type])

    // Focus trap inside modal
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                handleCancel()
                return
            }

            if (e.key === 'Enter') {
                // If input is focused or Enter is pressed, submit
                e.preventDefault()
                handleConfirm()
                return
            }

            // Focus trapping
            if (e.key === 'Tab' && modalRef.current) {
                const focusables = modalRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                )
                if (focusables.length === 0) return

                const first = focusables[0]
                const last = focusables[focusables.length - 1]

                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, inputValue, type])

    if (!isOpen) return null

    const handleConfirm = () => {
        if (type === 'prompt') {
            const val = inputValue.trim()
            if (validate) {
                const err = validate(val)
                if (err) {
                    setError(err)
                    return
                }
            } else if (!val && !allowEmpty) {
                setError('Input cannot be empty.')
                return
            }
            close(val)
        } else if (type === 'confirm') {
            close(true)
        } else {
            close(true)
        }
    }

    const handleCancel = () => {
        if (type === 'prompt') close(null)
        else if (type === 'confirm') close(false)
        else close(true)
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '1rem'
            }}
            onClick={handleCancel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
        >
            <div
                ref={modalRef}
                onClick={e => e.stopPropagation()}
                style={{
                    background: 'var(--color-surface, #1e1e2e)',
                    border: `1px solid ${isDestructive ? '#dc3545' : 'var(--color-border, #313244)'}`,
                    borderRadius: 'var(--radius-md, 8px)',
                    width: '100%',
                    maxWidth: '440px',
                    boxShadow: isDestructive ? '0 10px 30px rgba(220, 53, 69, 0.25)' : '0 10px 30px rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}
            >
                {/* Dialog Header */}
                <div
                    style={{
                        padding: '1rem 1.25rem',
                        borderBottom: '1px solid var(--color-border, #313244)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isDestructive ? 'rgba(220, 53, 69, 0.1)' : 'transparent'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isDestructive ? (
                            <AlertTriangle size={18} color="#dc3545" />
                        ) : type === 'prompt' ? (
                            <HelpCircle size={18} color="var(--color-primary, #cba6f7)" />
                        ) : (
                            <Info size={18} color="var(--color-primary, #cba6f7)" />
                        )}
                        <h3 id="dialog-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--color-text, #cdd6f4)' }}>
                            {title}
                        </h3>
                    </div>
                    <button
                        onClick={handleCancel}
                        className="btn"
                        style={{ padding: '0.2rem 0.4rem', border: 'none', color: 'var(--color-text-muted, #a6adc8)' }}
                        aria-label="Close dialog"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Dialog Body */}
                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {message && (
                        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted, #a6adc8)', lineHeight: 1.4 }}>
                            {message}
                        </div>
                    )}

                    {type === 'prompt' && (
                        <div>
                            <input
                                ref={inputRef}
                                type="text"
                                className="input"
                                value={inputValue}
                                placeholder={placeholder}
                                onChange={e => { setInputValue(e.target.value); setError(null) }}
                                style={{
                                    width: '100%',
                                    fontSize: '0.9rem',
                                    padding: '0.5rem 0.75rem',
                                    borderColor: error ? '#dc3545' : undefined
                                }}
                            />
                            {error && (
                                <div style={{ color: '#dc3545', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Dialog Footer Actions */}
                <div
                    style={{
                        padding: '0.85rem 1.25rem',
                        borderTop: '1px solid var(--color-border, #313244)',
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: '0.5rem',
                        background: 'var(--color-bg, #181825)'
                    }}
                >
                    {type !== 'alert' && (
                        <button
                            className="btn"
                            onClick={handleCancel}
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                        >
                            {cancelLabel || 'Cancel'}
                        </button>
                    )}

                    <button
                        ref={confirmButtonRef}
                        className={`btn ${isDestructive ? '' : 'primary'}`}
                        onClick={handleConfirm}
                        style={{
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.85rem',
                            backgroundColor: isDestructive ? '#dc3545' : undefined,
                            color: isDestructive ? '#fff' : undefined,
                            borderColor: isDestructive ? '#dc3545' : undefined
                        }}
                    >
                        {confirmLabel || (type === 'alert' ? 'OK' : isDestructive ? 'Delete' : 'Confirm')}
                    </button>
                </div>
            </div>
        </div>
    )
}
