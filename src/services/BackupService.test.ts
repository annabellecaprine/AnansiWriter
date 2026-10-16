import 'fake-indexeddb/auto'
import { describe, it, expect, beforeAll } from 'vitest'
import { BackupService } from './BackupService'
import { db } from '../db/database'

describe('BackupService Regression', () => {
    beforeAll(async () => {
        // Clear anything
        await db.appSettings.clear()

        // Insert a fake proxy configuration with a secret API key and fake tokens
        await db.appSettings.put({
            key: 'proxy_configurations',
            value: JSON.stringify([
                {
                    id: 'test-proxy',
                    name: 'Test Proxy',
                    proxyUrl: 'https://test',
                    apiKey: 'sk-super-secret-12345',
                    model: 'test-model',
                    isActive: true,
                    updatedAt: Date.now()
                }
            ]),
            updatedAt: Date.now()
        })
    })

    it('should completely strip apiKey from exported proxy_configurations and retain non-secret properties upon restore', async () => {
        const blob = await BackupService.exportFullSystem()
        const text = await blob.text()

        console.log("Exported TEXT:", text)

        expect(text).not.toContain('sk-super-secret-12345')

        // Let's also assert that the export still has the proxy config itself correctly retaining non-secrets
        expect(text).toContain('test-proxy')
        expect(text).toContain('Test Proxy')

        // --- RESTORATION VERIFICATION ---
        // First wipe the DB entirely simulating a new clean machine
        await db.appSettings.clear()

        // Restore from blob
        await BackupService.restoreBackup(blob)

        // Verify structure using explicit lookup
        const proxyConfigRaw = await db.appSettings.get('proxy_configurations')
        expect(proxyConfigRaw).toBeDefined()
        const configs = JSON.parse(proxyConfigRaw!.value)
        expect(configs).toHaveLength(1)
        expect(configs[0].apiKey).toBe('') // Should be wiped natively securely
        expect(configs[0].proxyUrl).toBe('https://test')
        expect(configs[0].id).toBe('test-proxy')
    })
})
