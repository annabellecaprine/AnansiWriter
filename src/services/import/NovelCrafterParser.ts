import JSZip from 'jszip';
import { v4 as uuidv4 } from 'uuid';

export interface NCDuplicateInfo {
    sourceId: string;
    targetId: string;
    name: string;
    type: string;
}

export interface ImportPackage {
    novel: { title: string };
    acts: Array<{ id: string; name: string; sortOrder: number }>;
    chapters: Array<{ id: string; actId?: string; name: string; sortOrder: number }>;
    scenes: Array<{ id: string; chapterId: string; name: string; prose: string; sortOrder: number }>;
    codexEntries: Array<any>;
    notes: Array<any>; // Actually just mapped to Research Note codex entries.
    warnings: string[];
    duplicates: NCDuplicateInfo[];
    sourceIdMap: Record<string, string>; // Maps NC source IDs to new Anansi UUIDs
}

export class NovelCrafterParser {
    static async parseZip(file: File): Promise<ImportPackage> {
        const zip = new JSZip();
        await zip.loadAsync(file);

        const pkg: ImportPackage = {
            novel: { title: 'Imported Novel' },
            acts: [],
            chapters: [],
            scenes: [],
            codexEntries: [],
            notes: [],
            warnings: [],
            duplicates: [],
            sourceIdMap: {}
        };

        // 1. Process Manuscript (novel.md)
        const novelFile = zip.file('novel.md');
        if (novelFile) {
            const content = await novelFile.async('string');
            this.parseManuscript(content, pkg);
        } else {
            pkg.warnings.push('novel.md not found in ZIP root. Manuscript hierarchy will be empty.');
        }

        // 2. Process Codex (folders)
        await this.parseCodexDirectories(zip, pkg);

        return pkg;
    }

