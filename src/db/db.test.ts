import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './database'
import { ProjectService } from '../services/ProjectService'
import { BibleService } from '../services/BibleService'

describe('Data Layer', () => {
    beforeEach(async () => {
        // Clear Dexie database before each test to ensure test isolation
        await db.delete()
        await db.open()
    })

    it('maintains ID stability after project rename', async () => {
        const projectId = await ProjectService.createNewProject('Old Name')
        let p = await ProjectService.getProject(projectId)
        expect(p?.name).toBe('Old Name')
        expect(p?.id).toBe(projectId)

        await ProjectService.renameProject(projectId, 'New Name')
        p = await ProjectService.getProject(projectId)
        expect(p?.name).toBe('New Name')
        expect(p?.id).toBe(projectId) // Prove ID stability
    })

    it('supports moving to trash and restoring', async () => {
        const projectId = await ProjectService.createNewProject('To Be Trashed')

        await ProjectService.moveToTrash(projectId)
        let active = await ProjectService.listActiveProjects()
        expect(active.length).toBe(0)

        let p = await ProjectService.getProject(projectId)
        expect(p?.isTrashed).toBe(true)
        expect(p?.trashedAt).toBeDefined()

        await ProjectService.restoreFromTrash(projectId)
        active = await ProjectService.listActiveProjects()
        expect(active.length).toBe(1)

        p = await ProjectService.getProject(projectId)
        expect(p?.isTrashed).toBe(false)
        expect(p?.trashedAt).toBeUndefined()
    })

    it('supports FieldValue queries and state filtering on Bible entries', async () => {
        const projectId = await ProjectService.createNewProject('Bible Test')
        const entryId = await BibleService.createEntry(projectId, 'Geralt', 'Character')

        await BibleService.addFieldValue(projectId, entryId, 'eye_color', 'yellow', 'Canon')
        await BibleService.addFieldValue(projectId, entryId, 'occupation', 'witcher', 'Retconned')

        // Test the state filter
        const canonFields = await BibleService.queryFieldsByState(projectId, entryId, 'Canon')
        expect(canonFields.length).toBe(1)
        expect(canonFields[0].fieldKey).toBe('eye_color')

        const retconnedFields = await BibleService.queryFieldsByState(projectId, entryId, 'Retconned')
        expect(retconnedFields.length).toBe(1)
        expect(retconnedFields[0].fieldKey).toBe('occupation')

        // Test the aggregated lookup
        const fullEntry = await BibleService.getEntryWithFields(projectId, entryId)
        expect(fullEntry?.name).toBe('Geralt')
        expect(fullEntry?.fields.length).toBe(2)
    })
})
