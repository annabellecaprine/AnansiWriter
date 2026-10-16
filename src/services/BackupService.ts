import { exportDB, peakImportFile, importInto } from 'dexie-export-import'
import type { DexieExportJsonMeta } from 'dexie-export-import/dist/json-structure'
import type { ImportProgress } from 'dexie-export-import/dist/import'
import { db } from '../db/database'
import type { ExportProgress } from 'dexie-export-import/dist/export'

export class BackupService {
    static async exportFullSystem(progressCallback?: (progress: ExportProgress) => boolean): Promise<Blob> {
        return await exportDB(db, {
            progressCallback,
            transform: (table, value, key) => {
                // dexie-export-import does not pass 'key' parameter natively for inbound tables (where key is inside the structural value)!
                const actualKey = key !== undefined ? key : value.key;

                // If the key is proxy_configurations, sanitize it!
                if (table === 'appSettings' && actualKey === 'proxy_configurations') {
                    try {
                        const parsed = JSON.parse(value.value);
                        if (Array.isArray(parsed)) {
                            // Erase apiKey, password, tokens or equivalent secrecies aggressively
                            const sanitized = parsed.map(p => {
                                const scrubbed = { ...p };
                                if ('apiKey' in scrubbed) scrubbed.apiKey = '';
                                if ('token' in scrubbed) scrubbed.token = '';
                                if ('password' in scrubbed) scrubbed.password = '';
                                return scrubbed;
                            });
                            return {
                                value: { ...value, value: JSON.stringify(sanitized) },
                                key: actualKey
                            }
                        }
                    } catch {
                        // ignore malformed JSON
                    }
                }

                return { value, key: actualKey };
            },
            filter: (table, value, key) => {
                const actualKey = key !== undefined ? key : value.key;

                // Permanently exclude root API key rows entirely from the exported Blob
                if (table === 'appSettings' && typeof actualKey === 'string' && actualKey.startsWith('api_key_')) {
                    return false;
                }
                return true;
            }
        })
    }

    static async peakBackupMetadata(blob: Blob): Promise<DexieExportJsonMeta> {
        return await peakImportFile(blob)
    }

    static async restoreBackup(blob: Blob, progressCallback?: (progress: ImportProgress) => boolean): Promise<void> {
        return await importInto(db, blob, {
            clearTablesBeforeImport: true,
            acceptMissingTables: true,
            overwriteValues: true,
            progressCallback,
        })
    }
}
