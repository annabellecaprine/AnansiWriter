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

        let isMounted = true
        const controller = new AbortController()

        // Request the lock with ifAvailable to instantly fail if another tab holds it
        navigator.locks.request(
            `anansi-project-${projectId}`,
            { mode: 'exclusive', ifAvailable: true, signal: controller.signal },
            async (lock) => {
                if (!isMounted) return

                if (!lock) {
                    // Lock was not granted because another instance holds it
                    setIsReadOnly(true)
                    return
                }

                // Lock granted cleanly
                setIsReadOnly(false)

                // Hold the lock indefinitely until this hook unmounts
                return new Promise<void>((resolve) => {
                    controller.signal.addEventListener('abort', () => resolve(), { once: true })
                })
            }
        ).catch(err => {
            if (err.name === 'AbortError') return
            console.error('Failed to acquire project lock:', err)
            // Fallback to read-only for safety on weird browser errors
            if (isMounted) setIsReadOnly(true)
        })

        return () => {
            isMounted = false
            controller.abort() // Releases the lock
        }
    }, [projectId])

    return isReadOnly
}
