# Content Orchestration: AI API + Sample Data + README Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI 에이전트가 REST API를 통해 콘텐츠 오케스트레이션 플랫폼을 완전히 제어할 수 있도록 v1 API 구축, Richbukae × AI 설계자 PLF 샘플 데이터 삽입, README.md 및 API 문서 페이지 작성.

**Architecture:** Next.js 15 App Router의 Route Handlers를 사용해 `/api/v1/*` REST API 구축. 모든 응답은 `{ success, data, error }` 엔벨로프 형식으로 통일. Bearer 토큰 인증 (`CONTENT_OS_API_KEY` 환경변수, 미설정 시 개발 모드로 스킵). DB는 기존 Turso LibSQL (content-os) 그대로 사용, campaigns 테이블에 `start_date`/`end_date`/`type` 컬럼 추가.

**Tech Stack:** Next.js 15 App Router, TypeScript, @libsql/client/web (Turso), Tailwind CSS, Vercel 배포

---

## 사전 확인

프로젝트 경로: `/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration`

기존 API 현황:
- `GET /api/campaigns/[id]` — 구 API (유지, 삭제 금지)
- `GET /api/cron/publish` — cron 발행

신규 API 경로: `/api/v1/*`

---

## Task 1: DB 스키마 보강 + API 공통 유틸

**목적:** campaigns 테이블에 `start_date`, `end_date`, `type` 추가. API 인증 미들웨어 + 공통 응답 유틸 생성.

**Files:**
- Modify: `src/lib/content-db.ts` (ensureSchema 확장, Campaign 인터페이스 업데이트)
- Create: `src/lib/api-utils.ts` (응답 헬퍼, 인증)

**Step 1: content-db.ts의 ensureSchema 수정**

`src/lib/content-db.ts`에서 `ensureSchema` 함수 내부에 campaigns 테이블 ALTER 추가:

```typescript
// ensureSchema 함수 내 campaigns CREATE TABLE 블록 바로 다음에 추가
await db.execute(`ALTER TABLE campaigns ADD COLUMN type TEXT DEFAULT 'campaign'`).catch(() => {});
await db.execute(`ALTER TABLE campaigns ADD COLUMN start_date INTEGER`).catch(() => {});
await db.execute(`ALTER TABLE campaigns ADD COLUMN end_date INTEGER`).catch(() => {});
```

`Campaign` 인터페이스도 업데이트:

```typescript
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  type: string; // campaign | ongoing
  start_date: number | null;
  end_date: number | null;
  status: string; // active | paused | completed | archived
  created_at: number;
  updated_at: number;
}
```

`createCampaign` 함수 시그니처 업데이트:

```typescript
export async function createCampaign(data: {
  name: string;
  description?: string;
  goal?: string;
  type?: string;
  start_date?: number;
  end_date?: number;
}, dbUrl?: string, dbToken?: string): Promise<string> {
  const db = getContentDb(dbUrl, dbToken);
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO campaigns (id, name, description, goal, type, start_date, end_date, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    args: [id, data.name, data.description ?? null, data.goal ?? null,
           data.type ?? 'campaign', data.start_date ?? null, data.end_date ?? null, now, now],
  });
  return id;
}
```

`updateCampaign` 함수 업데이트:

```typescript
export async function updateCampaign(id: string, data: {
  name?: string;
  description?: string;
  goal?: string;
  type?: string;
  start_date?: number | null;
  end_date?: number | null;
  status?: string;
}, dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  const now = Date.now();
  const sets: string[] = ['updated_at = ?'];
  const args: (string | number | null)[] = [now];

  if (data.name !== undefined) { sets.push('name = ?'); args.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); args.push(data.description); }
  if (data.goal !== undefined) { sets.push('goal = ?'); args.push(data.goal); }
  if (data.type !== undefined) { sets.push('type = ?'); args.push(data.type); }
  if (data.start_date !== undefined) { sets.push('start_date = ?'); args.push(data.start_date); }
  if (data.end_date !== undefined) { sets.push('end_date = ?'); args.push(data.end_date); }
  if (data.status !== undefined) { sets.push('status = ?'); args.push(data.status); }

  args.push(id);
  await db.execute({ sql: `UPDATE campaigns SET ${sets.join(', ')} WHERE id = ?`, args });
}
```

**Step 2: API 공통 유틸 생성**

신규 파일 `src/lib/api-utils.ts` 전체 내용:

```typescript
import { NextResponse } from 'next/server';

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function checkAuth(request: Request): boolean {
  const apiKey = process.env.CONTENT_OS_API_KEY;
  // 환경변수 미설정 = 개발 모드 (인증 스킵)
  if (!apiKey) return true;

  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === apiKey;
}

export function requireAuth(request: Request): NextResponse | null {
  if (!checkAuth(request)) {
    return apiError('Unauthorized — Bearer token required', 401);
  }
  return null;
}
```

**Step 3: 빌드 확인**

```bash
cd "/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration"
npm run build 2>&1 | tail -20
```

Expected: 빌드 성공 (오류 없음)

**Step 4: Commit**

```bash
git add src/lib/content-db.ts src/lib/api-utils.ts
git commit -m "feat: DB 스키마 보강 (campaigns type/start_date/end_date) + API 공통 유틸"
```

---

## Task 2: Seed API — Richbukae × AI 설계자 PLF 샘플 데이터

**목적:** `/api/seed` POST 요청으로 실제 사용 가능한 샘플 데이터 삽입. 개발/프로덕션 모두 동작. 멱등성(idempotent) 보장 — 이미 존재하면 스킵.

**Files:**
- Create: `src/app/api/seed/route.ts`

**Step 1: Seed route 생성**

신규 파일 `src/app/api/seed/route.ts` 전체 내용:

