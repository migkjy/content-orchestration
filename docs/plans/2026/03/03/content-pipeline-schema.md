# 콘텐츠 파이프라인 설계 & DB 스키마 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** content-orchestration 프로젝트에 주제 큐(topic_queue) → LLM 자동 생성(Gemini 2.0 Flash) → content_queue 등록 → Vercel Cron 자동 발행 전체 파이프라인 구축

**Architecture:** 기존 Turso(LibSQL) DB(`CONTENT_OS_DB_URL`)에 `topic_queue` 테이블 추가. 주제 승인 시 `/api/v1/generate`가 Gemini 2.0 Flash를 호출해 `content_queue`에 초안 삽입. Vercel Cron(`/api/cron/generate`)이 매시간 `approved` 주제를 자동 생성. 기존 `/api/cron/publish`가 그대로 scheduled→published 처리.

**Tech Stack:** Next.js 15 App Router, Turso LibSQL (`@libsql/client/web`), Gemini 2.0 Flash REST API, Vercel Cron

**DB 주의사항:**
- NeonDB 사용 안 함 — 기존 `CONTENT_OS_DB_URL` (Turso) 그대로 사용
- `ensureSchema()` 패턴: ALTER TABLE ... CATCH 방식으로 idempotent
- 앱 런타임에서 DROP/TRUNCATE 절대 금지

**인증 패턴:** 모든 `/api/v1/*` 라우트는 `requireAuth(request)` 사용 (Authorization: Bearer CONTENT_OS_API_KEY)

---

### Task 1: topic_queue DB 스키마 + content-db.ts 확장

**Files:**
- Modify: `src/lib/content-db.ts`

**Step 1: content-db.ts에 TopicQueueItem 인터페이스 추가**

`ensureSchema()` 함수 바로 위, 기존 `PipelineLog` 인터페이스 뒤에 추가:

```typescript
export interface TopicQueueItem {
  id: string;
  pillar: string;                    // ai_automation | mvp_dev | gov_support | maintenance | general
  title: string;
  description: string | null;
  content_type: string;              // blog | newsletter | social | youtube
  status: string;                    // pending | approved | generating | done | rejected
  priority: number;
  source: string | null;             // manual | rss | idea
  tags: string | null;               // JSON array string e.g. '["AI","자동화"]'
  prompt_hint: string | null;        // LLM에 전달할 추가 지시사항
  generated_content_id: string | null; // 생성 완료 시 content_queue.id FK
  retry_count: number;
  error_message: string | null;
  created_at: number;
  updated_at: number;
}
```

**Step 2: ensureSchema()에 topic_queue 테이블 생성 추가**

기존 `ensureSchema()` 함수 내 마지막 `content_comments` 블록 뒤에 추가:

```typescript
// topic_queue 테이블
await db.execute(`
  CREATE TABLE IF NOT EXISTS topic_queue (
    id TEXT PRIMARY KEY,
    pillar TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT NOT NULL DEFAULT 'blog',
    status TEXT NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    source TEXT,
    tags TEXT,
    prompt_hint TEXT,
    generated_content_id TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`).catch(() => {});
```

**Step 3: CRUD 함수 추가 (content-db.ts 끝에 추가)**

```typescript
// === TOPIC QUEUE ===

export async function getTopics(
  filter?: { pillar?: string; status?: string; content_type?: string },
  dbUrl?: string,
  dbToken?: string
): Promise<TopicQueueItem[]> {
  const db = getContentDb(dbUrl, dbToken);
  const conditions: string[] = [];
  const args: string[] = [];

  if (filter?.pillar) { conditions.push('pillar = ?'); args.push(filter.pillar); }
  if (filter?.status) { conditions.push('status = ?'); args.push(filter.status); }
  if (filter?.content_type) { conditions.push('content_type = ?'); args.push(filter.content_type); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.execute({
    sql: `SELECT * FROM topic_queue ${where} ORDER BY priority DESC, created_at DESC LIMIT 100`,
    args,
  });
  return result.rows as unknown as TopicQueueItem[];
}

export async function getTopicById(id: string, dbUrl?: string, dbToken?: string): Promise<TopicQueueItem | null> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({ sql: 'SELECT * FROM topic_queue WHERE id = ? LIMIT 1', args: [id] });
  return result.rows[0] ? (result.rows[0] as unknown as TopicQueueItem) : null;
}

export async function createTopic(data: {
  pillar: string;
  title: string;
  description?: string;
  content_type: string;
  priority?: number;
  source?: string;
  tags?: string;
  prompt_hint?: string;
}, dbUrl?: string, dbToken?: string): Promise<string> {
  const db = getContentDb(dbUrl, dbToken);
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO topic_queue
          (id, pillar, title, description, content_type, status, priority, source, tags, prompt_hint,
           retry_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?, ?)`,
    args: [id, data.pillar, data.title, data.description ?? null, data.content_type,
           data.priority ?? 0, data.source ?? 'manual', data.tags ?? null,
           data.prompt_hint ?? null, now, now],
  });
  return id;
}

