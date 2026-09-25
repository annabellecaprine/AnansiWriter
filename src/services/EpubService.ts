import JSZip from 'jszip'
import { db } from '../db/database'
export interface EpubConfig {
    title: string;
    author: string;
    publisher?: string;
    seriesName?: string;
    seriesNumber?: number;
    description?: string;
    coverAssetId?: string;
}

export class EpubService {
    /**
     * Converts TipTap JSON to clean XHTML compatible with EPUB bounds.
     */
    static convertTipTapToXhtml(node: any): string {
        if (!node) return ''

        if (Array.isArray(node)) {
            return node.map(this.convertTipTapToXhtml.bind(this)).join('')
        }

        if (node.type === 'doc') {
            return this.convertTipTapToXhtml(node.content || [])
        }

        if (node.type === 'paragraph') {
            return `<p>${this.convertTipTapToXhtml(node.content || [])}</p>`
        }

        if (node.type === 'text') {
            let text = node.text || ''
            // Escape XML entities
            text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

            if (node.marks) {
                node.marks.forEach((mark: any) => {
                    if (mark.type === 'bold') text = `<strong>${text}</strong>`
                    if (mark.type === 'italic') text = `<em>${text}</em>`
                    if (mark.type === 'underline') text = `<u>${text}</u>`
                    if (mark.type === 'link') text = `<a href="${mark.attrs.href}">${text}</a>`
                })
            }
            return text
        }

        if (node.type === 'heading') {
            const level = node.attrs?.level || 1
            return `<h${level}>${this.convertTipTapToXhtml(node.content || [])}</h${level}>`
        }

        if (node.type === 'bulletList') {
            return `<ul>${this.convertTipTapToXhtml(node.content || [])}</ul>`
        }

        if (node.type === 'orderedList') {
            return `<ol>${this.convertTipTapToXhtml(node.content || [])}</ol>`
        }

        if (node.type === 'listItem') {
            return `<li>${this.convertTipTapToXhtml(node.content || [])}</li>`
        }

        if (node.type === 'blockquote') {
            return `<blockquote>${this.convertTipTapToXhtml(node.content || [])}</blockquote>`
        }

        if (node.type === 'horizontalRule' || node.type === 'sceneSeparator') {
            return '<hr/>'
        }

        if (node.type === 'internalLink' || node.type === 'occurrence') {
            // Internal links are stripped to plain text for manuscripts
            return this.convertTipTapToXhtml(node.content || [])
        }

        return ''
    }

    /**
     * Generates an EPUB 3 valid ZIP container directly in the browser.
     */
    static async generateEpub(seriesId: string, _novelId: string, config: EpubConfig): Promise<Blob> {
        const book = await db.novels.get(seriesId)
        if (!book) throw new Error('Book not found')

        // Fetch ordered chapters and scenes
        const chapters = await db.chapters.where({ seriesId }).sortBy('sortOrder')
        const allScenes = await db.scenes.where({ seriesId }).toArray()

        const zip = new JSZip()

        // 1. mimetype (Must be strictly uncompressed, JSZip allows us to write it first safely)
        zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' })

        // 2. META-INF/container.xml
        zip.folder('META-INF')?.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`)

        // OEBPS Directory
        const oebps = zip.folder('OEBPS')!

        // Generate Chapter XHTML files
        let manifestItems = ''
        let spineItems = ''
        let tocNavPoints = ''

        for (let i = 0; i < chapters.length; i++) {
            const chap = chapters[i]
            const scenes = allScenes.filter(s => s.chapterId === chap.id).sort((a, b) => {
                return (a.narrativePosition?.sequence ?? a.sortOrder) - (b.narrativePosition?.sequence ?? b.sortOrder)
            })

            let chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${chap.name}</title>
  <link rel="stylesheet" type="text/css" href="styles.css" />
</head>
<body>
  <h1>${chap.name}</h1>
`
            for (let j = 0; j < scenes.length; j++) {
                if (j > 0) chapterHtml += '<hr/>\n'
                chapterHtml += `<div class="scene">\n`
                chapterHtml += this.convertTipTapToXhtml(scenes[j].content)
                chapterHtml += `\n</div>\n`
            }

            chapterHtml += `</body>\n</html>`
            const chapId = `chapter_${i + 1}`
            const chapFilename = `${chapId}.xhtml`

            oebps.file(chapFilename, chapterHtml)

            manifestItems += `    <item id="${chapId}" href="${chapFilename}" media-type="application/xhtml+xml"/>\n`
            spineItems += `    <itemref idref="${chapId}"/>\n`
            tocNavPoints += `    <navPoint id="navPoint-${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${chap.name}</text></navLabel>
      <content src="${chapFilename}"/>
    </navPoint>\n`
        }

        // Add dummy styles.css
        oebps.file('styles.css', `
body { font-family: serif; line-height: 1.5; padding: 5%; }
h1, h2, h3 { text-align: center; margin-bottom: 1.5em; }
p { text-indent: 1.5em; margin: 0; }
hr { border: 0; text-align: center; margin: 2em 0; }
hr:after { content: '***'; letter-spacing: 1em; }
        `)
        manifestItems += `    <item id="css" href="styles.css" media-type="text/css"/>\n`

        // content.opf
        const uuid = crypto.randomUUID()
        const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${config.title}</dc:title>
    <dc:creator>${config.author}</dc:creator>
    <dc:language>en</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0] + 'Z'}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}  </manifest>
  <spine toc="toc">
${spineItems}  </spine>
</package>`

        oebps.file('content.opf', contentOpf)

        // toc.ncx
        const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${uuid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${config.title}</text></docTitle>
  <navMap>
${tocNavPoints}  </navMap>
</ncx>`
        oebps.file('toc.ncx', tocNcx)

        return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' })
    }
}
