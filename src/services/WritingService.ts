import { db } from '../db/database'


export interface HierarchyNode {
    id: string
    type: 'Series' | 'Book' | 'Act' | 'Chapter' | 'Scene'
    name: string
    sortOrder: number
    children?: HierarchyNode[]
}

export class WritingService {
    /**
     * Fetches the entire project hierarchy as a deeply nested tree.
     */
    static async getProjectHierarchy(projectId: string): Promise<HierarchyNode[]> {
        const [series, books, acts, chapters, scenes] = await Promise.all([
            db.series.where({ projectId }).sortBy('sortOrder'),
            db.books.where({ projectId }).sortBy('sortOrder'),
            db.acts.where({ projectId }).sortBy('sortOrder'),
            db.chapters.where({ projectId }).sortBy('sortOrder'),
            db.scenes.where({ projectId }).sortBy('sortOrder')
        ])

        // Build the tree bottom-up
        const chapterNodes: Record<string, HierarchyNode> = {}
        for (const c of chapters) {
            chapterNodes[c.id] = { id: c.id, type: 'Chapter', name: c.name, sortOrder: c.sortOrder, children: [] }
        }
        for (const s of scenes) {
            if (chapterNodes[s.chapterId]) {
                chapterNodes[s.chapterId].children!.push({ id: s.id, type: 'Scene', name: s.name, sortOrder: s.sortOrder })
            }
        }

        const actNodes: Record<string, HierarchyNode> = {}
        for (const a of acts) {
            actNodes[a.id] = { id: a.id, type: 'Act', name: a.name, sortOrder: a.sortOrder, children: [] }
        }

        const bookNodes: Record<string, HierarchyNode> = {}
        for (const b of books) {
            const node: HierarchyNode = { id: b.id, type: 'Book', name: b.name, sortOrder: b.sortOrder, children: [] }

            const orphanChapters = chapters.filter(c => c.bookId === b.id && !c.actId).map(c => chapterNodes[c.id])

            const bookActs = acts.filter(a => a.bookId === b.id).map(a => {
                const actNode = actNodes[a.id]
                actNode.children = chapters.filter(c => c.actId === a.id).map(c => chapterNodes[c.id])
                return actNode
            })

            node.children = [...bookActs, ...orphanChapters].sort((x, y) => x.sortOrder - y.sortOrder)
            bookNodes[b.id] = node
        }

        const tree: HierarchyNode[] = []
        for (const s of series) {
            const node: HierarchyNode = { id: s.id, type: 'Series', name: s.name, sortOrder: s.sortOrder, children: [] }
            node.children = books.filter(b => b.seriesId === s.id).map(b => bookNodes[b.id])
            tree.push(node)
        }

        return tree
    }

    /**
     * Updates only the sortOrder of a given entity.
     */
    static async updateSortOrder(
        type: 'Series' | 'Book' | 'Act' | 'Chapter' | 'Scene',
        id: string,
        newOrder: number
    ): Promise<void> {
        switch (type) {
            case 'Series': await db.series.update(id, { sortOrder: newOrder, updatedAt: Date.now() }); break;
            case 'Book': await db.books.update(id, { sortOrder: newOrder, updatedAt: Date.now() }); break;
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

    static async createSceneRevision(sceneId: string, projectId: string, content: object, wordCount: number): Promise<void> {
        // v4 imported inside the file or just use crypto
        const id = crypto.randomUUID()
        await db.sceneRevisions.add({
            id,
            sceneId,
            projectId,
            content,
            wordCount,
            createdAt: Date.now()
        })
    }
}

