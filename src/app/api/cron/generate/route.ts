import { NextRequest, NextResponse } from 'next/server';
import { getApprovedTopics, updateTopic, createContent, ensureSchema } from '@/lib/content-db';
import { generateContent } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const MAX_PER_RUN = 3;   // 1회 실행당 최대 처리 주제 수
const MAX_RETRIES = 3;   // 최대 재시도 횟수

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema().catch(() => {});

  const topics = await getApprovedTopics(MAX_PER_RUN);

  if (topics.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, results: [] });
  }

  const results: {
    topic_id: string;
    title: string;
    status: string;
    content_id?: string;
    cost_krw?: number;
    error?: string;
  }[] = [];

  for (const topic of topics) {
    // 재시도 초과 시 rejected 처리
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
      });

      const contentId = await createContent({
        type: topic.content_type,
        pillar: topic.pillar,
        topic: topic.title,
        title: topic.title,
        content_body: result.content,
        priority: topic.priority,
      });

      await updateTopic(topic.id, {
        status: 'done',
        generated_content_id: contentId,
      });

      results.push({
        topic_id: topic.id,
        title: topic.title,
        status: 'success',
        content_id: contentId,
        cost_krw: result.cost_krw,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const newRetryCount = (topic.retry_count ?? 0) + 1;
      await updateTopic(topic.id, {
        status: 'approved', // 재시도 대기
        retry_count: newRetryCount,
        error_message: msg,
      });
      results.push({ topic_id: topic.id, title: topic.title, status: 'failed', error: msg });
    }
  }

  return NextResponse.json({ ok: true, processed: topics.length, results });
}
