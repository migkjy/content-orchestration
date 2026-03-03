// scripts/migrate-docs.mjs
// 실행: npm run sync-docs
// 필요 env: KANBAN_DB_URL, KANBAN_DB_TOKEN, DOCS_ROOT

import { createClient } from '@libsql/client/web';
import { readdir, readFile } from 'fs/promises';
import { join, relative, basename, extname } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DOCS_ROOT = process.env.DOCS_ROOT
  ?? join(__dirname, '..', '..', '..', '..', 'docs');

const db = createClient({
  url: process.env.KANBAN_DB_URL,
  authToken: process.env.KANBAN_DB_TOKEN,
});

function parsePathInfo(filePath) {
  const rel = relative(DOCS_ROOT, filePath);
  const parts = rel.split('/');
  let category = null;
  let doc_date = null;
  if (parts.length >= 1) category = parts[0];
  const dateMatch = rel.match(/(\d{4})\/(\d{2})\/(\d{2})/);
  if (dateMatch) {
    doc_date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  return { category, doc_date };
}

function extractTitle(content, filePath) {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();
  return basename(filePath, extname(filePath))
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function* walkDir(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(fullPath);
    } else if (entry.name.endsWith('.md')) {
      yield fullPath;
    }
  }
}

async function main() {
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

  let count = 0;
  let errors = 0;

  for await (const filePath of walkDir(DOCS_ROOT)) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const title = extractTitle(content, filePath);
      const { category, doc_date } = parsePathInfo(filePath);
      const relPath = relative(DOCS_ROOT, filePath);
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
        args: [randomUUID().replace(/-/g, '').slice(0, 25), title, content, relPath, category, doc_date, now, now],
      });

      count++;
      process.stdout.write(`\r${count}개 처리 중...`);
    } catch (err) {
      console.error(`\n오류 (${filePath}):`, err.message);
      errors++;
    }
  }

  console.log(`\n\n완료: ${count}개 업서트, 오류 ${errors}개`);
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
