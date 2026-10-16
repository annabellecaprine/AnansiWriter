import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { BibleExporter } from './BibleExporter';
import { db } from '../../db/database';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';

describe('BibleExporter', () => {
    const novelId = uuidv4();
    const seriesId = uuidv4();

    beforeEach(async () => {
        await db.novels.clear();
        await db.series.clear();
        await db.bibleEntries.clear();
        await db.fieldValues.clear();
        await db.relationships.clear();

        await db.series.add({
            id: seriesId,
            title: 'Test Series',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await db.novels.add({
            id: novelId,
            seriesId: seriesId,
            title: 'Test Novel: A New Dawn',
            author: 'Test Author',
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
    });

    it('exports both novel-scoped and series-scoped entries', async () => {
        const novelEntryId = uuidv4();
        const seriesEntryId = uuidv4();

        // 1. Novel-scoped entry
        await db.bibleEntries.add({
            id: novelEntryId,
            novelId,
            name: 'Alice of Wonderland',
            type: 'Character',
            tags: ['protagonist', 'curious'],
            aliases: ['Little Alice'],
            keywords: ['rabbit hole'],
            description: 'A young girl who fell into Wonderland.',
            researchNotes: 'Inspired by Lewis Carroll.',
            alwaysIncludeInContext: true,
            excludeFromContext: false,
            doNotTrack: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // 2. Series-scoped entry (novelId is undefined)
        await db.bibleEntries.add({
            id: seriesEntryId,
            seriesId,
            name: 'The White Queen',
            type: 'Character',
            tags: ['monarch', 'chess'],
            aliases: ['Mirana'],
            keywords: ['palace'],
            description: 'Ruler of Marmoreal.',
            researchNotes: 'Rules with gentle kindness.',
            alwaysIncludeInContext: false,
            excludeFromContext: false,
            doNotTrack: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // Add fields to both entries
        await db.fieldValues.add({
            id: uuidv4(),
            novelId,
            entryId: novelEntryId,
            fieldKey: 'Eye Color',
            value: 'Blue',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // Series entry field has seriesId, not novelId
        await db.fieldValues.add({
            id: uuidv4(),
            seriesId,
            entryId: seriesEntryId,
            fieldKey: 'Crown Material',
            value: 'Silver',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // Discarded field should be ignored
        await db.fieldValues.add({
            id: uuidv4(),
            seriesId,
            entryId: seriesEntryId,
            fieldKey: 'Old Secret',
            value: 'Should not appear',
            state: 'Discarded',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // Add a relationship between them
        await db.relationships.add({
            id: uuidv4(),
            novelId,
            sourceId: novelEntryId,
            targetId: seriesEntryId,
            type: 'Allies',
            isBidirectional: true,
            notes: 'Fought together against the Jabberwocky',
            state: 'Canon',
            validFrom: null,
            validUntil: null,
            provenance: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        const blob = await BibleExporter.exportBible(novelId);
        expect(blob).toBeDefined();

        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(blob);

        // Check index file
        const indexFile = loadedZip.file('codex-index.md');
        expect(indexFile).toBeDefined();
        const indexContent = await indexFile!.async('string');
        expect(indexContent).toContain('# Codex Index');
        expect(indexContent).toContain('Alice of Wonderland');
        expect(indexContent).toContain('The White Queen');

        // Check Alice's file
        const aliceSlug = BibleExporter.slugify('Alice of Wonderland', novelEntryId);
        const aliceFile = loadedZip.file(`${aliceSlug}/entry.md`);
        expect(aliceFile).toBeDefined();
        const aliceContent = await aliceFile!.async('string');
        expect(aliceContent).toContain('name: "Alice of Wonderland"');
        expect(aliceContent).toContain('## Description');
        expect(aliceContent).toContain('A young girl who fell into Wonderland.');
        expect(aliceContent).toContain('- **Eye Color**: Blue');
        expect(aliceContent).toContain('[[The White Queen]]');

        // Check White Queen's file (series-scoped)
        const queenSlug = BibleExporter.slugify('The White Queen', seriesEntryId);
        const queenFile = loadedZip.file(`${queenSlug}/entry.md`);
        expect(queenFile).toBeDefined();
        const queenContent = await queenFile!.async('string');
        expect(queenContent).toContain('name: "The White Queen"');
        expect(queenContent).toContain('- **Crown Material**: Silver');
        expect(queenContent).not.toContain('Old Secret');
    });

    it('excludes trashed entries by default, but includes them if includeTrashed is true', async () => {
        const activeId = uuidv4();
        const trashedId = uuidv4();

        await db.bibleEntries.add({
            id: activeId,
            novelId,
            name: 'Active Character',
            type: 'Character',
            tags: [],
            aliases: [],
            isTrashed: false,
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        await db.bibleEntries.add({
            id: trashedId,
            novelId,
            name: 'Trashed Character',
            type: 'Character',
            tags: [],
            aliases: [],
            isTrashed: true,
            trashedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        });

        // 1. Default (exclude trashed)
        const blob1 = await BibleExporter.exportBible(novelId);
        const zip1 = await new JSZip().loadAsync(blob1);
        const index1 = await zip1.file('codex-index.md')!.async('string');
        expect(index1).toContain('Active Character');
        expect(index1).not.toContain('Trashed Character');

        // 2. Include trashed
        const blob2 = await BibleExporter.exportBible(novelId, { includeTrashed: true });
        const zip2 = await new JSZip().loadAsync(blob2);
        const index2 = await zip2.file('codex-index.md')!.async('string');
        expect(index2).toContain('Active Character');
        expect(index2).toContain('Trashed Character');
    });

    it('slugifies Unicode and accented characters gracefully', () => {
        expect(BibleExporter.slugify('Éowyn of Rohan', 'abc12345-6789')).toBe('éowyn-of-rohan-abc12345');
        expect(BibleExporter.slugify('田中 太郎', 'def12345-6789')).toBe('田中-太郎-def12345');
        expect(BibleExporter.slugify('!!!', '12345678-abcd')).toBe('entry-12345678');
    });

    it('handles multiline TipTap doc in field values', () => {
        const entry: any = {
            id: uuidv4(),
            name: 'Test Entry',
            type: 'Lore / Concept',
            tags: ['test'],
            aliases: ['Alias: Special'],
            keywords: [],
            description: 'Multi-line\n\nDescription paragraph',
            researchNotes: 'Some notes'
        };

        const fields: any[] = [
            {
                fieldKey: 'Backstory',
                value: {
                    type: 'doc',
                    content: [
                        { type: 'paragraph', content: [{ type: 'text', text: 'Paragraph one' }] },
                        { type: 'paragraph', content: [{ type: 'text', text: 'Paragraph two' }] }
                    ]
                }
            }
        ];

        const md = BibleExporter.renderEntry(entry, fields);
        expect(md).toContain('name: "Test Entry"');
        expect(md).toContain('type: "Lore / Concept"');
        expect(md).toContain('## Description\n\nMulti-line\n\nDescription paragraph');
        expect(md).toContain('## Attributes');
        expect(md).toContain('- **Backstory**:');
        expect(md).toContain('    Paragraph one');
        expect(md).toContain('    Paragraph two');
    });

    it('exports codex-definitions.json with categories and relationship types for vault interop', async () => {
        const blob = await BibleExporter.exportBible(novelId);
        const zip = await new JSZip().loadAsync(blob);
        const defFile = zip.file('codex-definitions.json');
        expect(defFile).not.toBeNull();

        const content = await defFile!.async('string');
        const parsed = JSON.parse(content);
        expect(parsed.version).toBe(1);
        expect(Array.isArray(parsed.categories)).toBe(true);
        expect(Array.isArray(parsed.relationshipTypes)).toBe(true);
        expect(parsed.categories.some((c: any) => c.name === 'Character')).toBe(true);
        expect(parsed.relationshipTypes.some((r: any) => r.name === 'Enemy Of')).toBe(true);
    });
});