```typescript
import { NextResponse } from 'next/server';
import {
  ensureSchema, createCampaign, createChannel, getCampaigns, getChannels
} from '@/lib/content-db';
import { createClient } from '@libsql/client/web';

function getDb() {
  return createClient({
    url: process.env.CONTENT_OS_DB_URL!,
    authToken: process.env.CONTENT_OS_DB_TOKEN!,
  });
}

export async function POST() {
  await ensureSchema();

  const existingCampaigns = await getCampaigns();
  const existingChannels = await getChannels();

  const alreadySeeded = existingCampaigns.some(c => c.name === 'AI 설계자 세일즈 PLF');
  if (alreadySeeded) {
    return NextResponse.json({ success: true, message: '이미 시드 데이터가 존재합니다.', seeded: false });
  }

  const NOW = Date.now();
  const DAY = 86_400_000;

  // 1. 캠페인 생성
  const campaignId = await createCampaign({
    name: 'AI 설계자 세일즈 PLF',
    description: '리치부캐 채널을 통해 AI 설계자 서비스를 홍보하고 세일즈 전환을 달성하는 4주 PLF 캠페인',
    goal: '리치부캐 채널 AI 설계자 서비스 세일즈 전환 — 수강생 10명 모집',
    type: 'campaign',
    start_date: NOW - 1 * DAY,
    end_date: NOW + 27 * DAY,
  });

  // 2. 채널 생성 (4개)
  const igId = await createChannel({
    name: '리치부캐 인스타그램',
    platform: 'instagram',
    account_name: '@richbukae_official',
    connection_type: 'getlate',
    connection_status: 'disconnected',
    connection_detail: JSON.stringify({ note: 'GetLate 연동 예정' }),
  });

  const ytId = await createChannel({
    name: '리치부캐 유튜브',
    platform: 'youtube',
    account_name: '@richbukae',
    connection_type: 'manual',
    connection_status: 'disconnected',
    connection_detail: JSON.stringify({ note: '수동 업로드' }),
  });

  const nlId = await createChannel({
    name: '리치부캐 뉴스레터',
    platform: 'newsletter',
    account_name: 'contact@richbukae.com',
    connection_type: 'brevo',
    connection_status: 'connected',
    connection_detail: JSON.stringify({ list_id: 'richbukae-main' }),
  });

  const blogId = await createChannel({
    name: '리치부캐 블로그',
    platform: 'blog',
    account_name: 'richbukae.com/blog',
    connection_type: 'wordpress',
    connection_status: 'disconnected',
    connection_detail: JSON.stringify({ url: 'https://richbukae.com/blog' }),
  });

  const db = getDb();

  // 3. 콘텐츠 슬롯 생성 (총 20개)
  const contents = [
    // === 인스타그램 8개 ===
    { channel_id: igId, title: 'AI 설계자란 무엇인가?', status: 'published', scheduled_at: NOW - 1 * DAY,
      content_body: '🤖 AI 설계자는 AI 도구를 활용해 비즈니스 문제를 설계하고 해결하는 전문가입니다.\n\n✅ AI 설계자가 하는 일:\n- 업무 자동화 설계\n- AI 도구 선정 및 통합\n- ROI 분석 및 최적화\n\n여러분도 AI 설계자가 될 수 있습니다. 👇 링크 바이오 참고\n\n#AI설계자 #AI자동화 #부업 #재테크' },
    { channel_id: igId, title: 'AI 설계자 하루 루틴 공개', status: 'published', scheduled_at: NOW - 1 * DAY + 3600000,
      content_body: '⏰ AI 설계자의 하루 루틴을 공개합니다!\n\n🌅 오전 9시: Claude로 오늘 업무 계획 수립\n📊 오전 11시: 클라이언트 AI 자동화 설계\n🍱 점심 후: ChatGPT로 보고서 초안 작성\n🎯 오후 3시: 자동화 테스트 및 최적화\n💰 오후 5시: 결과 보고 및 청구\n\n월 수익: 300~500만원 가능\n\n#AI설계자 #재택근무 #AI부업' },
    { channel_id: igId, title: '비전공자도 AI 설계자 가능?', status: 'scheduled', scheduled_at: NOW + 1 * DAY,
      content_body: '✋ 비전공자도 AI 설계자가 될 수 있을까요?\n\n결론: YES! 코딩 불필요 ✅\n\n필요한 것:\n📌 AI 도구 사용법 (ChatGPT, Claude)\n📌 비즈니스 문제 파악 능력\n📌 소통 스킬\n\n기술보다 중요한 건 "문제를 보는 눈"\n\n↓ 커리큘럼 링크 바이오에서 확인\n\n#비전공자 #AI설계자 #커리어전환' },
    { channel_id: igId, title: 'AI 설계자 수강생 후기', status: 'scheduled', scheduled_at: NOW + 3 * DAY,
      content_body: null },
    { channel_id: igId, title: 'AI 설계자 포트폴리오 만드는 법', status: 'approved', scheduled_at: NOW + 5 * DAY,
      content_body: '📂 AI 설계자 포트폴리오 3단계\n\n1️⃣ 실제 문제 해결 사례 정리\n2️⃣ Before/After ROI 수치화\n3️⃣ Notion 포트폴리오 페이지 구성\n\n가장 중요한 건 "숫자"\n- 시간 절감: 주 10시간 → 2시간\n- 비용 절감: 월 300만원 → 50만원\n\n#AI설계자포트폴리오 #프리랜서' },
    { channel_id: igId, title: 'AI 설계자 실전 프로젝트 공개', status: 'draft', scheduled_at: NOW + 7 * DAY,
      content_body: '초안 작성 중...' },
    { channel_id: igId, title: 'AI 설계자 FAQ 총정리', status: 'review', scheduled_at: NOW + 10 * DAY,
      content_body: '자주 묻는 질문을 정리했습니다. 검토 요청합니다.' },
    { channel_id: igId, title: '마감 D-7 알림', status: 'unwritten', scheduled_at: NOW + 20 * DAY,
      content_body: null },

    // === 유튜브 4개 ===
    { channel_id: ytId, title: 'AI 설계자 완전 입문 가이드 (40분)', status: 'published', scheduled_at: NOW - 1 * DAY,
      content_body: '# AI 설계자 완전 입문 가이드\n\n## 목차\n1. AI 설계자란?\n2. 필요 스킬셋\n3. 수익 구조\n4. 실전 데모\n\n영상 설명: 이 영상에서는 AI 설계자가 되기 위한 모든 것을 40분 만에 알려드립니다.' },
    { channel_id: ytId, title: 'Claude AI로 업무 자동화 실전 (30분)', status: 'draft', scheduled_at: NOW + 5 * DAY,
      content_body: null },
    { channel_id: ytId, title: 'AI 설계자 수강 신청 안내 라이브', status: 'unwritten', scheduled_at: NOW + 14 * DAY,
      content_body: null },
    { channel_id: ytId, title: 'AI 설계자 수강생 성과 인터뷰', status: 'unwritten', scheduled_at: NOW + 21 * DAY,
      content_body: null },

    // === 뉴스레터 4개 ===
    { channel_id: nlId, title: '[Week 1] AI 설계자 시리즈 시작합니다', status: 'published', scheduled_at: NOW - 1 * DAY,
      content_body: '<h1>AI 설계자 세일즈 PLF를 시작합니다</h1><p>안녕하세요, 리치부캐입니다.</p><p>이번 4주 동안 AI 설계자가 되는 여정을 함께합니다.</p>' },
    { channel_id: nlId, title: '[Week 2] AI 설계자 실전 사례 공개', status: 'scheduled', scheduled_at: NOW + 6 * DAY,
      content_body: '<h1>실전 사례 3가지 공개</h1><p>이번 주에는 실제 AI 설계자로 활동 중인 수강생들의 사례를 공개합니다.</p>' },
    { channel_id: nlId, title: '[Week 3] 수강 신청 오픈 안내', status: 'draft', scheduled_at: NOW + 13 * DAY,
      content_body: null },
    { channel_id: nlId, title: '[Week 4] 마감 임박 + 마지막 혜택', status: 'unwritten', scheduled_at: NOW + 20 * DAY,
      content_body: null },

    // === 블로그 4개 ===
    { channel_id: blogId, title: 'AI 설계자란? 2026년 완전 가이드', status: 'published', scheduled_at: NOW - 1 * DAY,
      content_body: '# AI 설계자란? 2026년 완전 가이드\n\n## AI 설계자의 정의\nAI 설계자는 인공지능 도구를 활용하여 비즈니스 문제를 분석하고 자동화 솔루션을 설계하는 전문가입니다.\n\n## 핵심 역량\n- 프롬프트 엔지니어링\n- 업무 프로세스 분석\n- ROI 계산 및 보고' },
    { channel_id: blogId, title: 'AI 설계자 포트폴리오 구성 방법', status: 'review', scheduled_at: NOW + 7 * DAY,
      content_body: '포트폴리오 구성 방법에 대한 상세 가이드입니다. 검토 후 발행 예정.' },
    { channel_id: blogId, title: 'AI 설계자 vs AI 개발자 차이점', status: 'draft', scheduled_at: NOW + 14 * DAY,
      content_body: '초안: AI 설계자와 AI 개발자의 차이를 설명하는 글입니다.' },
    { channel_id: blogId, title: 'AI 설계자 과정 수강생 인터뷰 모음', status: 'unwritten', scheduled_at: NOW + 21 * DAY,
      content_body: null },
  ];

  let inserted = 0;
  for (const item of contents) {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO content_queue
            (id, type, title, content_body, status, priority, channel_id, campaign_id,
             scheduled_at, channel, project, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        item.channel_id === igId ? 'instagram' :
        item.channel_id === ytId ? 'youtube' :
        item.channel_id === nlId ? 'newsletter' : 'blog',
        item.title,
        item.content_body ?? null,
        item.status,
        0,
        item.channel_id,
        campaignId,
        item.scheduled_at,
        item.channel_id === igId ? 'instagram' :
        item.channel_id === ytId ? 'youtube' :
        item.channel_id === nlId ? 'newsletter' : 'blog',
        'richbukae',
        NOW,
        NOW,
      ],
    });
    inserted++;
  }

  return NextResponse.json({
    success: true,
    message: `시드 완료: 캠페인 1개, 채널 4개, 콘텐츠 ${inserted}개`,
    seeded: true,
    data: { campaignId, channels: { igId, ytId, nlId, blogId }, contentsCount: inserted },
  });
}
```

