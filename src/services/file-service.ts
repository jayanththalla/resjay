// ResumeForge AI – File Service
// Handles resume upload (PDF, DOCX, TXT, TEX), Overleaf fetch, DOCX export, PDF download

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

export interface FileResult {
    type: 'latex' | 'text';
    content: string;
    fileName: string;
    success: boolean;
    converted?: boolean;
    conversionNote?: string;
}

class FileService {
    // ─── Universal Resume Upload ────────────────────────────────
    async handleResumeUpload(file: File): Promise<FileResult> {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const name = file.name;

        switch (ext) {
            case 'tex':
                return this._handleLatexUpload(file);
            case 'pdf':
                return this._handlePdfUpload(file);
            case 'docx':
            case 'doc':
                return this._handleDocxUpload(file);
            case 'txt':
                return this._handleTextUpload(file);
            default:
                // Try reading as text
                try {
                    return this._handleTextUpload(file);
                } catch {
                    throw new Error(
                        `Unsupported file format: .${ext}. Supported: .pdf, .docx, .doc, .tex, .txt`
                    );
                }
        }
    }

    // Legacy name kept for backward compatibility
    async handleLatexUpload(file: File): Promise<FileResult> {
        return this.handleResumeUpload(file);
    }

    // ─── LaTeX File Upload ─────────────────────────────────────
    private async _handleLatexUpload(file: File): Promise<FileResult> {
        const content = await this._readFileAsText(file);
        if (!content || content.trim().length === 0) {
            throw new Error('LaTeX file is empty');
        }
        return {
            type: 'latex',
            content,
            fileName: file.name,
            success: true,
        };
    }

    // ─── PDF Upload (extract text) ─────────────────────────────
    private async _handlePdfUpload(file: File): Promise<FileResult> {
        const arrayBuffer = await file.arrayBuffer();

        // Extract text from PDF using a lightweight approach
        // We parse the PDF binary to find text streams
        const text = await this._extractTextFromPdf(arrayBuffer);

        if (!text || text.trim().length < 20) {
            throw new Error(
                'Could not extract text from this PDF. It may be image-based (scanned). ' +
                'Try copying the text manually and using the Paste tab instead.'
            );
        }

        return {
            type: 'text',
            content: text.trim(),
            fileName: file.name,
            success: true,
            converted: true,
            conversionNote:
                'PDF text extracted successfully. The AI will work with the text content. ' +
                'For best results with LaTeX output, the AI will generate a new LaTeX document based on your content.',
        };
    }

    // ─── DOCX Upload (extract text) ────────────────────────────
    private async _handleDocxUpload(file: File): Promise<FileResult> {
        const arrayBuffer = await file.arrayBuffer();
        const text = await this._extractTextFromDocx(arrayBuffer);

        if (!text || text.trim().length < 20) {
            throw new Error(
                'Could not extract text from this DOCX file. ' +
                'Try copying the text manually and using the Paste tab instead.'
            );
        }

        return {
            type: 'text',
            content: text.trim(),
            fileName: file.name,
            success: true,
            converted: true,
            conversionNote:
                'DOCX text extracted successfully. The AI will generate a tailored LaTeX resume from your content.',
        };
    }

    // ─── Plain Text Upload ─────────────────────────────────────
    private async _handleTextUpload(file: File): Promise<FileResult> {
        const content = await this._readFileAsText(file);
        if (!content || content.trim().length === 0) {
            throw new Error('File is empty');
        }

        // Detect if it's actually LaTeX
        const isLatex = content.includes('\\documentclass') || content.includes('\\begin{document}');

        return {
            type: isLatex ? 'latex' : 'text',
            content: content.trim(),
            fileName: file.name,
            success: true,
            converted: !isLatex,
            conversionNote: isLatex
                ? undefined
                : 'Plain text detected. The AI will generate a tailored LaTeX resume from your content.',
        };
    }

