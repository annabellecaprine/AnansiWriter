import { useState, useEffect } from 'react'

export interface ProjectLockResult {
    isReadOnly: boolean | null;
    isLocked: boolean | null;
    dismiss: () => void;
    retry: () => void;
}

/**
 * Attempts to acquire an exclusive lock for the given project UUID.
 * Returns `isReadOnly: true` if another tab already has the project open.
 * Returns `isReadOnly: false` if this tab successfully acquired the lock.
 * Returns `isReadOnly: null` while the lock state is being determined.
 * Automatically polls in background to recover lock when lingering lock clears.
 */
export function useProjectLock(novelId: string | undefined): ProjectLockResult {
    const [rawIsReadOnly, setRawIsReadOnly] = useState<boolean | null>(null)
    const [isDismissed, setIsDismissed] = useState(false)
    const [retryTrigger, setRetryTrigger] = useState(0)

    useEffect(() => {
        setIsDismissed(false)
        if (!novelId) {
            setRawIsReadOnly(null)
            return
        }

        // Web Locks API support check
        if (typeof navigator === 'undefined' || !navigator.locks) {
            setRawIsReadOnly(false)
            return
        }

        let isMounted = true
        let currentController: AbortController | null = null
        let pollTimer: any = null

        const retryDelays = [200, 450, 900]
        let retryIndex = 0

        const tryAcquireLock = async () => {
            if (!isMounted) return

            const controller = new AbortController()
            currentController = controller

            try {
                await navigator.locks.request(
                    `anansi-project-${novelId}`,
                    { mode: 'exclusive', ifAvailable: true },
                    async (lock) => {
                        if (!isMounted) return

                        if (!lock) {
                            if (retryIndex < retryDelays.length) {
                                const delay = retryDelays[retryIndex++]
                                setTimeout(() => {
                                    if (isMounted) tryAcquireLock()
                                }, delay)
                            } else {
                                setRawIsReadOnly(true)
                                // Keep polling in the background so when the lock frees, we auto-claim it
                                if (!pollTimer && isMounted) {
                                    pollTimer = setInterval(() => {
                                        if (isMounted) tryAcquireLock()
                                    }, 3000)
                                }
                            }
                            return
                        }

                        // Lock successfully acquired
                        if (pollTimer) {
                            clearInterval(pollTimer)
                            pollTimer = null
                        }
                        setRawIsReadOnly(false)

                        // Hold the lock indefinitely until this hook unmounts or aborts
                        return new Promise<void>((resolve) => {
                            controller.signal.addEventListener('abort', () => resolve(), { once: true })
                        })
                    }
                )
            } catch (err: any) {
                if (err.name === 'AbortError') return
                console.warn('Project lock warning:', err)
                if (isMounted) setRawIsReadOnly(false)
            }
        }

        tryAcquireLock()

        return () => {
            isMounted = false
            if (pollTimer) clearInterval(pollTimer)
            if (currentController) {
                currentController.abort()
            }
        }
    }, [novelId, retryTrigger])

    const retry = () => setRetryTrigger(prev => prev + 1)
    const dismiss = () => setIsDismissed(true)

    return {
        isReadOnly: isDismissed ? false : rawIsReadOnly,
        isLocked: rawIsReadOnly,
        dismiss,
        retry
    }
}