**Step 2: 빌드 확인**

```bash
cd "/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration"
npm run build 2>&1 | tail -20
```

Expected: 빌드 성공

**Step 3: Commit**

```bash
git add src/app/api/seed/route.ts
git commit -m "feat: seed API — Richbukae × AI 설계자 PLF 샘플 데이터 (1캠페인, 4채널, 20콘텐츠)"
```

---

## Task 3: REST API v1 — Campaigns

**목적:** AI 에이전트가 캠페인을 CRUD할 수 있는 RESTful API.

**Files:**
- Create: `src/app/api/v1/campaigns/route.ts`
- Create: `src/app/api/v1/campaigns/[id]/route.ts`
- Create: `src/app/api/v1/campaigns/[id]/contents/route.ts`

**Step 1: `src/app/api/v1/campaigns/route.ts` 생성**

```typescript
import { NextResponse } from 'next/server';
import { getCampaigns, createCampaign, ensureSchema, getCampaignContentStats } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const campaigns = await getCampaigns();

  // 각 캠페인의 콘텐츠 통계 포함
  const withStats = await Promise.all(
    campaigns.map(async (c) => {
      const stats = await getCampaignContentStats(c.id);
      return { ...c, stats };
    })
  );

  return apiOk(withStats);
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

  const { name, description, goal, type, start_date, end_date } = body as Record<string, string | number | undefined>;
  if (!name || typeof name !== 'string') {
    return apiError('name is required');
  }

  const id = await createCampaign({
    name,
    description: description as string | undefined,
    goal: goal as string | undefined,
    type: (type as string) || 'campaign',
    start_date: start_date as number | undefined,
    end_date: end_date as number | undefined,
  });

  return apiOk({ id }, 201);
}
```

**Step 2: `src/app/api/v1/campaigns/[id]/route.ts` 생성**

```typescript
import { getCampaignById, updateCampaign, ensureSchema, getCampaignContentStats } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return apiError('Campaign not found', 404);

  const stats = await getCampaignContentStats(id);
  return apiOk({ ...campaign, stats });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return apiError('Campaign not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  await updateCampaign(id, body as Parameters<typeof updateCampaign>[1]);
  const updated = await getCampaignById(id);
  return apiOk(updated);
}
```

**Step 3: `src/app/api/v1/campaigns/[id]/contents/route.ts` 생성**

