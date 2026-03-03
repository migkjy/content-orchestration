import { createClient } from '@libsql/client/web';

// CEO 지시: 문서는 중앙 kanban DB에 저장 (cross-project 공유 문서 허브)
// KANBAN_DB_URL ≠ CONTENT_OS_DB_URL (의도적 분리)
function getKanbanDb() {
  return createClient({
    url: process.env.KANBAN_DB_URL!,
    authToken: process.env.KANBAN_DB_TOKEN!,
  });
}

export interface Document {
  id: string;
  title: string;
  content: string;
  file_path: string;
  category: string | null;
  doc_date: string | null;
  created_at: number;
  updated_at: number;
}

export async function ensureDocumentsSchema() {
  const db = getKanbanDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      category TEXT,
      doc_date TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
}

export async function getDocuments(category?: string): Promise<Document[]> {
  const db = getKanbanDb();
  const sql = category
    ? 'SELECT id, title, file_path, category, doc_date, created_at, updated_at FROM documents WHERE category = ? ORDER BY doc_date DESC, created_at DESC'
    : 'SELECT id, title, file_path, category, doc_date, created_at, updated_at FROM documents ORDER BY doc_date DESC, created_at DESC';
  const args = category ? [category] : [];
  const result = await db.execute({ sql, args });
  return result.rows.map((r) => ({
    id: r[0] as string,
    title: r[1] as string,
    content: '',
    file_path: r[2] as string,
    category: r[3] as string | null,
    doc_date: r[4] as string | null,
    created_at: r[5] as number,
    updated_at: r[6] as number,
  }));
}

export async function getDocument(id: string): Promise<Document | null> {
  const db = getKanbanDb();
  const result = await db.execute({
    sql: 'SELECT id, title, content, file_path, category, doc_date, created_at, updated_at FROM documents WHERE id = ?',
    args: [id],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r[0] as string,
    title: r[1] as string,
    content: r[2] as string,
    file_path: r[3] as string,
    category: r[4] as string | null,
    doc_date: r[5] as string | null,
    created_at: r[6] as number,
    updated_at: r[7] as number,
  };
}

export async function upsertDocument(
  doc: Omit<Document, 'created_at' | 'updated_at'> & { created_at?: number }
): Promise<void> {
  const db = getKanbanDb();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO documents (id, title, content, file_path, category, doc_date, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(file_path) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            category = excluded.category,
            doc_date = excluded.doc_date,
            updated_at = excluded.updated_at`,
    args: [
      doc.id,
      doc.title,
      doc.content,
      doc.file_path,
      doc.category ?? null,
      doc.doc_date ?? null,
      doc.created_at ?? now,
      now,
    ],
  });
}

export async function getCategories(): Promise<string[]> {
  const db = getKanbanDb();
  const result = await db.execute(
    'SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category'
  );
  return result.rows.map((r) => r[0] as string);
}
