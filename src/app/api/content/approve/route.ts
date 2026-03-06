import { NextRequest, NextResponse } from 'next/server';
import { getContentById, updateContentStatus } from '@/lib/content-db';

export const dynamic = 'force-dynamic';

// POST /api/content/approve
// Body: { id: string, action: "approve" | "reject", reason?: string }
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.CONTENT_OS_API_KEY;
  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.action) {
    return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
  }

  const content = await getContentById(body.id);
  if (!content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 });
  }

  if (body.action === 'approve') {
    // Set to scheduled with immediate publish time
    await updateContentStatus(body.id, 'scheduled', {
      approved_by: body.approved_by || 'CEO',
      scheduled_at: body.scheduled_at || Date.now(),
    });

    return NextResponse.json({
      ok: true,
      id: body.id,
      status: 'scheduled',
      message: 'Content approved and scheduled for publish',
    });
  } else if (body.action === 'reject') {
    await updateContentStatus(body.id, 'rejected', {
      rejected_reason: body.reason || 'CEO rejected',
    });

    return NextResponse.json({
      ok: true,
      id: body.id,
      status: 'rejected',
    });
  } else {
    return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject"' }, { status: 400 });
  }
}
