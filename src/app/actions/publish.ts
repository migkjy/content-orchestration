'use server';

import { revalidatePath } from 'next/cache';
import { getContentById, updateContentStatus, createPublishLog, updatePublishLog } from '@/lib/content-db';

export async function publishToBrevo(contentId: string, projectId: string) {
  const content = await getContentById(contentId);
  if (!content) throw new Error('Content not found');

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  // status -> publishing
  await updateContentStatus(contentId, 'publishing');

  const logId = await createPublishLog({
    content_id: contentId,
    platform_id: 'brevo',
    status: 'pending',
    triggered_by: 'manual',
  });

  // Markdown to basic HTML
  const htmlContent = `<html><body><h1>${content.title}</h1><pre style="white-space:pre-wrap;font-family:sans-serif">${content.content_body || ''}</pre></body></html>`;

  const campaignPayload = {
    name: `content-${contentId.slice(0, 8)}`,
    subject: content.title || '(제목 없음)',
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
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updatePublishLog(logId, {
      status: 'failed',
      error_message: msg,
    });
    await updateContentStatus(contentId, 'failed');
  }

  revalidatePath(`/${projectId}/content`);
  revalidatePath(`/${projectId}/content/${contentId}`);
}

export async function publishToBlog(contentId: string, projectId: string) {
  const content = await getContentById(contentId);
  if (!content) throw new Error('Content not found');

  const apiKey = process.env.APPPRO_BLOG_API_KEY;
  const apiUrl = process.env.APPPRO_BLOG_API_URL || 'https://apppro.kr/api/blog/publish';
  if (!apiKey) throw new Error('APPPRO_BLOG_API_KEY not configured');

  await updateContentStatus(contentId, 'publishing');

  const logId = await createPublishLog({
    content_id: contentId,
    platform_id: 'blog.apppro.kr',
    status: 'pending',
    triggered_by: 'manual',
  });

  const baseSlug = content.title
    ? content.title
        .toLowerCase()
        .replace(/[가-힣]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) || `post-${contentId.slice(0, 8)}`
    : `post-${contentId.slice(0, 8)}`;

  const metadata = content.metadata
    ? (() => { try { return JSON.parse(content.metadata!); } catch { return {}; } })()
    : {};

  const payload = {
    title: content.title || '(제목 없음)',
    slug: baseSlug,
    content: content.content_body || '',
    category: content.pillar || 'general',
    tags: metadata.tags || [],
    seo_title: metadata.seo_title || content.title || '',
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
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updatePublishLog(logId, {
      status: 'failed',
      error_message: msg,
    });
    await updateContentStatus(contentId, 'failed');
  }

  revalidatePath(`/${projectId}/content`);
  revalidatePath(`/${projectId}/content/${contentId}`);
}
