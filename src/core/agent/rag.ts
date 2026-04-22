/**
 * RAG pipeline — index documents (PDF/text) into local store, query via agent.
 * Uses chunking + embedding-free keyword search (BM25-style) for local-first operation.
 */

import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = any;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS rag_documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source TEXT NOT NULL,
  indexed_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS rag_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL
);
CREATE VIRTUAL TABLE IF NOT EXISTS rag_fts USING fts5(content, doc_id UNINDEXED);
`;

export interface RagDocument { id: string; name: string; source: string }
export interface RagChunk { content: string; docName: string; score: number }

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

export class RagPipeline {
  constructor(private db: DB) {
    this.db.exec(SCHEMA);
  }

  /** Index a text file — chunks and inserts into FTS */
  indexFile(filePath: string, docId?: string): RagDocument {
    const name = path.basename(filePath);
    const text = fs.readFileSync(filePath, 'utf-8');
    return this.indexText(text, name, filePath, docId);
  }

  /** Index raw text content */
  indexText(text: string, name: string, source: string, docId?: string): RagDocument {
    const id = docId ?? `doc_${Date.now()}`;
    const chunks = chunkText(text, CHUNK_SIZE, CHUNK_OVERLAP);

    const tx = this.db.transaction(() => {
      this.db.prepare('INSERT OR REPLACE INTO rag_documents (id, name, source) VALUES (?, ?, ?)').run(id, name, source);
      this.db.prepare('DELETE FROM rag_chunks WHERE doc_id = ?').run(id);
      this.db.prepare('DELETE FROM rag_fts WHERE doc_id = ?').run(id);

      const insChunk = this.db.prepare('INSERT INTO rag_chunks (doc_id, content, chunk_index) VALUES (?, ?, ?)');
      const insFts = this.db.prepare('INSERT INTO rag_fts (content, doc_id) VALUES (?, ?)');
      for (let i = 0; i < chunks.length; i++) {
        insChunk.run(id, chunks[i], i);
        insFts.run(chunks[i], id);
      }
    });
    tx();

    return { id, name, source };
  }

  /** Query indexed documents — returns ranked chunks */
  query(q: string, limit = 5): RagChunk[] {
    const rows = this.db.prepare(
      `SELECT f.content, f.doc_id, d.name as docName, rank
       FROM rag_fts f JOIN rag_documents d ON f.doc_id = d.id
       WHERE rag_fts MATCH ? ORDER BY rank LIMIT ?`
    ).all(q, limit) as Array<{ content: string; docName: string; rank: number }>;

    return rows.map((r) => ({ content: r.content, docName: r.docName, score: -r.rank }));
  }

  /** Build context string for injection into agent prompt */
  queryForContext(q: string, limit = 3): string {
    const chunks = this.query(q, limit);
    if (chunks.length === 0) return '';
    return 'Relevant documents:\n' + chunks.map((c) => `[${c.docName}]: ${c.content}`).join('\n\n');
  }

  listDocuments(): RagDocument[] {
    return this.db.prepare('SELECT id, name, source FROM rag_documents ORDER BY indexed_at DESC').all() as RagDocument[];
  }

  removeDocument(docId: string): void {
    this.db.prepare('DELETE FROM rag_documents WHERE id = ?').run(docId);
  }
}

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.slice(i, i + size).trim());
    if (i + size >= text.length) break;
  }
  return chunks.filter(Boolean);
}
