// CEO 지시: 문서는 중앙 kanban DB에 저장 (cross-project 공유 문서 허브)
// KANBAN_DB_URL ≠ CONTENT_OS_DB_URL (의도적 분리)
// @libsql/client/web URL 파싱 이슈로 Turso HTTP API 직접 사용

const KANBAN_DB_BASE = process.env.KANBAN_DB_URL ?? '';
const KANBAN_DB_TOKEN = process.env.KANBAN_DB_TOKEN ?? '';

// KANBAN_DB_URL이 libsql:// 형식이면 https:// 로 변환
function getHttpBase(): string {
  return KANBAN_DB_BASE.replace(/^libsql:\/\//, 'https://');
}

async function tursoExecute(sql: string, args: (string | number | null)[] = []): Promise<{ cols: { name: string }[]; rows: unknown[][] }> {
  const base = getHttpBase();
  const res = await fetch(`${base}/v2/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KANBAN_DB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        { type: 'execute', stmt: { sql, args: args.map((v) => v === null ? { type: 'null' } : typeof v === 'number' ? { type: 'integer', value: String(v) } : { type: 'text', value: v }) } },
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Turso HTTP error: ${res.status}`);
  const data = await res.json() as { results: { type: string; response?: { result: { cols: { name: string }[]; rows: { type: string; value?: string }[][] } } }[] };
  const first = data.results[0];
  if (first.type === 'error') throw new Error(`Turso query error: ${JSON.stringify(first)}`);
  const result = first.response!.result;
  const rows = result.rows.map((row) =>
    row.map((cell) => (cell.type === 'null' ? null : cell.type === 'integer' ? parseInt(cell.value!) : cell.value ?? null))
  );
  return { cols: result.cols, rows };
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
  await tursoExecute(`
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
  const sql = category
    ? 'SELECT id, title, file_path, category, doc_date, created_at, updated_at FROM documents WHERE category = ? ORDER BY doc_date DESC, created_at DESC'
    : 'SELECT id, title, file_path, category, doc_date, created_at, updated_at FROM documents ORDER BY doc_date DESC, created_at DESC';
  const args = category ? [category] : [];
  const result = await tursoExecute(sql, args);
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
  const result = await tursoExecute(
    'SELECT id, title, content, file_path, category, doc_date, created_at, updated_at FROM documents WHERE id = ?',
    [id]
  );
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
  const now = Date.now();
  await tursoExecute(
    `INSERT INTO documents (id, title, content, file_path, category, doc_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(file_path) DO UPDATE SET
       title = excluded.title,
       content = excluded.content,
       category = excluded.category,
       doc_date = excluded.doc_date,
       updated_at = excluded.updated_at`,
    [doc.id, doc.title, doc.content, doc.file_path, doc.category ?? null, doc.doc_date ?? null, doc.created_at ?? now, now]
  );
}

export async function getCategories(): Promise<string[]> {
  const result = await tursoExecute(
    'SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category'
  );
  return result.rows.map((r) => r[0] as string);
}