```typescript
import { getCampaignById, getCampaignContents, getChannels, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) return apiError('Campaign not found', 404);

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const channelIdFilter = searchParams.get('channel_id');

  let contents = await getCampaignContents(id);

  if (statusFilter) {
    contents = contents.filter(c => c.status === statusFilter);
  }
  if (channelIdFilter) {
    contents = contents.filter(c => c.channel_id === channelIdFilter);
  }

  // 채널 정보 join
  const channels = await getChannels();
  const channelMap = Object.fromEntries(channels.map(c => [c.id, c]));

  const enriched = contents.map(c => ({
    ...c,
    channel_info: c.channel_id ? channelMap[c.channel_id] ?? null : null,
  }));

  // 채널별 그룹핑
  const grouped: Record<string, typeof enriched> = {};
  for (const item of enriched) {
    const key = item.channel_id ?? 'uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  return apiOk({
    campaign,
    contents: enriched,
    grouped_by_channel: grouped,
    total: enriched.length,
  });
}
```

**Step 4: 빌드 확인**

```bash
cd "/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration"
npm run build 2>&1 | tail -20
```

**Step 5: Commit**

```bash
git add src/app/api/v1/campaigns/
git commit -m "feat: REST API v1 — Campaigns CRUD (/api/v1/campaigns)"
```

---

## Task 4: REST API v1 — Channels

**Files:**
- Create: `src/app/api/v1/channels/route.ts`
- Create: `src/app/api/v1/channels/[id]/route.ts`
- Create: `src/app/api/v1/channels/[id]/contents/route.ts`

**Step 1: `src/app/api/v1/channels/route.ts` 생성**

```typescript
import { getChannels, createChannel, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

const VALID_PLATFORMS = ['instagram', 'youtube', 'newsletter', 'blog', 'facebook', 'x'];

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const channels = await getChannels();
  return apiOk(channels);
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

  const { name, platform, account_name, connection_type, connection_status, connection_detail } = body as Record<string, string | undefined>;

  if (!name || typeof name !== 'string') return apiError('name is required');
  if (!platform || !VALID_PLATFORMS.includes(platform)) {
    return apiError(`platform must be one of: ${VALID_PLATFORMS.join(', ')}`);
  }

  const id = await createChannel({
    name,
    platform,
    account_name,
    connection_type,
    connection_status,
    connection_detail,
  });

  return apiOk({ id }, 201);
}
```

**Step 2: `src/app/api/v1/channels/[id]/route.ts` 생성**

```typescript
import { getChannelById, updateChannel, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const channel = await getChannelById(id);
  if (!channel) return apiError('Channel not found', 404);
  return apiOk(channel);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const channel = await getChannelById(id);
  if (!channel) return apiError('Channel not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  await updateChannel(id, body as Parameters<typeof updateChannel>[1]);
  const updated = await getChannelById(id);
  return apiOk(updated);
}
```

**Step 3: `src/app/api/v1/channels/[id]/contents/route.ts` 생성**

```typescript
import { getChannelById, getChannelContents, getCampaigns, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const channel = await getChannelById(id);
  if (!channel) return apiError('Channel not found', 404);

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');
  const campaignIdFilter = searchParams.get('campaign_id');

  let contents = await getChannelContents(id);
  if (statusFilter) contents = contents.filter(c => c.status === statusFilter);
  if (campaignIdFilter) contents = contents.filter(c => c.campaign_id === campaignIdFilter);

  // 캠페인 정보 join
  const campaigns = await getCampaigns();
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  const enriched = contents.map(c => ({
    ...c,
    campaign_info: c.campaign_id ? campaignMap[c.campaign_id] ?? null : null,
  }));

  // 프로젝트별 그룹핑
  const grouped: Record<string, typeof enriched> = {};
  for (const item of enriched) {
    const key = item.campaign_id ?? 'uncategorized';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  return apiOk({
    channel,
    contents: enriched,
    grouped_by_campaign: grouped,
    total: enriched.length,
  });
}
```

**Step 4: 빌드 확인 + Commit**

```bash
cd "/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration"
npm run build 2>&1 | tail -20
git add src/app/api/v1/channels/
git commit -m "feat: REST API v1 — Channels CRUD (/api/v1/channels)"
```

---

## Task 5: REST API v1 — Contents (CRUD + Status Transition)

**핵심 엔드포인트:** AI 에이전트가 콘텐츠를 생성하고 상태를 전환하는 가장 중요한 API.

**Files:**
- Create: `src/app/api/v1/contents/route.ts`
- Create: `src/app/api/v1/contents/[id]/route.ts`
- Create: `src/app/api/v1/contents/[id]/transition/route.ts`

**Step 1: `src/app/api/v1/contents/route.ts` 생성**

