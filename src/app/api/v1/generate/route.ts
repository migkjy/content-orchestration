import { getTopicById, updateTopic, createContent, ensureSchema } from '@/lib/content-db';
import { generateContent } from '@/lib/gemini';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Vercel Pro: 60s timeout for LLM call
export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const { topic_id } = body;
  if (!topic_id || typeof topic_id !== 'string') return apiError('topic_id is required');

  const topic = await getTopicById(topic_id);
  if (!topic) return apiError('Topic not found', 404);
  if (topic.status !== 'approved') return apiError('Topic must be approved before generation');

  // 상태: generating
  await updateTopic(topic_id, { status: 'generating', error_message: null });

  try {
    const result = await generateContent({
      pillar: topic.pillar,
      title: topic.title,
      content_type: topic.content_type,
      description: topic.description ?? undefined,
      prompt_hint: topic.prompt_hint ?? undefined,
    });

    // content_queue에 초안 삽입
    const contentId = await createContent({
      type: topic.content_type,
      pillar: topic.pillar,
      topic: topic.title,
      title: topic.title,
      content_body: result.content,
      priority: topic.priority,
    });

    // topic 완료 처리
    await updateTopic(topic_id, {
      status: 'done',
      generated_content_id: contentId,
    });

    return apiOk({
      topic_id,
      content_id: contentId,
      tokens_input: result.tokens_input,
      tokens_output: result.tokens_output,
      cost_krw: result.cost_krw,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await updateTopic(topic_id, {
      status: 'approved', // 다음 cron 재시도 위해 approved로 복귀
      retry_count: (topic.retry_count ?? 0) + 1,
      error_message: msg,
    });
    return apiError(`Generation failed: ${msg}`, 500);
  }
}
