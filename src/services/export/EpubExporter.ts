import JSZip from 'jszip';
import type { ExportPackage } from './ExportService';
import { ExportService } from './ExportService';

export class EpubExporter {
    /**
     * Packages a complete Novel structure into an EPUB3 compliant blob.
     */
    static async generateEpub(pkg: ExportPackage): Promise<Blob> {
        const zip = new JSZip();

        // 1. mimetype (Must be uncompressed natively, but jszip handles compression explicitly per file if desired, we add it first)
        zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

        // 2. META-INF
        zip.folder("META-INF")?.file(
            "container.xml",
            `<?xml version="1.0"?>
            <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
                <rootfiles>
                    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
                </rootfiles>
            </container>`
        );

        // 3. Assemble OEBPS / Chapters mapping
        const oebps = zip.folder("OEBPS")!;

        // Setup variables for Manifest and Spine
        let manifestXml = '';
        let spineXml = '';
        let ncxNavMap = '';

        // Build Title Page
        const titleHtml = `<?xml version="1.0" encoding="UTF-8"?>
        <html xmlns="http://www.w3.org/1999/xhtml">
            <head><title>${pkg.novel.title}</title></head>
            <body>
                <h1 style="text-align:center; margin-top:20%">${pkg.novel.title}</h1>
                ${pkg.novel.author ? `<h3 style="text-align:center">${pkg.novel.author}</h3>` : ''}
            </body>
        </html>`;

        oebps.file("title.html", titleHtml);
        manifestXml += `<item id="title" href="title.html" media-type="application/xhtml+xml"/>\n`;
        spineXml += `<itemref idref="title"/>\n`;
        ncxNavMap += `<navPoint id="navPoint-title" playOrder="1">
            <navLabel><text>Title Page</text></navLabel>
            <content src="title.html"/>
        </navPoint>\n`;

        let playOrder = 2;
        let fileId = 1;

        // Collect all organized chapters
        const chaptersWithActs = [];
        const unassignedChapters = pkg.chapters.filter(c => !c.actId);

        for (const c of unassignedChapters) chaptersWithActs.push({ chap: c, act: null });

        const acts = [...pkg.acts].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const act of acts) {
            const actChapters = pkg.chapters.filter(c => c.actId === act.id).sort((a, b) => a.sortOrder - b.sortOrder);
            for (const c of actChapters) chaptersWithActs.push({ chap: c, act: act });
        }

        // Loop over Chapters to generate HTML chunks
        for (const item of chaptersWithActs) {
            const c = item.chap;

            const chapScenes = pkg.scenes.filter(s => s.chapterId === c.id).sort((a, b) => a.sortOrder - b.sortOrder);
            let htmlContent = `<?xml version="1.0" encoding="UTF-8"?>
            <html xmlns="http://www.w3.org/1999/xhtml">
                <head><title>${c.name}</title></head>
                <body>
                    <h2>${c.name}</h2>\n`;

            for (let i = 0; i < chapScenes.length; i++) {
                const s = chapScenes[i];
                htmlContent += ExportService.renderSceneToHTML(s.content);
                if (i < chapScenes.length - 1) {
                    htmlContent += `<div style="text-align:center; margin-top:1em; margin-bottom:1em;">* * *</div>\n`;
                }
            }

            htmlContent += `</body></html>`;
            const fileName = `chapter_${fileId}.html`;
            oebps.file(fileName, htmlContent);

            manifestXml += `<item id="chap_${fileId}" href="${fileName}" media-type="application/xhtml+xml"/>\n`;
            spineXml += `<itemref idref="chap_${fileId}"/>\n`;
            ncxNavMap += `<navPoint id="navPoint-${fileId}" playOrder="${playOrder}">
                <navLabel><text>${c.name}</text></navLabel>
                <content src="${fileName}"/>
            </navPoint>\n`;

            fileId++;
            playOrder++;
        }

        // 4. Generate toc.ncx explicitly
        oebps.file(
            "toc.ncx",
            `<?xml version="1.0" encoding="UTF-8"?>
            <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
                <head>
                    <meta name="dtb:uid" content="${pkg.novel.id}"/>
                    <meta name="dtb:depth" content="1"/>
                    <meta name="dtb:totalPageCount" content="0"/>
                    <meta name="dtb:maxPageNumber" content="0"/>
                </head>
                <docTitle><text>${pkg.novel.title}</text></docTitle>
                <navMap>
                    ${ncxNavMap}
                </navMap>
            </ncx>`
        );

        // 5. Generate content.opf
        oebps.file(
            "content.opf",
            `<?xml version="1.0" encoding="UTF-8"?>
            <package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
                <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
                    <dc:title>${pkg.novel.title}</dc:title>
                    <dc:creator>${pkg.novel.author || 'Unknown'}</dc:creator>
                    <dc:language>en</dc:language>
                    <dc:identifier id="BookId">${pkg.novel.id}</dc:identifier>
                </metadata>
                <manifest>
                    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
                    ${manifestXml}
                </manifest>
                <spine toc="ncx">
                    ${spineXml}
                </spine>
            </package>`
        );

        // Export strictly natively into a browser Blob
        const content = await zip.generateAsync({ type: 'blob' });
        return content;
    }
}
