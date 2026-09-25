import React, { useEffect, useRef } from 'react';

export interface DialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

export function Dialog({ isOpen, onClose, title, children, width = '500px' }: DialogProps) {
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;

        if (isOpen) {
            if (!dialog.open) dialog.showModal();
        } else {
            if (dialog.open) dialog.close();
        }
    }, [isOpen]);

    return (
        <dialog
            ref={dialogRef}
            onCancel={onClose}
            style={{
                padding: 0,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                width: width,
                maxWidth: '90vw',
                maxHeight: '90vh',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                margin: 'auto'
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <header style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--color-surface-hover)'
                }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>{title}</h2>
                    <button
                        onClick={onClose}
                        className="icon-btn"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                    >
                        ✕
                    </button>
                </header>
                <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                    {children}
                </div>
            </div>
            {/* We inject generic backdrop styling through pseudo-element or CSS, but native dialog does this automatically.  */}
            {/* Note: In pure React, if index.css doesn't style ::backdrop, native might be transparent, so we'll add inline style trick or rely on index.css. */}
            <style>{`
                dialog::backdrop {
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(2px);
                }
            `}</style>
        </dialog>
    );
}
