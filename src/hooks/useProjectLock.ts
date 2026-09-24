import { useState, useEffect } from 'react'

/**
 * Attempts to acquire an exclusive lock for the given project UUID.
 * Returns `isReadOnly: true` if another tab already has the project open.
 * Returns `isReadOnly: false` if this tab successfully acquired the lock.
 * Returns `isReadOnly: null` while the lock state is being determined.
 */
export function useProjectLock(projectId: string | undefined): boolean | null {
    const [isReadOnly, setIsReadOnly] = useState<boolean | null>(null)

    useEffect(() => {
        if (!projectId) {
            setIsReadOnly(null)
            return
        }

        // Web Locks API support check
        if (typeof navigator === 'undefined' || !navigator.locks) {
            setIsReadOnly(false)
            return
        }

        let isMounted = true
        let currentController: AbortController | null = null

        const tryAcquireLock = async (isRetry = false) => {
            if (!isMounted) return

            const controller = new AbortController()
            currentController = controller

            try {
                await navigator.locks.request(
                    `anansi-project-${projectId}`,
                    { mode: 'exclusive', ifAvailable: true, signal: controller.signal },
                    async (lock) => {
                        if (!isMounted) return

                        if (!lock) {
                            if (!isRetry) {
                                // Wait 150ms to allow previous unmount lock release to process (React Strict Mode / HMR)
                                setTimeout(() => {
                                    if (isMounted) tryAcquireLock(true)
                                }, 150)
                            } else {
                                setIsReadOnly(true)
                            }
                            return
                        }

                        // Lock granted cleanly
                        setIsReadOnly(false)

                        // Hold the lock indefinitely until this hook unmounts or aborts
                        return new Promise<void>((resolve) => {
                            controller.signal.addEventListener('abort', () => resolve(), { once: true })
                        })
                    }
                )
            } catch (err: any) {
                if (err.name === 'AbortError') return
                console.warn('Project lock warning:', err)
                if (isMounted) setIsReadOnly(false)
            }
        }

        tryAcquireLock()

        return () => {
            isMounted = false
            if (currentController) {
                currentController.abort()
            }
        }
    }, [projectId])

    return isReadOnly
}
