import type { AnansiDatabase } from './database'

/**
 * Applies database schema migrations for versions > 1.
 * Version 1 is defined as the baseline in database.ts.
 */
export function applyMigrations(_db: AnansiDatabase) {
    // Example of how future migrations will be structured:
    //
    // db.version(2).stores({
    //   newTable: 'id, projectId',
    //   projects: 'id, createdAt, newIndex'
    // }).upgrade(tx => {
    //   // data transformation logic here
    // })
}