    // ─── Overleaf Fetch ────────────────────────────────────────
    async fetchFromOverleaf(shareLink: string): Promise<FileResult> {
        const match = shareLink.match(/(?:read|project)\/([a-zA-Z0-9]+)/);
        if (!match) {
            throw new Error('Invalid Overleaf share link. Expected format: https://www.overleaf.com/read/XXXXX');
        }

        const projectId = match[1];

        try {
            const response = await fetch(`https://www.overleaf.com/read/${projectId}/download/zip`, {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch from Overleaf (HTTP ${response.status}). Make sure the project is publicly shared.`);
            }

            const text = await response.text();
            return {
                type: 'latex',
                content: text,
                fileName: `overleaf_${projectId}.tex`,
                success: true,
            };
        } catch (error: any) {
            throw new Error(`Overleaf fetch failed: ${error.message}. Try downloading the .tex file manually and uploading it.`);
        }
    }

    // ─── Parse Pasted Content ──────────────────────────────────
    parsePastedContent(text: string): FileResult {
        if (!text || text.trim().length === 0) {
            throw new Error('Pasted content is empty');
        }

        const isLatex = text.includes('\\documentclass') || text.includes('\\begin{document}');

        return {
            type: isLatex ? 'latex' : 'text',
            content: text.trim(),
            fileName: isLatex ? 'pasted_resume.tex' : 'pasted_resume.txt',
            success: true,
        };
    }

    // Legacy method name kept for backward compatibility
    parsePastedLatex(text: string): FileResult {
        return this.parsePastedContent(text);
    }

    // ─── Download LaTeX ────────────────────────────────────────
    downloadLatex(content: string, fileName: string = 'resume.tex'): void {
        const blob = new Blob([content], { type: 'text/x-tex' });
        saveAs(blob, fileName);
    }

    // ─── Download as DOCX ──────────────────────────────────────
    async downloadAsDocx(
        latexContent: string,
        fileName: string = 'resume.docx'
    ): Promise<void> {
        const sections = this._parseLatexSections(latexContent);
        const children: Paragraph[] = [];

        const nameMatch = latexContent.match(/\\textbf\{\\Huge.*?\\scshape\s+(.*?)\}/);
        if (nameMatch) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: nameMatch[1].replace(/\\\\/g, ''),
                            bold: true,
                            size: 36,
                            font: 'Calibri',
                        }),
                    ],
                    heading: HeadingLevel.TITLE,
                    spacing: { after: 200 },
                })
            );
        }

        for (const section of sections) {
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: section.title,
                            bold: true,
                            size: 26,
                            font: 'Calibri',
                        }),
                    ],
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 300, after: 100 },
                    border: {
                        bottom: { style: 'single' as any, size: 1, color: '999999' },
                    },
                })
            );

            for (const item of section.items) {
                children.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: item,
                                size: 22,
                                font: 'Calibri',
                            }),
                        ],
                        spacing: { after: 60 },
                        indent: { left: 360 },
                    })
                );
            }
        }

        const doc = new Document({
            sections: [{ properties: {}, children }],
        });

        const blob = await Packer.toBlob(doc);
        saveAs(blob, fileName);
    }

    // ─── Download as PDF (via LaTeX server) ────────────────────
    async compileToPdf(latexContent: string): Promise<Blob> {
        const response = await fetch('https://agentex.onrender.com/compile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latex: latexContent }),
        });

        if (!response.ok) {
            throw new Error(`LaTeX compilation failed (HTTP ${response.status})`);
        }

        return response.blob();
    }

    async downloadAsPdf(
        latexContent: string,
        fileName: string = 'resume.pdf'
    ): Promise<void> {
        const blob = await this.compileToPdf(latexContent);
        saveAs(blob, fileName);
    }

    // ─── PDF Text Extraction (lightweight, no dependencies) ────
    private async _extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
        // Basic PDF text extraction by parsing the binary format
        // Handles most text-based PDFs (not scanned/image PDFs)
        const bytes = new Uint8Array(arrayBuffer);
        const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        const extractedParts: string[] = [];

        // Method 1: Find text between BT...ET blocks (PDF text objects)
        const btEtRegex = /BT\s([\s\S]*?)ET/g;
        let match;
        while ((match = btEtRegex.exec(text)) !== null) {
            const block = match[1];

            // Extract text from Tj (show string) operator
            const tjRegex = /\(([^)]*)\)\s*Tj/g;
            let tjMatch;
            while ((tjMatch = tjRegex.exec(block)) !== null) {
                const decoded = this._decodePdfString(tjMatch[1]);
                if (decoded.trim()) extractedParts.push(decoded);
            }

            // Extract text from TJ (show strings) operator
            const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/gi;
            let tjArrMatch;
            while ((tjArrMatch = tjArrayRegex.exec(block)) !== null) {
                const innerRegex = /\(([^)]*)\)/g;
                let innerMatch;
                let line = '';
                while ((innerMatch = innerRegex.exec(tjArrMatch[1])) !== null) {
                    line += this._decodePdfString(innerMatch[1]);
                }
                if (line.trim()) extractedParts.push(line);
            }
        }

        // Method 2: Fallback – look for readable text patterns
        if (extractedParts.length === 0) {
            // Try to find stream content with readable text
            const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
            while ((match = streamRegex.exec(text)) !== null) {
                const content = match[1];
                // Look for parenthesized strings
                const parenRegex = /\(([^)]{3,})\)/g;
                let pm;
                while ((pm = parenRegex.exec(content)) !== null) {
                    const decoded = this._decodePdfString(pm[1]);
                    if (decoded.trim() && /[a-zA-Z]{2,}/.test(decoded)) {
                        extractedParts.push(decoded);
                    }
                }
            }
        }

        return extractedParts.join('\n');
    }

    private _decodePdfString(s: string): string {
        return s
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
    }

    // ─── DOCX Text Extraction (lightweight XML parsing) ────────
    private async _extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
        // DOCX is a ZIP containing XML files
        // We need to find and parse word/document.xml
        try {
            const bytes = new Uint8Array(arrayBuffer);

            // Simple ZIP parsing to find document.xml
            const files = await this._parseZipEntries(bytes);
            const docXml = files.find(
                (f) => f.name === 'word/document.xml' || f.name.endsWith('/document.xml')
            );

            if (!docXml) {
                throw new Error('Could not find document.xml in DOCX');
            }

            const xmlText = new TextDecoder().decode(docXml.data);

            // Extract text from XML tags
            // Look for <w:t> tags which contain the actual text
            const textParts: string[] = [];
            const paragraphs = xmlText.split(/<\/w:p>/);

            for (const para of paragraphs) {
                const wtRegex = /<w:t[^>]*>([^<]*)<\/w:t>/g;
                let wtMatch;
                let line = '';
                while ((wtMatch = wtRegex.exec(para)) !== null) {
                    line += wtMatch[1];
                }
                if (line.trim()) {
                    textParts.push(line.trim());
                }
            }

            return textParts.join('\n');
        } catch (error: any) {
            // Fallback: try to read any XML text content
            const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
            const parts: string[] = [];
            const wtRegex = /<w:t[^>]*>([^<]+)<\/w:t>/g;
            let m;
            while ((m = wtRegex.exec(text)) !== null) {
                if (m[1].trim()) parts.push(m[1].trim());
            }
            if (parts.length > 0) return parts.join('\n');
            throw new Error('Could not parse DOCX file: ' + error.message);
        }
    }

    // Minimal ZIP parser – finds file entries and decompresses entries
    private async _parseZipEntries(data: Uint8Array): Promise<Array<{ name: string; data: Uint8Array }>> {
        const entries: Array<{ name: string; data: Uint8Array }> = [];
        let offset = 0;

        while (offset < data.length - 4) {
            // Look for local file header signature: PK\x03\x04
            if (data[offset] === 0x50 && data[offset + 1] === 0x4b &&
                data[offset + 2] === 0x03 && data[offset + 3] === 0x04) {

                const compressionMethod = data[offset + 8] | (data[offset + 9] << 8);
                const compressedSize = data[offset + 18] | (data[offset + 19] << 8) |
                    (data[offset + 20] << 16) | (data[offset + 21] << 24);
                const fileNameLength = data[offset + 26] | (data[offset + 27] << 8);
                const extraFieldLength = data[offset + 28] | (data[offset + 29] << 8);

                const fileName = new TextDecoder().decode(
                    data.slice(offset + 30, offset + 30 + fileNameLength)
                );

                const dataStart = offset + 30 + fileNameLength + extraFieldLength;
                const fileData = data.slice(dataStart, dataStart + compressedSize);

                // compression method 0 = stored (no compression)
                if (compressionMethod === 0) {
                    entries.push({ name: fileName, data: fileData });
                } else if (compressionMethod === 8) {
                    // Deflate compressed
                    try {
                        const decompressed = await this._inflate(fileData);
                        entries.push({ name: fileName, data: decompressed });
                    } catch {
                        // Skip compressed entries we can't decompress
                    }
                }

                offset = dataStart + compressedSize;
            } else {
                offset++;
            }
        }

        return entries;
    }

    // Inflate (decompress) deflate data using DecompressionStream (Chrome 80+)
    private async _inflate(data: Uint8Array): Promise<Uint8Array> {
        try {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            const reader = ds.readable.getReader();

            writer.write(data as unknown as BufferSource);
            writer.close();

            const chunks: Uint8Array[] = [];
            let totalLength = 0;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                totalLength += value.length;
            }

            const result = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            return result;
        } catch {
            throw new Error('Failed to decompress');
        }
    }

    // ─── Private Helpers ───────────────────────────────────────
    private _readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    private _parseLatexSections(
        latex: string
    ): Array<{ title: string; items: string[] }> {
        const sections: Array<{ title: string; items: string[] }> = [];
        const sectionRegex = /\\section\{([^}]+)\}([\s\S]*?)(?=\\section\{|\\end\{document\}|$)/gi;
        let match;

        while ((match = sectionRegex.exec(latex)) !== null) {
            const title = match[1].trim();
            const body = match[2];

            const items: string[] = [];
            const itemRegex = /\\resumeItem\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/g;
            let itemMatch;
            while ((itemMatch = itemRegex.exec(body)) !== null) {
                const cleanText = itemMatch[1]
                    .replace(/\\textbf\{([^}]*)\}/g, '$1')
                    .replace(/\\emph\{([^}]*)\}/g, '$1')
                    .replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1')
                    .replace(/\$\|?\$/g, '|')
                    .replace(/\\\\/g, '')
                    .trim();
                if (cleanText) items.push(cleanText);
            }

            const subheadingRegex = /\\resumeSubheading\{([^}]*)\}\{([^}]*)\}\s*\{([^}]*)\}\{([^}]*)\}/g;
            let subMatch;
            while ((subMatch = subheadingRegex.exec(body)) !== null) {
                items.unshift(`${subMatch[1]} – ${subMatch[3]} | ${subMatch[2]} | ${subMatch[4]}`);
            }

            if (items.length === 0) {
                const rawText = body
                    .replace(/\\[a-zA-Z]+\{/g, '')
                    .replace(/\}/g, '')
                    .replace(/\\\\/g, '')
                    .trim();
                if (rawText) items.push(rawText);
            }

            sections.push({ title, items });
        }

        return sections;
    }
}

export const fileService = new FileService();
