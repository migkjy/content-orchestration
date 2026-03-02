import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/content-db';

export async function GET() {
  const start = Date.now();
  let dbOk = false;
  let dbError: string | undefined;

  try {
    await ensureSchema();
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const status = dbOk ? 200 : 503;
  return NextResponse.json({
    success: dbOk,
    data: {
      status: dbOk ? 'ok' : 'error',
      db: dbOk ? 'connected' : 'error',
      db_error: dbError ?? null,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  }, { status });
}
