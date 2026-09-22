/**
 * In-Browser Document Text Extraction & Semantic Chunker
 * 
 * Extracts clean text from client-side files (TXT, MD, CSV, JSON, PDF)
 * and partitions content into semantic overlapping chunks for vector embedding.
 */

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  startChar: number;
  endChar: number;
}

export interface ChunkingOptions {
  /** Maximum chunk character length (default: 450 ~80 words) */
  maxChunkSize?: number;
  /** Overlap character count between consecutive chunks (default: 50) */
  overlap?: number;
}

/**
 * Extract text from a browser File object
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const filename = file.name.toLowerCase();

  // 1. Plain Text, Markdown, CSV, TSV, JSON, Code files
  if (
    filename.endsWith('.txt') ||
    filename.endsWith('.md') ||
    filename.endsWith('.csv') ||
    filename.endsWith('.tsv') ||
    filename.endsWith('.json') ||
    filename.endsWith('.yaml') ||
    filename.endsWith('.yml') ||
    filename.endsWith('.log') ||
    filename.endsWith('.py') ||
    filename.endsWith('.js') ||
    filename.endsWith('.ts')
  ) {
    return await file.text();
  }

  // 2. PDF Document Client-Side Text Stream Extraction
  if (filename.endsWith('.pdf')) {
    return await extractTextFromPDF(file);
  }

  // 3. Fallback: attempt reading as UTF-8 text
  try {
    const text = await file.text();
    // Verify if mostly printable ASCII/UTF-8
    const printableChars = text.replace(/[\x20-\x7E\r\n\t]/g, '').length;
    if (printableChars / text.length < 0.25) {
      return text;
    }
  } catch {
    // If text decode fails, fall through
  }

  return `[Extracted Metadata from ${file.name}] Size: ${(file.size / 1024).toFixed(1)} KB, MIME: ${file.type || 'application/octet-stream'}`;
}

/**
 * Lightweight client-side text extractor for PDF documents
 * Extracts textual content streams from raw PDF byte arrays without heavy external dependencies.
 */
async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const textDecoder = new TextDecoder('utf-8');
    const rawPdf = textDecoder.decode(bytes);

    const extractedTextParts: string[] = [];

    // Extract text from PDF text objects: BT ... ET
    const btMatches = rawPdf.match(/BT[\s\S]*?ET/g);
    if (btMatches && btMatches.length > 0) {
      for (const block of btMatches) {
        // Extract Tj string literals: (text) Tj
        const tjMatches = block.match(/\((.*?)\)\s*Tj/g);
        if (tjMatches) {
          for (const tj of tjMatches) {
            const inner = tj.replace(/^\(/, '').replace(/\)\s*Tj$/, '');
            if (inner.trim().length > 0) {
              extractedTextParts.push(cleanPdfString(inner));
            }
          }
        }

        // Extract TJ array literals: [(t1) 12 (t2)] TJ
        const arrayMatches = block.match(/\[(.*?)\]\s*TJ/g);
        if (arrayMatches) {
          for (const arr of arrayMatches) {
            const strings = arr.match(/\((.*?)\)/g);
            if (strings) {
              const joined = strings.map((s) => s.slice(1, -1)).join('');
              if (joined.trim().length > 0) {
                extractedTextParts.push(cleanPdfString(joined));
              }
            }
          }
        }
      }
    }

    if (extractedTextParts.length > 0) {
      return extractedTextParts.join(' ').replace(/\s+/g, ' ').trim();
    }

    // Secondary heuristic: search for printable text sequences inside streams
    const streamMatches = rawPdf.match(/stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g);
    if (streamMatches) {
      for (const s of streamMatches) {
        const cleaned = s
          .replace(/^stream[\r\n]+/, '')
          .replace(/[\r\n]+endstream$/, '')
          .replace(/[^\x20-\x7E\r\n\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleaned.length > 50) {
          extractedTextParts.push(cleaned);
        }
      }
    }

    if (extractedTextParts.length > 0) {
      return extractedTextParts.slice(0, 20).join('\n\n');
    }

    return `[PDF Document: ${file.name}] Raw binary streams analyzed. Client-side OCR ready.`;
  } catch (err: any) {
    return `[PDF Document: ${file.name}] Extraction fallback: ${err.message}`;
  }
}

function cleanPdfString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
}

/**
 * Partition document text into semantic chunks with overlap
 */
export function chunkDocument(text: string, options: ChunkingOptions = {}): DocumentChunk[] {
  const maxChunkSize = options.maxChunkSize ?? 450;
  const overlap = options.overlap ?? 50;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: DocumentChunk[] = [];
  const cleanText = text.replace(/\r\n/g, '\n').trim();

  // Split into paragraphs / logical boundaries first
  const paragraphs = cleanText.split(/\n\s*\n/);
  let currentBuffer = '';
  let startChar = 0;
  let chunkIdx = 0;

  for (const para of paragraphs) {
    const trimmedPara = para.trim();
    if (!trimmedPara) continue;

    // If single paragraph exceeds max size, split by sentences
    if (trimmedPara.length > maxChunkSize) {
      const sentences = trimmedPara.split(/(?<=[.?!])\s+/);
      for (const sentence of sentences) {
        if ((currentBuffer + ' ' + sentence).length > maxChunkSize && currentBuffer.length > 0) {
          chunks.push({
            chunkIndex: chunkIdx++,
            content: currentBuffer.trim(),
            tokenCount: Math.round(currentBuffer.split(/\s+/).length * 1.3),
            startChar,
            endChar: startChar + currentBuffer.length,
          });

          // Carry over overlap
          const words = currentBuffer.split(/\s+/);
          const overlapText = words.slice(-Math.max(1, Math.round(overlap / 7))).join(' ');
          startChar += currentBuffer.length - overlapText.length;
          currentBuffer = overlapText + ' ' + sentence;
        } else {
          currentBuffer = currentBuffer ? currentBuffer + ' ' + sentence : sentence;
        }
      }
    } else {
      if ((currentBuffer + '\n\n' + trimmedPara).length > maxChunkSize && currentBuffer.length > 0) {
        chunks.push({
          chunkIndex: chunkIdx++,
          content: currentBuffer.trim(),
          tokenCount: Math.round(currentBuffer.split(/\s+/).length * 1.3),
          startChar,
          endChar: startChar + currentBuffer.length,
        });

        const words = currentBuffer.split(/\s+/);
        const overlapText = words.slice(-Math.max(1, Math.round(overlap / 7))).join(' ');
        startChar += currentBuffer.length - overlapText.length;
        currentBuffer = overlapText + '\n\n' + trimmedPara;
      } else {
        currentBuffer = currentBuffer ? currentBuffer + '\n\n' + trimmedPara : trimmedPara;
      }
    }
  }

  // Push final remaining chunk
  if (currentBuffer.trim().length > 0) {
    chunks.push({
      chunkIndex: chunkIdx++,
      content: currentBuffer.trim(),
      tokenCount: Math.round(currentBuffer.split(/\s+/).length * 1.3),
      startChar,
      endChar: startChar + currentBuffer.length,
    });
  }

  return chunks;
}
