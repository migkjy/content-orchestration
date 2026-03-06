import { NextRequest, NextResponse } from 'next/server';
import { getApprovedTopics, updateTopic, createContent, createTopic, ensureSchema, resetStuckGeneratingTopics } from '@/lib/content-db';
import { generateContent } from '@/lib/llm';
import { getTodayTargetSite, type TargetSite } from '@/lib/schedule';
import { getSiteConfig, getRandomKeyword, getRandomPillar } from '@/lib/site-prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Manual trigger: POST /api/blog/generate
// Body: { site?: "koreaai" | "apppro" | "richbukae", topic?: string }
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const apiKey = process.env.CONTENT_OS_API_KEY;
  if (apiKey && authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema().catch(() => {});
  await resetStuckGeneratingTopics().catch(() => {});

  const body = await req.json().catch(() => ({}));
  const site = (body.site || getTodayTargetSite() || 'apppro') as TargetSite;
  const manualTopic = body.topic as string | undefined;

  const siteConfig = getSiteConfig(site);

  // If manual topic provided, create and approve it
  if (manualTopic) {
    const pillar = getRandomPillar(site);
    const topicId = await createTopic({
      pillar,
      title: manualTopic,
      content_type: 'blog',
      priority: 5,
      source: 'manual',
      target_site: site,
    });
    await updateTopic(topicId, { status: 'approved' });
  }

  let topics = await getApprovedTopics(1, site);

  // Auto-generate topic if none available
  if (topics.length === 0) {
    const keyword = getRandomKeyword(site);
    const pillar = getRandomPillar(site);
    const topicId = await createTopic({
      pillar,
      title: keyword,
      description: `Auto-generated for ${site}`,
      content_type: 'blog',
      priority: 1,
      source: 'auto-pipeline',
      target_site: site,
    });
    await updateTopic(topicId, { status: 'approved' });
    topics = await getApprovedTopics(1, site);
  }

  if (topics.length === 0) {
    return NextResponse.json({ ok: false, error: 'No topics available' }, { status: 404 });
  }

  const topic = topics[0];
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
    });

    return NextResponse.json({
      ok: true,
      site,
      topic_id: topic.id,
      content_id: contentId,
      title: topic.title,
      cost_krw: result.cost_krw,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateTopic(topic.id, {
      status: 'approved',
      retry_count: (topic.retry_count ?? 0) + 1,
      error_message: msg,
    });
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
