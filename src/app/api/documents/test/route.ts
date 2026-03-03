import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client/web';

export async function GET() {
  const url = process.env.KANBAN_DB_URL;
  const token = process.env.KANBAN_DB_TOKEN;

  if (!url || !token) {
    return NextResponse.json({ error: 'missing env vars', url: !!url, token: !!token });
  }

  try {
    const db = createClient({ url, authToken: token });
    const result = await db.execute('SELECT COUNT(*) as cnt FROM documents');
    return NextResponse.json({ ok: true, count: result.rows[0][0] });
  } catch (err: unknown) {
    return NextResponse.json({ error: String(err) });
  }
}
