import type { AnansiDatabase } from './database'

/**
 * Applies database schema migrations for versions > 1.
 * Version 1 is defined as the baseline in database.ts.
 */
export function applyMigrations(_db: AnansiDatabase) {
    _db.version(2).stores({
        assetLinks: 'id, [projectId+assetId], [projectId+targetId], projectId, assetId, targetId, targetType, role'
    })

    _db.version(3).stores({
        promptCategories: 'id, [projectId+isSystem], projectId, sortOrder',
        prompts: 'id, projectId, categoryId, scope, isFavorite, isTrashed'
    })
}