    private static parseManuscript(content: string, pkg: ImportPackage) {
        const lines = content.split('\n');

        let currentActId: string | undefined = undefined;
        let currentChapterId: string | undefined = undefined;
        let currentSceneLines: string[] = [];
        let sceneSort = 0;

        const flushScene = () => {
            if (!currentChapterId) return; // Discard floating text not in a chapter
            const prose = currentSceneLines.join('\n').trim();
            if (prose.length > 0) {
                pkg.scenes.push({
                    id: uuidv4(),
                    chapterId: currentChapterId,
                    name: `Scene ${sceneSort + 1}`,
                    prose: prose,
                    sortOrder: sceneSort
                });
                sceneSort++;
            }
            currentSceneLines = [];
        }

        for (const line of lines) {
            const raw = line.trim();

            if (raw.startsWith('# ')) {
                // Novel Title
                pkg.novel.title = raw.replace(/^#\s*/, '').trim();
                continue;
            }

            if (raw.startsWith('## ')) {
                // Act Boundary
                flushScene();
                currentActId = uuidv4();
                pkg.acts.push({
                    id: currentActId,
                    name: raw.replace(/^##\s*/, '').trim() || 'Untitled Act',
                    sortOrder: pkg.acts.length
                });
                continue;
            }

            if (raw.startsWith('### ')) {
                // Chapter Boundary
                flushScene();
                sceneSort = 0; // Reset scene counter for new chapter
                currentChapterId = uuidv4();
                pkg.chapters.push({
                    id: currentChapterId,
                    actId: currentActId,
                    name: raw.replace(/^###\s*/, '').trim() || 'Untitled Chapter',
                    sortOrder: pkg.chapters.length
                });
                continue;
            }

            if (raw === '* * *' || raw === '***') {
                // Explicit Scene Break
                flushScene();
                continue;
            }

            // Standard Prose Line Accumulation
            currentSceneLines.push(line);
        }

        // Final flush
        flushScene();
    }

    private static async parseCodexDirectories(zip: JSZip, pkg: ImportPackage) {
        // NovelCrafter codex folders: characters/, locations/, lore/, objects/, other/
        const codexFolderNames = ['characters', 'locations', 'lore', 'objects', 'other'];

        // Map NC Folders directly to Anansi Types
        const typeMapping: Record<string, string> = {
            'characters': 'Character',
            'locations': 'Location',
            'lore': 'Lore / Concept',
            'objects': 'Item',
            'other': 'Story Guide' // Or "Other"
        };

        for (const folderName of codexFolderNames) {
            const folder = zip.folder(folderName);
            if (!folder) continue;

            const entriesMap = new Map<string, { entryMd?: string, metadataJson?: string, notesMd?: string }>();

            folder.forEach((relativePath, file) => {
                const parts = relativePath.split('/');
                if (parts.length === 0) return;

                const entryDirName = parts[0];
                const fileName = parts.length > 1 ? parts[1] : '';

                if (!entryDirName || !fileName) return;

                if (!entriesMap.has(entryDirName)) entriesMap.set(entryDirName, {});
                const obj = entriesMap.get(entryDirName)!;

                if (fileName === 'entry.md') obj.entryMd = file.name;
                if (fileName === 'metadata.json') obj.metadataJson = file.name;
                if (fileName === 'notes.md') obj.notesMd = file.name;
            });

            // Process collected entries
            for (const [dirName, obj] of entriesMap.entries()) {
                if (!obj.metadataJson || !obj.entryMd) continue;

                const metaFile = zip.file(obj.metadataJson);
                const entryFile = zip.file(obj.entryMd);

                if (!metaFile || !entryFile) continue;

                const metaRaw = await metaFile.async('string');
                const entryRaw = await entryFile.async('string');

                let notesRaw = '';
                if (obj.notesMd) {
                    const nFile = zip.file(obj.notesMd);
                    if (nFile) notesRaw = await nFile.async('string');
                }

                await this.processSingleCodexEntry(metaRaw, entryRaw, notesRaw, typeMapping[folderName], pkg);
            }
        }
    }

    private static async processSingleCodexEntry(metaRaw: string, entryRaw: string, notesRaw: string, defaultType: string, pkg: ImportPackage) {
        try {
            const metadata = JSON.parse(metaRaw);
            const sourceId = metadata.id || uuidv4();
            const newId = uuidv4();
            pkg.sourceIdMap[sourceId] = newId;

            // Simple Frontmatter parse
            let name = metadata.name || 'Untitled';
            let description = '';
            let type = defaultType;
            let aliases: string[] = [];
            let tags: string[] = [];

            // Simple RegExp extraction for standard frontmatter blocks `---`
            const frontmatterMatch = entryRaw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
            if (frontmatterMatch) {
                const fm = frontmatterMatch[1];
                description = frontmatterMatch[2].trim();

                const nameMatch = fm.match(/^name:\s*(.+)$/m);
                if (nameMatch) name = nameMatch[1].replace(/['"]/g, '').trim();

                const typeMatch = fm.match(/^type:\s*(.+)$/m);
                if (typeMatch) type = typeMatch[1].replace(/['"]/g, '').trim();

                const tagsMatch = fm.match(/^tags:\s*\[([^\]]*)\]/m);
                if (tagsMatch) {
                    tags = tagsMatch[1].split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean);
                }

                const aliasesMatch = fm.match(/^aliases:\s*\[([^\]]*)\]/m);
                if (aliasesMatch) {
                    aliases = aliasesMatch[1].split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean);
                }
            } else {
                description = entryRaw.trim();
            }

            // Create main entity
            const entry: any = {
                id: newId,
                name: name,
                type: type,
                description: description,
                aliases: aliases,
                tags: tags,
                fields: []
            };

            // Process attributes/fields from metadata.json
            if (metadata.attributes && Array.isArray(metadata.attributes)) {
                for (let i = 0; i < metadata.attributes.length; i++) {
                    const attr = metadata.attributes[i];
                    entry.fields.push({
                        id: uuidv4(),
                        name: attr.name || `Field ${i + 1}`,
                        type: 'text',
                        value: attr.value || ''
                    });
                }
            }

            pkg.codexEntries.push(entry);

            // Export private notes as explicit 'Research Note'
            if (notesRaw && notesRaw.trim()) {
                pkg.notes.push({
                    id: uuidv4(),
                    name: `${name} - Notes`,
                    type: 'Research Note',
                    description: notesRaw.trim(),
                    aliases: [],
                    tags: [...tags, 'Imported Note'],
                    fields: [
                        { id: uuidv4(), name: 'Source Subject', type: 'text', value: name }
                    ],
                    excludeFromContext: true
                });
            }

        } catch (e: any) {
            pkg.warnings.push(`Failed to parse codex entry: ${e.message}`);
        }
    }
}
