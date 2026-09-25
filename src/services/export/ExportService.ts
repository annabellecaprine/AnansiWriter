import { db } from '../../db/database';
import type { Novel, Act, Chapter, Scene } from '../../db/schema';
import { generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';

export interface ExportPackage {
    novel: Novel;
    acts: Act[];
    chapters: Chapter[];
    scenes: Scene[];
}

export class ExportService {
    /**
     * Aggregates an entire unified Novel hierarchy into memory strictly ordered by 'sortOrder'.
     */
    static async fetchNovelPackage(novelId: string): Promise<ExportPackage> {
        const novel = await db.novels.get(novelId);
        if (!novel) throw new Error('Novel not found.');

        const acts = await db.acts.where('novelId').equals(novelId).sortBy('sortOrder');
        const chapters = await db.chapters.where('novelId').equals(novelId).sortBy('sortOrder');
        const scenes = await db.scenes.where('novelId').equals(novelId).sortBy('sortOrder');

        return {
            novel,
            acts,
            chapters,
            scenes
        };
    }

    /**
     * Recursively parses TipTap JSON blocks back into sanitized HTML mappings natively
     */
    static renderSceneToHTML(sceneContent: object): string {
        try {
            // Failsafe catch for string representations
            if (typeof sceneContent === 'string') return `<p>${sceneContent}</p>`;
            return generateHTML(sceneContent, [StarterKit]);
        } catch (e) {
            console.error('HTML Render Fault:', e);
            return '<p>[Render Error: Unrecognized schema block]</p>';
        }
    }
}