export async function updateTopic(id: string, data: {
  title?: string;
  description?: string;
  pillar?: string;
  content_type?: string;
  status?: string;
  priority?: number;
  tags?: string;
  prompt_hint?: string;
  generated_content_id?: string;
  retry_count?: number;
  error_message?: string | null;
}, dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  const sets: string[] = ['updated_at = ?'];
  const args: (string | number | null)[] = [Date.now()];

  if (data.title !== undefined) { sets.push('title = ?'); args.push(data.title); }
  if (data.description !== undefined) { sets.push('description = ?'); args.push(data.description); }
  if (data.pillar !== undefined) { sets.push('pillar = ?'); args.push(data.pillar); }
  if (data.content_type !== undefined) { sets.push('content_type = ?'); args.push(data.content_type); }
  if (data.status !== undefined) { sets.push('status = ?'); args.push(data.status); }
  if (data.priority !== undefined) { sets.push('priority = ?'); args.push(data.priority); }
  if (data.tags !== undefined) { sets.push('tags = ?'); args.push(data.tags); }
  if (data.prompt_hint !== undefined) { sets.push('prompt_hint = ?'); args.push(data.prompt_hint); }
  if (data.generated_content_id !== undefined) { sets.push('generated_content_id = ?'); args.push(data.generated_content_id); }
  if (data.retry_count !== undefined) { sets.push('retry_count = ?'); args.push(data.retry_count); }
  if ('error_message' in data) { sets.push('error_message = ?'); args.push(data.error_message ?? null); }

  args.push(id);
  await db.execute({ sql: `UPDATE topic_queue SET ${sets.join(', ')} WHERE id = ?`, args });
}

export async function deleteTopic(id: string, dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute({ sql: 'DELETE FROM topic_queue WHERE id = ?', args: [id] });
}

