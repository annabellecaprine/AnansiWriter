import type { AnansiDatabase } from './database'

/**
 * Applies database schema migrations for versions > 4.
 * Versions 1–4 are defined as the baseline in database.ts.
 */
export function applyMigrations(_db: AnansiDatabase) {
    _db.version(5).stores({
        assetLinks: 'id, [novelId+assetId], [novelId+targetId], [seriesId+assetId], [seriesId+targetId], novelId, seriesId, assetId, targetId, targetType, role'
    })

    _db.version(6).stores({
        promptCategories: 'id, [novelId+isSystem], novelId, sortOrder',
        prompts: 'id, novelId, seriesId, categoryId, scope, isFavorite, isTrashed'
    })
}
