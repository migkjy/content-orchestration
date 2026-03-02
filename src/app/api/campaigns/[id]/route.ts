import { NextResponse } from 'next/server';
import { getCampaignById, ensureSchema } from '@/lib/content-db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await ensureSchema().catch(() => {});
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(campaign);
}
