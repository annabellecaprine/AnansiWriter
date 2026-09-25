import { db } from '../db/database'

export interface HierarchyNode {
    id: string
    type: 'Series' | 'Novel' | 'Act' | 'Chapter' | 'Scene'
    name: string
    sortOrder: number
    wordCount: number
    children?: HierarchyNode[]
}

export class WritingService {
    static async getProjectHierarchy(novelId: string): Promise<HierarchyNode[]> {
        const novel = await db.novels.get(novelId)
        if (!novel) return []

        const [acts, chapters, scenes] = await Promise.all([
            db.acts.where({ novelId }).sortBy('sortOrder'),
            db.chapters.where({ novelId }).sortBy('sortOrder'),
            db.scenes.where({ novelId }).sortBy('sortOrder')
        ])

        // Build bottom-up
        const chapterNodes: Record<string, HierarchyNode> = {}
        for (const c of chapters) {
            chapterNodes[c.id] = { id: c.id, type: 'Chapter', name: c.name, sortOrder: c.sortOrder, wordCount: 0, children: [] }
        }

        for (const s of scenes) {
            if (chapterNodes[s.chapterId]) {
                const words = s.wordCount || 0
                chapterNodes[s.chapterId].children!.push({
                    id: s.id,
                    type: 'Scene',
                    name: s.name,
                    sortOrder: s.sortOrder,
                    wordCount: words
                })
                chapterNodes[s.chapterId].wordCount += words
            }
        }

        const actNodes: Record<string, HierarchyNode> = {}
        for (const a of acts) {
            actNodes[a.id] = { id: a.id, type: 'Act', name: a.name, sortOrder: a.sortOrder, wordCount: 0, children: [] }
        }

        const orphanChapters = chapters.filter(c => !c.actId).map(c => chapterNodes[c.id])

        const bookActs = acts.map(a => {
            const actNode = actNodes[a.id]
            actNode.children = chapters.filter(c => c.actId === a.id).map(c => {
                const cNode = chapterNodes[c.id]
                actNode.wordCount += cNode.wordCount
                return cNode
            })
            return actNode
        })

        const allChildren = [...bookActs, ...orphanChapters].sort((x, y) => x.sortOrder - y.sortOrder)
        const node: HierarchyNode = { id: novel.id, type: 'Novel', name: novel.title, sortOrder: novel.seriesIndex || 0, wordCount: 0, children: allChildren }
        node.wordCount = allChildren.reduce((sum, child) => sum + child.wordCount, 0)

        return [node]
    }

    /**
     * Create a new Act
     */
    static async createAct(novelId: string, name: string): Promise<string> {
        const existing = await db.acts.where({ novelId }).toArray()
        const id = crypto.randomUUID()
        const now = Date.now()
        await db.acts.add({
            id,
            novelId,
            name,
            sortOrder: existing.length + 1,
            createdAt: now,
            updatedAt: now
        })
        return id
    }

    /**
     * Create a new Chapter
     */
    static async createChapter(novelId: string, name: string, actId?: string): Promise<string> {
        const existing = await db.chapters.where({ novelId }).toArray()
        const id = crypto.randomUUID()
        const now = Date.now()
        await db.chapters.add({
            id,
            novelId,
            actId: actId || undefined,
            name,
            sortOrder: existing.length + 1,
            createdAt: now,
            updatedAt: now
        })
        return id
    }

    /**
     * Create a new Scene
     */
    static async createScene(novelId: string, chapterId: string, name: string): Promise<string> {
        const existing = await db.scenes.where({ chapterId }).toArray()
        const id = crypto.randomUUID()
        const now = Date.now()
        await db.scenes.add({
            id,
            novelId,
            chapterId,
            name,
            sortOrder: existing.length + 1,
            status: 'Draft',
            wordCount: 0,
            targetWordCount: 1000,
            notes: [],
            content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
            createdAt: now,
            updatedAt: now
        })
        return id
    }

    /**
     * Delete an entity by type
     */
    static async deleteEntity(type: 'Act' | 'Chapter' | 'Scene', id: string): Promise<void> {
        if (type === 'Scene') {
            await db.scenes.delete(id)
            await db.sceneRevisions.where({ sceneId: id }).delete()
        } else if (type === 'Chapter') {
            await db.chapters.delete(id)
            const scenes = await db.scenes.where({ chapterId: id }).toArray()
            for (const s of scenes) {
                await db.scenes.delete(s.id)
                await db.sceneRevisions.where({ sceneId: s.id }).delete()
            }
        } else if (type === 'Act') {
            await db.acts.delete(id)
        }
    }

    /**
     * Rename an entity
     */
    static async renameEntity(type: 'Act' | 'Chapter' | 'Scene', id: string, newName: string): Promise<void> {
        const updatedAt = Date.now()
        if (type === 'Scene') await db.scenes.update(id, { name: newName, updatedAt })
        else if (type === 'Chapter') await db.chapters.update(id, { name: newName, updatedAt })
        else if (type === 'Act') await db.acts.update(id, { name: newName, updatedAt })
    }

    static async updateSortOrder(
        type: 'Series' | 'Novel' | 'Act' | 'Chapter' | 'Scene',
        id: string,
        newOrder: number
    ): Promise<void> {
        switch (type) {
            case 'Series': break; // Series uses generic timestamp sorting conceptually right now
            case 'Novel': await db.novels.update(id, { seriesIndex: newOrder, updatedAt: Date.now() }); break;
            case 'Act': await db.acts.update(id, { sortOrder: newOrder, updatedAt: Date.now() }); break;
            case 'Chapter': await db.chapters.update(id, { sortOrder: newOrder, updatedAt: Date.now() }); break;
            case 'Scene': await db.scenes.update(id, { sortOrder: newOrder, updatedAt: Date.now() }); break;
        }
    }

    static async getScene(sceneId: string): Promise<any> {
        return db.scenes.get(sceneId)
    }

    static async updateSceneContent(sceneId: string, content: object, wordCount: number): Promise<void> {
        await db.scenes.update(sceneId, { content, wordCount, updatedAt: Date.now() })
    }

    static async createSceneRevision(sceneId: string, novelId: string, content: object, wordCount: number): Promise<void> {
        const id = crypto.randomUUID()
        await db.sceneRevisions.add({
            id,
            sceneId,
            novelId,
            content,
            wordCount,
            createdAt: Date.now()
        })
    }
}
