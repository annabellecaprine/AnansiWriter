import { db } from '../db/database'
import { v4 as uuidv4 } from 'uuid'
import type { Project, Series, Book, Chapter, Scene } from '../db/schema'

/**
 * Handles project lifecycle: creating empty projects, opening, and listing them.
 */
export class ProjectService {
    /**
     * Scaffolds a new project with a default Series, Book, Chapter, and Scene,
     * then saves it to IndexedDB atomically using a transaction.
     */
    static async createNewProject(name: string): Promise<string> {
        const projectId = uuidv4()
        const now = Date.now()

        const project: Project = {
            id: projectId,
            name,
            createdAt: now,
            updatedAt: now,
            version: 1,
            isTrashed: false,
        }

        const series: Series = {
            id: uuidv4(),
            projectId,
            name: 'Book One', // Default single book series naming convention
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
        }

        const book: Book = {
            id: uuidv4(),
            projectId,
            seriesId: series.id,
            name: 'Book One',
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
        }

        const chapter: Chapter = {
            id: uuidv4(),
            projectId,
            bookId: book.id,
            name: 'Chapter 1',
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
        }

        const scene: Scene = {
            id: uuidv4(),
            projectId,
            bookId: book.id,
            chapterId: chapter.id,
            name: 'Scene 1',
            content: { type: 'doc', content: [{ type: 'paragraph' }] }, // Empty TipTap doc
            status: 'To Do',
            wordCount: 0,
            notes: '',
            sortOrder: 0,
            createdAt: now,
            updatedAt: now,
        }

        // Insert all boilerplate via atomic transaction
        await db.transaction('rw', [db.projects, db.series, db.books, db.chapters, db.scenes], async () => {
            await db.projects.add(project)
            await db.series.add(series)
            await db.books.add(book)
            await db.chapters.add(chapter)
            await db.scenes.add(scene)
        })

        return projectId
    }

    static async listActiveProjects(): Promise<Project[]> {
        // Return all projects that are not trashed, sorted newest first
        const apps = await db.projects.filter(p => !p.isTrashed).toArray()
        return apps.sort((a, b) => b.updatedAt - a.updatedAt)
    }

    static async getProject(projectId: string): Promise<Project | undefined> {
        return db.projects.get(projectId)
    }

    static async renameProject(projectId: string, newName: string): Promise<void> {
        await db.projects.update(projectId, { name: newName, updatedAt: Date.now() })
    }

    static async moveToTrash(projectId: string): Promise<void> {
        await db.projects.update(projectId, { isTrashed: true, trashedAt: Date.now(), updatedAt: Date.now() })
    }

    static async restoreFromTrash(projectId: string): Promise<void> {
        await db.projects.update(projectId, { isTrashed: false, trashedAt: undefined, updatedAt: Date.now() })
    }
}
