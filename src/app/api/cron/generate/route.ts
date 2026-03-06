import { NextRequest, NextResponse } from 'next/server';
import { getApprovedTopics, updateTopic, createContent, createTopic, ensureSchema, resetStuckGeneratingTopics } from '@/lib/content-db';
import { generateContent } from '@/lib/llm';
import { getTodayTargetSite } from '@/lib/schedule';
import { getSiteConfig, getRandomKeyword, getRandomPillar } from '@/lib/site-prompts';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const MAX_PER_RUN = 3;   // max topics per run
const MAX_RETRIES = 3;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema().catch(() => {});
  await resetStuckGeneratingTopics().catch(() => {});

  // Determine today's target site from rotation schedule
  const targetSite = getTodayTargetSite();

  // Also support manual override via query param: ?site=koreaai
  const urlSite = req.nextUrl.searchParams.get('site');
  const site = urlSite || targetSite;

  if (!site) {
    return NextResponse.json({
      ok: true,
      processed: 0,
      message: 'No site scheduled for today (only Mon/Wed/Fri)',
      results: [],
    });
  }

  const siteConfig = getSiteConfig(site as 'koreaai' | 'apppro' | 'richbukae');

  // Get approved topics for this site
  let topics = await getApprovedTopics(MAX_PER_RUN, site);

  // If no approved topics, auto-generate one
  if (topics.length === 0) {
    const keyword = getRandomKeyword(site as 'koreaai' | 'apppro' | 'richbukae');
    const pillar = getRandomPillar(site as 'koreaai' | 'apppro' | 'richbukae');

    const topicId = await createTopic({
      pillar,
      title: keyword,
      description: `Auto-generated topic for ${site} based on SEO keyword: ${keyword}`,
      content_type: 'blog',
      priority: 1,
      source: 'auto-pipeline',
      target_site: site,
    });

    // Immediately approve the auto-generated topic
    await updateTopic(topicId, { status: 'approved' });
    topics = await getApprovedTopics(1, site);
  }

  if (topics.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, site, results: [] });
  }

  const results: {
    topic_id: string;
    title: string;
    status: string;
    content_id?: string;
    cost_krw?: number;
    error?: string;
    target_site?: string;
  }[] = [];

  for (const topic of topics) {
    if ((topic.retry_count ?? 0) >= MAX_RETRIES) {
      await updateTopic(topic.id, { status: 'rejected', error_message: 'Max retries exceeded' });
      results.push({ topic_id: topic.id, title: topic.title, status: 'rejected', error: 'Max retries exceeded' });
      continue;
    }

    await updateTopic(topic.id, { status: 'generating', error_message: null });

    try {
      const result = await generateContent({
        pillar: topic.pillar,
        title: topic.title,
        content_type: topic.content_type,
        description: topic.description ?? undefined,
        prompt_hint: topic.prompt_hint ?? undefined,
        systemPromptOverride: siteConfig.systemPrompt,
        instructionsOverride: siteConfig.blogInstructions,
      });

      const contentId = await createContent({
        type: topic.content_type,
        pillar: topic.pillar,
        topic: topic.title,
        title: topic.title,
        content_body: result.content,
        priority: topic.priority,
        target_site: site,
        project: site,
      });

      await updateTopic(topic.id, {
        status: 'done',
        generated_content_id: contentId,
        retry_count: 0,
      });

      results.push({
        topic_id: topic.id,
        title: topic.title,
        status: 'done',
        content_id: contentId,
        cost_krw: result.cost_krw,
        target_site: site,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const newRetryCount = (topic.retry_count ?? 0) + 1;
      await updateTopic(topic.id, {
        status: 'approved',
        retry_count: newRetryCount,
        error_message: msg,
      });
      results.push({ topic_id: topic.id, title: topic.title, status: 'failed', error: msg });
    }
  }

  return NextResponse.json({ ok: true, site, processed: topics.length, results });
}
