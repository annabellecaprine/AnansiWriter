import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { WritingService } from './WritingService'
import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'

describe('WritingService', () => {
    const novelId = uuidv4()

    beforeEach(async () => {
        await db.novels.clear()
        await db.acts.clear()
        await db.chapters.clear()
        await db.scenes.clear()
        await db.sceneRevisions.clear()

        // Scaffold a minimal novel
        await db.novels.add({
            id: novelId,
            title: 'Test Novel',
            createdAt: Date.now(),
            updatedAt: Date.now()
        })
    })

    describe('createScene', () => {
        it('should create a scene with correct defaults', async () => {
            const chapterId = await WritingService.createChapter(novelId, 'Ch 1')
            const sceneId = await WritingService.createScene(novelId, chapterId, 'Scene 1')
            const scene = await db.scenes.get(sceneId)

            expect(scene).toBeDefined()
            expect(scene!.name).toBe('Scene 1')
            expect(scene!.status).toBe('Draft')
            expect(scene!.wordCount).toBe(0)
            expect(scene!.novelId).toBe(novelId)
            expect(scene!.chapterId).toBe(chapterId)
        })
    })

    describe('deleteEntity', () => {
        it('should delete a scene and its revisions', async () => {
            const chapterId = await WritingService.createChapter(novelId, 'Ch 1')
            const sceneId = await WritingService.createScene(novelId, chapterId, 'Scene 1')

            // Add a revision
            await WritingService.createSceneRevision(sceneId, novelId, { type: 'doc' }, 0)

            await WritingService.deleteEntity('Scene', sceneId)

            expect(await db.scenes.get(sceneId)).toBeUndefined()
            const revisions = await db.sceneRevisions.where({ sceneId }).toArray()
            expect(revisions).toHaveLength(0)
        })

        it('should delete a chapter and cascade to its scenes', async () => {
            const chapterId = await WritingService.createChapter(novelId, 'Ch 1')
            const sceneId1 = await WritingService.createScene(novelId, chapterId, 'Scene 1')
            const sceneId2 = await WritingService.createScene(novelId, chapterId, 'Scene 2')

            await WritingService.deleteEntity('Chapter', chapterId)

            expect(await db.chapters.get(chapterId)).toBeUndefined()
            expect(await db.scenes.get(sceneId1)).toBeUndefined()
            expect(await db.scenes.get(sceneId2)).toBeUndefined()
        })

        it('should delete an act and reparent its chapters', async () => {
            const actId = await WritingService.createAct(novelId, 'Act 1')
            const chapterId = await WritingService.createChapter(novelId, 'Ch 1', actId)

            await WritingService.deleteEntity('Act', actId)

            expect(await db.acts.get(actId)).toBeUndefined()
            const chapter = await db.chapters.get(chapterId)
            expect(chapter).toBeDefined()
            expect(chapter!.actId).toBeUndefined()
        })
    })

    describe('searchNovelText', () => {
        it('should return empty results for empty query', async () => {
            const results = await WritingService.searchNovelText(novelId, '')
            expect(results).toHaveLength(0)
        })

        it('should handle regex-special characters without crashing', async () => {
            const chapterId = await WritingService.createChapter(novelId, 'Ch 1')
            await WritingService.createScene(novelId, chapterId, 'Scene 1')

            // These characters would break unescaped regex
            const results = await WritingService.searchNovelText(novelId, 'test[.*+?^${}()|')
            expect(results).toHaveLength(0)
        })

        it('should find text within scene content', async () => {
            const chapterId = await WritingService.createChapter(novelId, 'Ch 1')
            const sceneId = await WritingService.createScene(novelId, chapterId, 'Test Scene')

            // Update scene with searchable content
            const content = {
                type: 'doc',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The dragon breathed fire.' }] }]
            }
            await WritingService.updateSceneContent(sceneId, content, 4)

            const results = await WritingService.searchNovelText(novelId, 'dragon')
            expect(results.length).toBeGreaterThanOrEqual(1)
            expect(results[0].sceneName).toBe('Test Scene')
        })
    })

    describe('globalReplaceText', () => {
        it('should replace text and update word count', async () => {
            const chapterId = await WritingService.createChapter(novelId, 'Ch 1')
            const sceneId = await WritingService.createScene(novelId, chapterId, 'Scene 1')

            const content = {
                type: 'doc',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'The old cat sat on the old mat.' }] }]
            }
            await WritingService.updateSceneContent(sceneId, content, 8)

            const count = await WritingService.globalReplaceText(novelId, 'old', 'new')
            expect(count).toBe(2)

            const updated = await db.scenes.get(sceneId)
            expect(updated).toBeDefined()
            // Verify the text was replaced
            const textNode = (updated!.content as any).content[0].content[0]
            expect(textNode.text).toBe('The new cat sat on the new mat.')
        })

        it('should return 0 for empty query', async () => {
            const count = await WritingService.globalReplaceText(novelId, '', 'replacement')
            expect(count).toBe(0)
        })
    })
})