export async function getApprovedTopics(limit = 3, dbUrl?: string, dbToken?: string): Promise<TopicQueueItem[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: `SELECT * FROM topic_queue
          WHERE status = 'approved' AND (retry_count < 3 OR retry_count IS NULL)
          ORDER BY priority DESC, created_at ASC
          LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as TopicQueueItem[];
}
```

**Step 4: 빌드 확인**

```bash
cd /Users/nbs22/\(Claude\)/\(claude\).projects/business-builder/projects/content-orchestration
npm run build
```

Expected: 빌드 성공 (type errors 없음)

**Step 5: Commit**

```bash
git add src/lib/content-db.ts
git commit -m "feat: add topic_queue schema + CRUD functions to content-db"
```

---

### Task 2: /api/v1/topics CRUD API

**Files:**
- Create: `src/app/api/v1/topics/route.ts`
- Create: `src/app/api/v1/topics/[id]/route.ts`

**Step 1: topics/route.ts 작성 (GET list + POST create)**

```typescript
// src/app/api/v1/topics/route.ts
import { getTopics, createTopic, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});

  const { searchParams } = new URL(request.url);
  const pillar = searchParams.get('pillar') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const content_type = searchParams.get('content_type') ?? undefined;

  const topics = await getTopics({ pillar, status, content_type });
  return apiOk({ topics, total: topics.length });
}

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

  const { pillar, title, description, content_type, priority, source, tags, prompt_hint } = body;

  if (!pillar || typeof pillar !== 'string') return apiError('pillar is required');
  if (!title || typeof title !== 'string') return apiError('title is required');
  if (!content_type || typeof content_type !== 'string') return apiError('content_type is required');

  const id = await createTopic({
    pillar,
    title,
    description: typeof description === 'string' ? description : undefined,
    content_type,
    priority: typeof priority === 'number' ? priority : 0,
    source: typeof source === 'string' ? source : 'manual',
    tags: typeof tags === 'string' ? tags : undefined,
    prompt_hint: typeof prompt_hint === 'string' ? prompt_hint : undefined,
  });

  return apiOk({ id }, 201);
}
```

**Step 2: topics/[id]/route.ts 작성 (GET + PATCH + DELETE)**

```typescript
// src/app/api/v1/topics/[id]/route.ts
import { getTopicById, updateTopic, deleteTopic, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const { id } = await params;
  await ensureSchema().catch(() => {});

  const topic = await getTopicById(id);
  if (!topic) return apiError('Topic not found', 404);
  return apiOk({ topic });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const { id } = await params;
  await ensureSchema().catch(() => {});

  const topic = await getTopicById(id);
  if (!topic) return apiError('Topic not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  await updateTopic(id, {
    title: typeof body.title === 'string' ? body.title : undefined,
    description: typeof body.description === 'string' ? body.description : undefined,
    pillar: typeof body.pillar === 'string' ? body.pillar : undefined,
    content_type: typeof body.content_type === 'string' ? body.content_type : undefined,
    status: typeof body.status === 'string' ? body.status : undefined,
    priority: typeof body.priority === 'number' ? body.priority : undefined,
    tags: typeof body.tags === 'string' ? body.tags : undefined,
    prompt_hint: typeof body.prompt_hint === 'string' ? body.prompt_hint : undefined,
  });

  const updated = await getTopicById(id);
  return apiOk({ topic: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;

  const { id } = await params;
  const topic = await getTopicById(id);
  if (!topic) return apiError('Topic not found', 404);

  await deleteTopic(id);
  return apiOk({ deleted: true });
}
```

**Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공

**Step 4: Commit**

```bash
git add src/app/api/v1/topics/
git commit -m "feat: add /api/v1/topics CRUD API"
```

---

### Task 3: LLM 콘텐츠 생성 API (Gemini 2.0 Flash)

**Files:**
- Create: `src/lib/gemini.ts`
- Create: `src/app/api/v1/generate/route.ts`

**Step 1: gemini.ts 프롬프트 템플릿 + API 호출 유틸 작성**

```typescript
// src/lib/gemini.ts

export interface GeminiResult {
  content: string;
  tokens_input: number;
  tokens_output: number;
  cost_krw: number; // 원화 추정 비용
}

// 필라별 프롬프트 템플릿
const PILLAR_CONTEXT: Record<string, string> = {
  ai_automation: 'AppPro AI 자동화 서비스 — 중소기업 반복 업무를 AI로 자동화. 실용적이고 도입 장벽 낮은 솔루션 강조.',
  mvp_dev: 'AppPro MVP 개발 서비스 — 4주 내 빠른 MVP 출시. 린 스타트업, 빠른 검증, 최소 비용 강조.',
  gov_support: 'AppPro 정부지원사업 — IT 보조금/지원사업 컨설팅. 신청 절차 단순화, 성공률 제고.',
  maintenance: 'AppPro 유지보수 — 월정액 IT 시스템 관리. 안정성, 비용 예측 가능성 강조.',
  general: 'AppPro — AI 기반 중소기업 IT 솔루션 종합 컨설팅.',
};

const CONTENT_TYPE_INSTRUCTIONS: Record<string, string> = {
  blog: `한국어 블로그 포스트를 작성하라. 형식:
- H1 제목 (SEO 키워드 포함)
- 도입부 (2-3문장, 독자 공감)
- 본문 H2 섹션 3-4개 (각 150-250자)
- 실용적 팁 또는 사례
- CTA 마무리 (AppPro 서비스 자연스럽게 연결)
총 700-1000자. 마크다운 형식.`,
  newsletter: `한국어 뉴스레터 본문을 작성하라. 형식:
- 핵심 인사이트 1-2개 (짧고 임팩트 있게)
- 실행 가능한 팁 3개 (번호 목록)
- 이번 주 추천 도구/자료 1개
- 마무리 메시지
총 400-600자.`,
  social: `한국어 SNS 포스트를 작성하라 (LinkedIn/Instagram용):
- 훅 첫 줄 (스크롤을 멈추게 할 만큼 강렬)
- 핵심 메시지 3-4줄
- 해시태그 5개 (#AI #중소기업 #자동화 등)
총 150-250자.`,
  youtube: `한국어 YouTube 영상 스크립트 개요를 작성하라:
- 영상 제목 (CTR 최적화)
- 훅 (첫 15초 스크립트)
- 섹션 구성 3-4개 (각 요점 + 예상 소요 시간)
- CTA (구독/댓글/서비스)
총 300-500자.`,
};

export async function generateContent(params: {
  pillar: string;
  title: string;
  content_type: string;
  description?: string;
  prompt_hint?: string;
}): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const pillarCtx = PILLAR_CONTEXT[params.pillar] || PILLAR_CONTEXT.general;
  const typeInstructions = CONTENT_TYPE_INSTRUCTIONS[params.content_type] || CONTENT_TYPE_INSTRUCTIONS.blog;

  const systemPrompt = `당신은 AppPro 콘텐츠 마케터다. 서비스 컨텍스트: ${pillarCtx}`;

  const userPrompt = `주제: "${params.title}"
${params.description ? `설명: ${params.description}` : ''}
${params.prompt_hint ? `추가 지시: ${params.prompt_hint}` : ''}

${typeInstructions}`;

  const payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
    },
  };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const usage = data.usageMetadata ?? {};
  const tokensIn = Number(usage.promptTokenCount) || 0;
  const tokensOut = Number(usage.candidatesTokenCount) || 0;

  // Gemini 2.0 Flash 가격: input $0.075/1M, output $0.30/1M (1USD=1350KRW 기준)
  const costUsd = (tokensIn * 0.075 + tokensOut * 0.30) / 1_000_000;
  const cost_krw = Math.round(costUsd * 1350 * 10) / 10;

  return { content, tokens_input: tokensIn, tokens_output: tokensOut, cost_krw };
}
```

**Step 2: generate/route.ts 작성**

```typescript
// src/app/api/v1/generate/route.ts
import { getTopicById, updateTopic, createContent, ensureSchema } from '@/lib/content-db';
import { generateContent } from '@/lib/gemini';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
// Vercel 기본 timeout 10s → 60s 필요 (LLM 호출)
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
```

**Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공

**Step 4: Commit**

```bash
git add src/lib/gemini.ts src/app/api/v1/generate/
git commit -m "feat: add Gemini 2.0 Flash LLM generation API"
```

---

### Task 4: Vercel Cron /api/cron/generate + 실패 재시도

**Files:**
- Create: `src/app/api/cron/generate/route.ts`
- Modify: `vercel.json`

**Step 1: cron/generate/route.ts 작성**

```typescript
// src/app/api/cron/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getApprovedTopics, updateTopic, createContent, ensureSchema } from '@/lib/content-db';
import { generateContent } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

const MAX_PER_RUN = 3;  // 1회 실행당 최대 처리 주제 수
const MAX_RETRIES = 3;  // 최대 재시도 횟수

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

  const results: { topic_id: string; title: string; status: string; content_id?: string; cost_krw?: number; error?: string }[] = [];

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
```

**Step 2: vercel.json에 cron 추가**

현재 `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/publish",
      "schedule": "0 0 * * *"
    }
  ]
}
```

변경 후:
```json
{
  "git": {
    "deploymentEnabled": {
      "main": false,
      "master": false,
      "production": true,
      "staging": true
    }
  },
  "crons": [
    {
      "path": "/api/cron/publish",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/generate",
      "schedule": "0 * * * *"
    }
  ]
}
```

(매시간 정각 실행 — Vercel Hobby: 1회/일 제한, Pro: 매시간 가능)

**Step 3: 빌드 확인**

```bash
npm run build
```

Expected: 빌드 성공

**Step 4: Commit**

```bash
git add src/app/api/cron/generate/ vercel.json
git commit -m "feat: add Vercel Cron /api/cron/generate with retry logic"
```

---

### Task 5: 환경변수 설정 + 비용 검증 + Push

**Files:**
- Modify: `.env.example` (또는 프로젝트 루트 `.env.example`)
- Modify: `src/app/api/v1/stats/route.ts` (비용 검증 엔드포인트 추가)

**Step 1: .env.example 업데이트**

프로젝트 루트 `.env.example`에 추가:
```bash
# LLM Generation
GEMINI_API_KEY=               # Google AI Studio에서 발급
# Cron
CRON_SECRET=                  # Vercel Cron 인증 시크릿 (Vercel env에서 자동 설정)
```

실제 `.env` (gitignore)에 GEMINI_API_KEY 추가 (로컬 테스트용):
- Google AI Studio(https://aistudio.google.com/) → Get API Key → 복사 후 `.env`에 추가

**Step 2: 비용 검증 — 단일 생성 테스트**

Vercel 배포 후 아래 curl로 직접 테스트:
```bash
# 1. 주제 하나 생성 (approved)
curl -X POST https://content-orchestration.vercel.app/api/v1/topics \
  -H "Authorization: Bearer $CONTENT_OS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"pillar":"ai_automation","title":"중소기업 AI 자동화 도입 5단계","content_type":"blog","status":"pending"}'

# 2. 방금 생성한 topic_id를 approved로 변경
curl -X PATCH https://content-orchestration.vercel.app/api/v1/topics/{id} \
  -H "Authorization: Bearer $CONTENT_OS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved"}'

# 3. 수동 생성 호출 — 응답에서 cost_krw 확인
curl -X POST https://content-orchestration.vercel.app/api/v1/generate \
  -H "Authorization: Bearer $CONTENT_OS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"topic_id":"{id}"}'
```

**비용 검증 기준:**
- 응답 JSON의 `cost_krw` 값이 **10 이하**면 통과 ✅
- Gemini 2.0 Flash 이론값: 500 input + 800 output tokens = ~0.37원 (기준치 10원 대비 97% 여유)

**Step 3: Vercel 환경변수 설정**

Vercel 대시보드 → content-orchestration 프로젝트 → Settings → Environment Variables:
```
GEMINI_API_KEY = [발급받은 키]
```
(CRON_SECRET은 Vercel이 자동 주입)

**Step 4: Push + 배포**

```bash
git push origin main
```

Expected: Vercel 자동 배포 후 https://content-orchestration.vercel.app 업데이트

**Step 5: GEMINI_API_KEY Vercel 환경변수 등록 확인 보고**

배포 완료 후 자비스에게 보고:
- `/api/v1/topics` 정상 응답 확인
- `/api/v1/generate` 호출 결과 + cost_krw 값 보고

**Step 6: Final Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example with GEMINI_API_KEY"
git push origin main
```

---

## 완료 체크리스트

- [ ] Task 1: `topic_queue` DB 스키마 + CRUD 함수 (content-db.ts)
- [ ] Task 2: `/api/v1/topics` GET/POST/PATCH/DELETE API
- [ ] Task 3: `src/lib/gemini.ts` + `/api/v1/generate` POST API
- [ ] Task 4: `/api/cron/generate` + `vercel.json` cron 추가
- [ ] Task 5: `.env.example` + GEMINI_API_KEY Vercel 등록 + 비용 검증 (cost_krw ≤ 10)

## 구현 후 다음 과업 (별도 플랜)

- `[구현] 주제 큐 관리 UI` — content-orchestration 대시보드에 topics 탭 추가
- `[구현] 벤치마킹 채널 분석` (CEO 채널 제공 필요)
