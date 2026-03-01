import { NextRequest, NextResponse } from 'next/server';
import {
  getDueScheduledContent,
  updateContentStatus,
  createPublishLog,
  updatePublishLog,
} from '@/lib/content-db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Vercel Cron authentication
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dueItems = await getDueScheduledContent();

  if (dueItems.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, results: [] });
  }

  const results: { id: string; channel: string; status: string; error?: string }[] = [];

  for (const item of dueItems) {
    const channel = item.channel || 'unknown';

    try {
      if (channel === 'brevo') {
        await publishBrevo(item.id, item.title, item.content_body);
        results.push({ id: item.id, channel, status: 'success' });
      } else if (channel === 'blog.apppro.kr') {
        await publishBlog(item.id, item.title, item.content_body, item.pillar, item.metadata);
        results.push({ id: item.id, channel, status: 'success' });
      } else {
        results.push({ id: item.id, channel, status: 'skipped' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ id: item.id, channel, status: 'failed', error: msg });
    }
  }

  return NextResponse.json({ ok: true, processed: dueItems.length, results });
}

async function publishBrevo(
  contentId: string,
  title: string | null,
  contentBody: string | null,
) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  await updateContentStatus(contentId, 'publishing');

  const logId = await createPublishLog({
    content_id: contentId,
    platform_id: 'brevo',
    status: 'pending',
    triggered_by: 'cron',
  });

  const htmlContent = `<html><body><h1>${title || ''}</h1><pre style="white-space:pre-wrap;font-family:sans-serif">${contentBody || ''}</pre></body></html>`;

  const campaignPayload = {
    name: `content-${contentId.slice(0, 8)}`,
    subject: title || '(제목 없음)',
    sender: { name: 'AppPro AI', email: 'contact@apppro.kr' },
    type: 'classic',
    htmlContent,
    recipients: { listIds: [Number(process.env.BREVO_LIST_ID) || 3] },
  };

  try {
    const res = await fetch('https://api.brevo.com/v3/emailCampaigns', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(campaignPayload),
    });

    const body = await res.json();

    if (res.ok && body.id) {
      await updatePublishLog(logId, {
        status: 'success',
        response_status: res.status,
        response_body: JSON.stringify(body),
        published_url: `https://app.brevo.com/campaign/report/${body.id}`,
      });
      await updateContentStatus(contentId, 'published', {});
    } else {
      await updatePublishLog(logId, {
        status: 'failed',
        response_status: res.status,
        response_body: JSON.stringify(body),
        error_message: body.message || 'Brevo API error',
      });
      await updateContentStatus(contentId, 'failed');
      throw new Error(body.message || 'Brevo API error');
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Brevo API')) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    await updatePublishLog(logId, {
      status: 'failed',
      error_message: msg,
    });
    await updateContentStatus(contentId, 'failed');
    throw e;
  }
}

async function publishBlog(
  contentId: string,
  title: string | null,
  contentBody: string | null,
  pillar: string | null,
  metadataStr: string | null,
) {
  const apiKey = process.env.APPPRO_BLOG_API_KEY;
  const apiUrl = process.env.APPPRO_BLOG_API_URL || 'https://apppro.kr/api/blog/publish';
  if (!apiKey) throw new Error('APPPRO_BLOG_API_KEY not configured');

  await updateContentStatus(contentId, 'publishing');

  const logId = await createPublishLog({
    content_id: contentId,
    platform_id: 'blog.apppro.kr',
    status: 'pending',
    triggered_by: 'cron',
  });

  const baseSlug = title
    ? title
        .toLowerCase()
        .replace(/[가-힣]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || `post-${contentId.slice(0, 8)}`
    : `post-${contentId.slice(0, 8)}`;

  const metadata = metadataStr
    ? (() => { try { return JSON.parse(metadataStr); } catch { return {}; } })()
    : {};

  const payload = {
    title: title || '(제목 없음)',
    slug: baseSlug,
    content: contentBody || '',
    category: pillar || 'general',
    tags: metadata.tags || [],
    seo_title: metadata.seo_title || title || '',
    seo_description: metadata.description || '',
    author: 'AppPro AI',
    published: true,
  };

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json();

    if (res.ok && body.success) {
      await updatePublishLog(logId, {
        status: 'success',
        response_status: res.status,
        response_body: JSON.stringify(body),
        published_url: body.url,
      });
      await updateContentStatus(contentId, 'published', {});
    } else {
      await updatePublishLog(logId, {
        status: 'failed',
        response_status: res.status,
        response_body: JSON.stringify(body),
        error_message: body.error || 'Blog API error',
      });
      await updateContentStatus(contentId, 'failed');
      throw new Error(body.error || 'Blog API error');
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('Blog API')) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    await updatePublishLog(logId, {
      status: 'failed',
      error_message: msg,
    });
    await updateContentStatus(contentId, 'failed');
    throw e;
  }
}