```typescript
import { getContentQueueFull, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';
import { createClient } from '@libsql/client/web';

function getDb() {
  return createClient({
    url: process.env.CONTENT_OS_DB_URL!,
    authToken: process.env.CONTENT_OS_DB_TOKEN!,
  });
}

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { searchParams } = new URL(request.url);

  const campaignId = searchParams.get('campaign_id') ?? undefined;
  const channelId = searchParams.get('channel_id') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const search = searchParams.get('q') ?? undefined;

  // getContentQueueFull은 project/status/channel/search 필터만 지원
  // campaign_id/channel_id는 직접 필터링
  let contents = await getContentQueueFull(undefined, status, undefined, search);

  if (campaignId) contents = contents.filter(c => c.campaign_id === campaignId);
  if (channelId) contents = contents.filter(c => c.channel_id === channelId);

  return apiOk({ contents, total: contents.length });
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

  const { title, campaign_id, channel_id, content_body, scheduled_at, status } = body as Record<string, string | number | undefined>;

  if (!title || typeof title !== 'string') return apiError('title is required');

  const db = getDb();
  const id = crypto.randomUUID();
  const now = Date.now();
  const initialStatus = (status as string) || 'unwritten';

  // 유효 상태 검증
  const VALID_STATUSES = ['unwritten', 'draft', 'review', 'approved', 'scheduled', 'published', 'cancelled'];
  if (!VALID_STATUSES.includes(initialStatus)) {
    return apiError(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  await db.execute({
    sql: `INSERT INTO content_queue
          (id, type, title, content_body, status, priority, campaign_id, channel_id, scheduled_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      'content',
      title,
      (content_body as string) ?? null,
      initialStatus,
      0,
      (campaign_id as string) ?? null,
      (channel_id as string) ?? null,
      (scheduled_at as number) ?? null,
      now,
      now,
    ],
  });

  return apiOk({ id }, 201);
}
```

**Step 2: `src/app/api/v1/contents/[id]/route.ts` 생성**

```typescript
import { getContentById, updateContent, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const content = await getContentById(id);
  if (!content) return apiError('Content not found', 404);
  return apiOk(content);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const content = await getContentById(id);
  if (!content) return apiError('Content not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const { title, content_body, pillar, channel, metadata } = body as Record<string, string | undefined>;

  await updateContent(id, {
    title,
    content_body,
    pillar,
    channel,
    metadata,
  });

  const updated = await getContentById(id);
  return apiOk(updated);
}
```

**Step 3: `src/app/api/v1/contents/[id]/transition/route.ts` 생성**

이 엔드포인트가 AI 에이전트의 핵심 — 상태 전환 워크플로우:

```typescript
import { getContentById, updateContentStatus, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

// 허용된 상태 전환 맵
const TRANSITIONS: Record<string, string[]> = {
  unwritten: ['draft', 'cancelled'],
  draft:     ['review', 'cancelled'],
  review:    ['approved', 'draft', 'cancelled'],    // approved = 승인, draft = 반려 후 재수정
  approved:  ['scheduled', 'draft', 'cancelled'],
  scheduled: ['published', 'approved', 'cancelled'],
  published: [],  // 종결 상태
  cancelled: ['draft'],  // 복구 가능
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});
  const { id } = await params;
  const content = await getContentById(id);
  if (!content) return apiError('Content not found', 404);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body');
  }

  const { to, rejected_reason, scheduled_at, approved_by } = body as Record<string, string | number | undefined>;

  if (!to || typeof to !== 'string') return apiError('to (target status) is required');

  const currentStatus = content.status;
  const allowed = TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(to)) {
    return apiError(
      `Cannot transition from '${currentStatus}' to '${to}'. Allowed: [${allowed.join(', ')}]`,
      422
    );
  }

  // 상태별 추가 검증
  if (to === 'review' && !content.content_body) {
    return apiError('content_body is required before requesting review');
  }
  if (to === 'scheduled' && !scheduled_at) {
    return apiError('scheduled_at (Unix timestamp in ms) is required for scheduling');
  }

  await updateContentStatus(id, to, {
    approved_by: approved_by as string | undefined,
    rejected_reason: rejected_reason as string | undefined,
    scheduled_at: scheduled_at as number | undefined,
  });

  const updated = await getContentById(id);
  return apiOk({
    content: updated,
    transition: { from: currentStatus, to },
  });
}
```

**Step 4: 빌드 확인 + Commit**

```bash
cd "/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration"
npm run build 2>&1 | tail -20
git add src/app/api/v1/contents/
git commit -m "feat: REST API v1 — Contents CRUD + status transition (/api/v1/contents)"
```

---

## Task 6: REST API v1 — Health & Stats

**목적:** AI 에이전트가 플랫폼 상태와 전체 통계를 빠르게 확인.

**Files:**
- Create: `src/app/api/v1/health/route.ts`
- Create: `src/app/api/v1/stats/route.ts`

**Step 1: `src/app/api/v1/health/route.ts` 생성**

```typescript
import { NextResponse } from 'next/server';
import { ensureSchema } from '@/lib/content-db';

