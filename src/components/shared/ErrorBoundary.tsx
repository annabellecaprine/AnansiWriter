import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
    children?: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    private handleReload = () => {
        window.location.reload()
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    width: '100vw',
                    backgroundColor: 'var(--aw-surface-deep)',
                    color: 'var(--aw-text-primary)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    padding: '2rem',
                    boxSizing: 'border-box'
                }}>
                    <h1 style={{ marginBottom: '1rem', color: 'var(--aw-danger)' }}>AnansiWriter Encountered an Error</h1>
                    <p style={{ marginBottom: '2rem', maxWidth: '600px', textAlign: 'center', color: 'var(--aw-text-secondary)' }}>
                        We apologize for the interruption. Something unexpected occurred.
                    </p>
                    {this.state.error && (
                        <pre style={{
                            backgroundColor: 'var(--aw-surface-higher)',
                            padding: '1rem',
                            borderRadius: '4px',
                            maxWidth: '100%',
                            overflowX: 'auto',
                            marginBottom: '2rem',
                            fontSize: '0.85rem'
                        }}>
                            {this.state.error.message}
                        </pre>
                    )}
                    <button
                        onClick={this.handleReload}
                        style={{
                            padding: '0.75rem 1.5rem',
                            backgroundColor: 'var(--aw-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
