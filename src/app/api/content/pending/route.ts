import { NextRequest, NextResponse } from 'next/server';
import { getContentQueueFull } from '@/lib/content-db';

export const dynamic = 'force-dynamic';

// GET /api/content/pending?site=koreaai
export async function GET(req: NextRequest) {
  const site = req.nextUrl.searchParams.get('site');

  // Get draft items (pending CEO approval)
  const items = await getContentQueueFull(
    site || undefined,
    'draft',
    undefined,
    undefined,
  );

  return NextResponse.json({
    ok: true,
    count: items.length,
    items: items.map((item) => ({
      id: item.id,
      title: item.title,
      pillar: item.pillar,
      target_site: item.target_site || item.project,
      status: item.status,
      created_at: item.created_at,
      preview: item.content_body?.slice(0, 200),
    })),
  });
}