export async function GET() {
  const start = Date.now();
  let dbOk = false;
  let dbError: string | undefined;

  try {
    await ensureSchema();
    dbOk = true;
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  const status = dbOk ? 200 : 503;
  return NextResponse.json({
    success: dbOk,
    data: {
      status: dbOk ? 'ok' : 'error',
      db: dbOk ? 'connected' : 'error',
      db_error: dbError ?? null,
      latency_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
      version: 'v1',
    },
  }, { status });
}
```

**Step 2: `src/app/api/v1/stats/route.ts` 생성**

```typescript
import { getCampaigns, getChannels, getCampaignContentStats, ensureSchema } from '@/lib/content-db';
import { requireAuth, apiOk } from '@/lib/api-utils';

export async function GET(request: Request) {
  const auth = requireAuth(request);
  if (auth) return auth;

  await ensureSchema().catch(() => {});

  const [campaigns, channels] = await Promise.all([getCampaigns(), getChannels()]);

  // 전체 콘텐츠 통계 합산
  const allStats = await Promise.all(campaigns.map(c => getCampaignContentStats(c.id)));
  const totalStats = allStats.reduce(
    (acc, s) => ({
      draft: acc.draft + s.draft,
      review: acc.review + s.review,
      approved: acc.approved + s.approved,
      scheduled: acc.scheduled + s.scheduled,
      published: acc.published + s.published,
      unwritten: acc.unwritten + s.unwritten,
      cancelled: acc.cancelled + s.cancelled,
      total: acc.total + s.total,
    }),
    { draft: 0, review: 0, approved: 0, scheduled: 0, published: 0, unwritten: 0, cancelled: 0, total: 0 }
  );

  return apiOk({
    campaigns: {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
    },
    channels: {
      total: channels.length,
      connected: channels.filter(c => c.connection_status === 'connected').length,
      disconnected: channels.filter(c => c.connection_status === 'disconnected').length,
    },
    contents: totalStats,
  });
}
```

**Step 3: 빌드 확인 + Commit**

```bash
npm run build 2>&1 | tail -20
git add src/app/api/v1/health/ src/app/api/v1/stats/
git commit -m "feat: REST API v1 — Health + Stats 엔드포인트"
```

---

## Task 7: API Documentation 페이지 `/api-docs`

**목적:** 개발자와 AI 에이전트 모두가 참조할 수 있는 인터랙티브 API 문서 페이지.

**Files:**
- Create: `src/app/api-docs/page.tsx`
- Modify: `src/app/layout.tsx` (nav에 API Docs 링크 추가)

**Step 1: `src/app/api-docs/page.tsx` 생성**

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Docs — Content Orchestration',
  description: 'REST API v1 documentation for AI agents',
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://content-orchestration.vercel.app';

const endpoints = [
  {
    group: 'System',
    items: [
      {
        method: 'GET', path: '/api/v1/health',
        auth: false,
        desc: 'DB 연결 상태 및 응답 지연 확인. 인증 불필요.',
        response: `{ "success": true, "data": { "status": "ok", "db": "connected", "latency_ms": 12 } }`,
      },
      {
        method: 'GET', path: '/api/v1/stats',
        auth: true,
        desc: '전체 캠페인/채널/콘텐츠 통계 요약.',
        response: `{ "success": true, "data": { "campaigns": { "total": 1, "active": 1 }, "channels": { "total": 4, "connected": 1 }, "contents": { "total": 20, "published": 4, "draft": 4, "unwritten": 4 } } }`,
      },
      {
        method: 'POST', path: '/api/seed',
        auth: false,
        desc: '샘플 데이터 삽입 (멱등성 보장 — 이미 존재하면 스킵).',
        response: `{ "success": true, "message": "시드 완료: 캠페인 1개, 채널 4개, 콘텐츠 20개", "seeded": true }`,
      },
    ],
  },
  {
    group: 'Campaigns',
    items: [
      {
        method: 'GET', path: '/api/v1/campaigns',
        auth: true,
        desc: '캠페인 목록 (콘텐츠 통계 포함).',
        response: `{ "success": true, "data": [{ "id": "...", "name": "AI 설계자 세일즈 PLF", "status": "active", "stats": { "total": 20, "published": 4 } }] }`,
      },
      {
        method: 'POST', path: '/api/v1/campaigns',
        auth: true,
        desc: '새 캠페인 생성.',
        body: `{ "name": "캠페인 이름", "description": "설명", "goal": "목표", "type": "campaign", "start_date": 1740787200000, "end_date": 1743206400000 }`,
        response: `{ "success": true, "data": { "id": "uuid" } }`,
      },
      {
        method: 'GET', path: '/api/v1/campaigns/:id',
        auth: true,
        desc: '캠페인 단건 조회 (통계 포함).',
        response: `{ "success": true, "data": { "id": "...", "name": "...", "stats": { ... } } }`,
      },
      {
        method: 'PUT', path: '/api/v1/campaigns/:id',
        auth: true,
        desc: '캠페인 수정. status 값: active | paused | completed | archived',
        body: `{ "name": "새 이름", "status": "completed" }`,
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'GET', path: '/api/v1/campaigns/:id/contents',
        auth: true,
        desc: '캠페인 콘텐츠 목록. Query: status, channel_id',
        response: `{ "success": true, "data": { "campaign": {...}, "contents": [...], "grouped_by_channel": {...} } }`,
      },
    ],
  },
  {
    group: 'Channels',
    items: [
      {
        method: 'GET', path: '/api/v1/channels',
        auth: true,
        desc: '채널 목록.',
        response: `{ "success": true, "data": [{ "id": "...", "name": "리치부캐 인스타그램", "platform": "instagram" }] }`,
      },
      {
        method: 'POST', path: '/api/v1/channels',
        auth: true,
        desc: '채널 추가. platform: instagram | youtube | newsletter | blog | facebook | x',
        body: `{ "name": "채널명", "platform": "instagram", "account_name": "@account", "connection_type": "getlate", "connection_status": "disconnected" }`,
        response: `{ "success": true, "data": { "id": "uuid" } }`,
      },
      {
        method: 'GET', path: '/api/v1/channels/:id',
        auth: true,
        desc: '채널 단건 조회.',
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'PUT', path: '/api/v1/channels/:id',
        auth: true,
        desc: '채널 수정. connection_status: connected | disconnected | error',
        body: `{ "connection_status": "connected" }`,
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'GET', path: '/api/v1/channels/:id/contents',
        auth: true,
        desc: '채널 콘텐츠 목록. Query: status, campaign_id',
        response: `{ "success": true, "data": { "channel": {...}, "contents": [...], "grouped_by_campaign": {...} } }`,
      },
    ],
  },
  {
    group: 'Contents',
    items: [
      {
        method: 'GET', path: '/api/v1/contents',
        auth: true,
        desc: '콘텐츠 목록. Query: campaign_id, channel_id, status, q(검색어)',
        response: `{ "success": true, "data": { "contents": [...], "total": 20 } }`,
      },
      {
        method: 'POST', path: '/api/v1/contents',
        auth: true,
        desc: '콘텐츠 슬롯 생성. status 기본값: unwritten',
        body: `{ "title": "콘텐츠 제목", "campaign_id": "uuid", "channel_id": "uuid", "content_body": "본문 (선택)", "scheduled_at": 1741132800000, "status": "unwritten" }`,
        response: `{ "success": true, "data": { "id": "uuid" } }`,
      },
      {
        method: 'GET', path: '/api/v1/contents/:id',
        auth: true,
        desc: '콘텐츠 단건 조회.',
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'PUT', path: '/api/v1/contents/:id',
        auth: true,
        desc: '콘텐츠 본문/제목 수정. 상태 변경은 /transition 사용.',
        body: `{ "title": "수정 제목", "content_body": "작성된 본문 내용" }`,
        response: `{ "success": true, "data": { ... } }`,
      },
      {
        method: 'POST', path: '/api/v1/contents/:id/transition',
        auth: true,
        desc: '상태 전환 (워크플로우 핵심). 허용 전환: unwritten→draft, draft→review, review→approved|draft, approved→scheduled, scheduled→published',
        body: `{ "to": "review" }`,
        bodyExamples: [
          '검토요청: { "to": "review" }',
          '반려: { "to": "draft", "rejected_reason": "수정 필요 사항" }',
          '승인: { "to": "approved", "approved_by": "VP/CEO" }',
          '예약: { "to": "scheduled", "scheduled_at": 1741132800000 }',
          '발행완료: { "to": "published" }',
        ],
        response: `{ "success": true, "data": { "content": {...}, "transition": { "from": "draft", "to": "review" } } }`,
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-800',
  POST: 'bg-green-100 text-green-800',
  PUT: 'bg-yellow-100 text-yellow-800',
  DELETE: 'bg-red-100 text-red-800',
};

export default function ApiDocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 font-mono text-sm">
      <div className="mb-8">
        <h1 className="mb-1 text-2xl font-bold">Content Orchestration API</h1>
        <p className="text-gray-500">v1 · Base URL: <code className="rounded bg-gray-100 px-1">{BASE_URL}</code></p>
        <div className="mt-3 rounded border border-blue-200 bg-blue-50 p-3 text-xs">
          <strong>Authentication:</strong> <code>Authorization: Bearer {'{CONTENT_OS_API_KEY}'}</code>
          &nbsp;(환경변수 미설정 시 인증 스킵)
        </div>
      </div>

      {endpoints.map((group) => (
        <section key={group.group} className="mb-10">
          <h2 className="mb-4 border-b pb-1 text-lg font-semibold">{group.group}</h2>
          <div className="space-y-4">
            {group.items.map((ep) => (
              <div key={ep.path + ep.method} className="rounded border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${methodColors[ep.method]}`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-semibold">{ep.path}</code>
                  {!ep.auth && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">No Auth</span>
                  )}
                </div>
                <p className="mb-2 text-xs text-gray-600">{ep.desc}</p>
                {ep.body && (
                  <div className="mb-2">
                    <div className="mb-0.5 text-xs text-gray-400">Request Body</div>
                    <pre className="overflow-auto rounded bg-gray-900 p-2 text-xs text-green-400">{ep.body}</pre>
                  </div>
                )}
                {ep.bodyExamples && (
                  <div className="mb-2">
                    <div className="mb-0.5 text-xs text-gray-400">Body Examples</div>
                    <ul className="space-y-1">
                      {ep.bodyExamples.map((ex) => (
                        <li key={ex}>
                          <pre className="overflow-auto rounded bg-gray-900 p-1.5 text-xs text-green-400">{ex}</pre>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <div className="mb-0.5 text-xs text-gray-400">Response</div>
                  <pre className="overflow-auto rounded bg-gray-800 p-2 text-xs text-blue-300">{ep.response}</pre>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="mt-10 rounded border bg-gray-50 p-4 text-xs">
        <h2 className="mb-2 font-semibold">AI 에이전트 통합 예시 (curl)</h2>
        <pre className="overflow-auto text-xs text-gray-700">{`# 1. 헬스체크
curl ${BASE_URL}/api/v1/health

# 2. 샘플 데이터 시드 (최초 1회)
curl -X POST ${BASE_URL}/api/seed

# 3. 캠페인 목록 조회
curl -H "Authorization: Bearer YOUR_KEY" ${BASE_URL}/api/v1/campaigns

# 4. 콘텐츠 슬롯 생성 (AI가 작성할 슬롯)
curl -X POST ${BASE_URL}/api/v1/contents \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"새 인스타그램 포스트","campaign_id":"CAMPAIGN_ID","channel_id":"CHANNEL_ID","status":"unwritten"}'

# 5. 콘텐츠 본문 작성 (AI가 생성한 본문 업데이트)
curl -X PUT ${BASE_URL}/api/v1/contents/CONTENT_ID \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"content_body":"AI가 작성한 본문 내용..."}'

# 6. 검토 요청
curl -X POST ${BASE_URL}/api/v1/contents/CONTENT_ID/transition \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"review"}'

# 7. 발행 예약
curl -X POST ${BASE_URL}/api/v1/contents/CONTENT_ID/transition \\
  -H "Authorization: Bearer YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"scheduled","scheduled_at":1741132800000}'`}</pre>
      </section>
    </main>
  );
}
```

**Step 2: nav에 API Docs 링크 추가**

`src/app/layout.tsx`에서 nav 부분에 API Docs 링크를 추가. 파일을 읽어 nav 링크 배열에 `{ href: '/api-docs', label: 'API Docs' }` 추가.

**Step 3: 빌드 확인 + Commit**

```bash
npm run build 2>&1 | tail -20
git add src/app/api-docs/ src/app/layout.tsx
git commit -m "feat: API Docs 페이지 (/api-docs) — 전체 엔드포인트 + curl 예시"
```

---

## Task 8: README.md 작성

**목적:** 개발자, CEO, AI 에이전트 모두가 플랫폼을 즉시 이해하고 사용할 수 있는 완전한 가이드.

**Files:**
- Create: `README.md` (프로젝트 루트)

**Step 1: README.md 생성**

`/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration/README.md` 전체 내용:

````markdown
# 콘텐츠 오케스트레이션 플랫폼

멀티 프로젝트 콘텐츠 발행 계획 및 관리 플랫폼. 여러 캠페인의 콘텐츠를 채널별/일정별로 계획하고 발행까지 관리.

**첫 번째 실제 사용 케이스**: Richbukae 채널 × AI 설계자 세일즈 PLF

---

## 빠른 시작

### 1. 환경 설정

```bash
cp .env.example .env.local
# .env.local에 DB 정보 입력
```

필수 환경변수:
```
CONTENT_OS_DB_URL=libsql://...
CONTENT_OS_DB_TOKEN=...
CONTENT_OS_API_KEY=your-api-key   # 선택: 미설정 시 API 인증 스킵
```

### 2. 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

### 3. 샘플 데이터 삽입

```bash
curl -X POST http://localhost:3000/api/seed
```

Richbukae × AI 설계자 PLF 샘플 데이터가 자동으로 삽입됩니다:
- 캠페인 1개 (AI 설계자 세일즈 PLF)
- 채널 4개 (인스타그램, 유튜브, 뉴스레터, 블로그)
- 콘텐츠 슬롯 20개 (다양한 상태)

---

## 화면 구성

### `/` — 홈 (캠페인 목록)

활성 캠페인 카드 목록. 채널 수 및 콘텐츠 상태(Draft/예약/완료) 요약 표시.
- `[+ 새 프로젝트]` → 신규 캠페인 생성
- 빠른 탐색: 채널별 뷰 / 캘린더

### `/projects/[id]` — 프로젝트 상세

채널별 콘텐츠 슬롯 목록. 상태별 필터링 가능.
- **빈 슬롯 `[작성하기]`** → 즉시 에디터 진입 (계획 → 실행 단절 없음)
- 뷰 전환: 리스트 / 칸반

### `/channels` — 채널 관리

등록된 채널 목록 + 연동 상태 (✅ 자동발행 / ⚠️ 미연결 / ❌ 오류).
채널 클릭 → 프로젝트별 그룹핑된 콘텐츠 목록.

### `/calendar` — 캘린더

월간 캘린더. 채널 아이콘으로 예약 콘텐츠 시각화.
날짜 클릭 → 해당 날짜 콘텐츠 팝업.

### `/api-docs` — API 문서

AI 에이전트 및 개발자용 REST API 전체 문서.

---

## 콘텐츠 상태 워크플로우

```
미작성(unwritten)
    ↓ [작성 시작]
초안(draft) ←────────────┐
    ↓ [검토 요청]          │
검토요청(review)           │ (반려)
    ├→ 반려(draft) ────────┘
    └→ 승인완료(approved)
         ↓ [발행 예약]
      예약(scheduled)
         ↓ [발행]
      발행완료(published)

어느 단계에서든 → 취소(cancelled)
```

---

## REST API v1

Base URL: `https://content-orchestration.vercel.app`

인증: `Authorization: Bearer {CONTENT_OS_API_KEY}` (환경변수 미설정 시 스킵)

전체 API 문서: `/api-docs` 페이지 참조

### 주요 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | /api/v1/health | 헬스체크 (인증 불필요) |
| GET | /api/v1/stats | 전체 통계 |
| GET | /api/v1/campaigns | 캠페인 목록 |
| POST | /api/v1/campaigns | 캠페인 생성 |
| GET | /api/v1/campaigns/:id/contents | 캠페인 콘텐츠 목록 |
| GET | /api/v1/channels | 채널 목록 |
| GET | /api/v1/contents | 콘텐츠 목록 (필터: campaign_id, channel_id, status) |
| POST | /api/v1/contents | 콘텐츠 슬롯 생성 |
| PUT | /api/v1/contents/:id | 콘텐츠 본문 수정 |
| POST | /api/v1/contents/:id/transition | 상태 전환 |
| POST | /api/seed | 샘플 데이터 삽입 |

---

## AI 에이전트 사용 가이드

이 플랫폼은 AI 에이전트가 콘텐츠 생성부터 발행 예약까지 전체 워크플로우를 자동화할 수 있도록 설계됨.

### 전형적인 AI 에이전트 워크플로우

```python
import httpx

BASE = "https://content-orchestration.vercel.app"
HEADERS = {"Authorization": "Bearer YOUR_KEY", "Content-Type": "application/json"}

# 1. 헬스체크
r = httpx.get(f"{BASE}/api/v1/health")

# 2. 캠페인 목록 확인
campaigns = httpx.get(f"{BASE}/api/v1/campaigns", headers=HEADERS).json()["data"]

# 3. 미작성 슬롯 조회
contents = httpx.get(
    f"{BASE}/api/v1/contents",
    params={"campaign_id": CAMPAIGN_ID, "status": "unwritten"},
    headers=HEADERS
).json()["data"]["contents"]

# 4. 각 슬롯에 콘텐츠 작성
for slot in contents:
    body = generate_content(slot["title"])  # AI 생성 함수

    # 4-1. 본문 업데이트
    httpx.put(
        f"{BASE}/api/v1/contents/{slot['id']}",
        json={"content_body": body},
        headers=HEADERS
    )

    # 4-2. 검토 요청
    httpx.post(
        f"{BASE}/api/v1/contents/{slot['id']}/transition",
        json={"to": "review"},
        headers=HEADERS
    )
```

### 상태 전환 가이드 (AI 에이전트용)

```json
// 검토 요청 (본문 작성 후)
POST /api/v1/contents/{id}/transition
{"to": "review"}

// 반려 (수정 지시)
POST /api/v1/contents/{id}/transition
{"to": "draft", "rejected_reason": "수정 사항: 해시태그 5개 추가 필요"}

// 승인
POST /api/v1/contents/{id}/transition
{"to": "approved", "approved_by": "VP/Musk"}

// 발행 예약 (Unix timestamp ms)
POST /api/v1/contents/{id}/transition
{"to": "scheduled", "scheduled_at": 1741132800000}
```

---

## 기술 스택

- **Framework**: Next.js 15 (App Router)
- **Database**: Turso (LibSQL) — `@libsql/client/web`
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## 관련 프로젝트

- `content-pipeline` — RSS 수집, 콘텐츠 아이디어 파이프라인 (별도 프로젝트)
- `richbukae-store` — 실제 발행 대상 채널 운영

---

**배포 URL**: https://content-orchestration.vercel.app
````

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README.md 작성 — 플랫폼 개요+사용법+API 가이드+AI 에이전트 통합 예시"
```

---

## Task 9: 시드 실행 + 최종 배포

**목적:** 실제 DB에 샘플 데이터 삽입 확인, Vercel 배포, 전체 동작 검증.

**Step 1: 전체 빌드 최종 확인**

```bash
cd "/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration"
npm run build 2>&1 | tail -30
```

Expected: ✓ Compiled successfully, 0 errors

**Step 2: Git push → Vercel 자동 배포 대기**

```bash
git pull --rebase origin main
git push origin main
```

**Step 3: 배포 완료 후 헬스체크**

```bash
curl https://content-orchestration.vercel.app/api/v1/health
```

Expected:
```json
{"success":true,"data":{"status":"ok","db":"connected","latency_ms":...}}
```

**Step 4: 샘플 데이터 삽입**

```bash
curl -X POST https://content-orchestration.vercel.app/api/seed
```

Expected:
```json
{"success":true,"message":"시드 완료: 캠페인 1개, 채널 4개, 콘텐츠 20개","seeded":true}
```

**Step 5: 플랫폼 동작 확인**

```bash
# 캠페인 목록
curl https://content-orchestration.vercel.app/api/v1/campaigns

# 전체 통계
curl https://content-orchestration.vercel.app/api/v1/stats
```

**Step 6: 브라우저 확인**

- https://content-orchestration.vercel.app → 캠페인 카드 표시 확인
- https://content-orchestration.vercel.app/api-docs → API 문서 페이지 확인

**Step 7: VP + CEO 완료 보고**

```bash
./scripts/vice-reply.sh "content-orchestration: AI API v1 + 샘플데이터 + README + API Docs 완료. URL: https://content-orchestration.vercel.app/api-docs" "완료"
```

---

## 완료 체크리스트

- [ ] Task 1: DB 스키마 보강 + API 유틸 (start_date/end_date/type, api-utils.ts)
- [ ] Task 2: Seed API — Richbukae × AI 설계자 샘플 데이터 20개
- [ ] Task 3: REST API v1 — Campaigns (GET/POST/PUT + /contents)
- [ ] Task 4: REST API v1 — Channels (GET/POST/PUT + /contents)
- [ ] Task 5: REST API v1 — Contents (GET/POST/PUT + /transition)
- [ ] Task 6: REST API v1 — Health + Stats
- [ ] Task 7: API Docs 페이지 (/api-docs)
- [ ] Task 8: README.md (플랫폼 가이드 + AI 에이전트 통합 예시)
- [ ] Task 9: 배포 + 샘플 데이터 삽입 확인

---

*Plan created: 2026-03-02 by Jarvis*
