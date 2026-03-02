# 콘텐츠 오케스트레이션 플랫폼 재설계 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 content-orchestration을 캠페인(프로젝트) 기반 멀티채널 콘텐츠 오케스트레이션 플랫폼으로 재설계 — 홈(캠페인 카드), 프로젝트 상세(콘텐츠 슬롯), 채널 뷰(연동 상태), 캘린더 뷰 4개 화면 구현

**Architecture:** 기존 `content_queue` 테이블 재활용 + `campaigns`/`channels` 테이블 신규 추가. 콘텐츠 슬롯 = 미작성(unwritten) 상태 아이템으로 계획→실행 연결. 기존 ContentEditor 컴포넌트 재사용. 파이프라인 화면(RSS/로그/애널리틱스)은 이 플랜에서 제거.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Turso (LibSQL `@libsql/client`), npm

**프로젝트 경로:** `/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration/`

**설계 문서:** `docs/plans/2026/03/02/content-orchestration-redesign-design.md` (반드시 먼저 읽을 것)

---

## 기존 코드 핵심 파악

### DB 테이블 (`content_queue`)
이미 존재하는 컬럼: `id, type, pillar, topic, title, content_body, status, priority, channel, project, scheduled_at, approved_by, rejected_reason, platform_targets, publish_results, metadata, created_at, updated_at`

### 기존 status 값
`draft` → `review` → `approved` → `scheduled` → `published`

### 추가할 status 값
- `unwritten` — 미작성 (계획 슬롯만 생성, 내용 없음)
- `cancelled` — 취소

### 재사용할 컴포넌트
- `src/components/content-editor.tsx` — 마크다운 에디터
- `src/components/bulk-action-bar.tsx` — 벌크 액션

### 제거할 화면
- `src/app/[project]/rss/` — RSS 수집 (파이프라인 영역)
- `src/app/[project]/logs/` — 파이프라인 로그
- `src/app/[project]/analytics/` — 애널리틱스

---

## Task 1: 파이프라인 화면 제거 + 프로젝트 레이아웃 정리

**Files:**
- Delete: `src/app/[project]/rss/`
- Delete: `src/app/[project]/logs/`
- Delete: `src/app/[project]/analytics/`
- Modify: `src/app/[project]/layout.tsx`
- Modify: `src/app/[project]/page.tsx` (기존 브랜드 대시보드 — 나중에 교체 예정이므로 임시 리다이렉트)

**Step 1: 파이프라인 폴더 삭제**

```bash
cd /Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration
rm -rf src/app/[project]/rss
rm -rf src/app/[project]/logs
rm -rf src/app/[project]/analytics
```

**Step 2: [project]/layout.tsx에서 파이프라인 링크 제거**

`src/app/[project]/layout.tsx`를 읽어서 RSS, 로그, 애널리틱스 링크를 제거한다. 남길 링크: 대시보드, 콘텐츠, 캘린더.

**Step 3: 빌드 확인**

```bash
cd /Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration
npm run build 2>&1 | tail -20
```

예상: 에러 없음.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: 파이프라인 화면 제거 (rss/logs/analytics) — 오케스트레이션 집중"
```

---

## Task 2: DB 스키마 추가 (campaigns, channels 테이블)

**Files:**
- Modify: `src/lib/content-db.ts`

**Step 1: `ensureSchema` 함수에 새 테이블 생성 SQL 추가**

`src/lib/content-db.ts`의 `ensureSchema` 함수에 다음 ALTER/CREATE 추가:

```typescript
export async function ensureSchema(dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  // 기존 컬럼 추가 (하위호환)
  await db.execute(`ALTER TABLE content_queue ADD COLUMN scheduled_at INTEGER`).catch(() => {});
  await db.execute(`ALTER TABLE content_queue ADD COLUMN channel TEXT`).catch(() => {});
  await db.execute(`ALTER TABLE content_queue ADD COLUMN project TEXT`).catch(() => {});
  // 신규: campaign_id, channel_id
  await db.execute(`ALTER TABLE content_queue ADD COLUMN campaign_id TEXT`).catch(() => {});
  await db.execute(`ALTER TABLE content_queue ADD COLUMN channel_id TEXT`).catch(() => {});

  // campaigns 테이블
  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      goal TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).catch(() => {});

  // channels 테이블
  await db.execute(`
    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_name TEXT,
      connection_type TEXT,
      connection_status TEXT NOT NULL DEFAULT 'disconnected',
      connection_detail TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `).catch(() => {});
}
```

**Step 2: Campaign, Channel 인터페이스 추가**

`src/lib/content-db.ts` 상단 인터페이스 섹션에 추가:

```typescript
export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  goal: string | null;
  status: string; // active | paused | completed | archived
  created_at: number;
  updated_at: number;
}

export interface Channel {
  id: string;
  name: string;
  platform: string; // instagram | youtube | newsletter | blog | facebook | x
  account_name: string | null;
  connection_type: string | null; // getlate | brevo | wordpress | manual
  connection_status: string; // connected | disconnected | error
  connection_detail: string | null;
  created_at: number;
  updated_at: number;
}
```

**Step 3: CRUD 함수 추가**

`src/lib/content-db.ts`에 다음 함수들 추가:

```typescript
// === CAMPAIGNS ===

export async function getCampaigns(dbUrl?: string, dbToken?: string): Promise<Campaign[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM campaigns ORDER BY created_at DESC',
    args: [],
  });
  return result.rows as unknown as Campaign[];
}

export async function getCampaignById(id: string, dbUrl?: string, dbToken?: string): Promise<Campaign | null> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({ sql: 'SELECT * FROM campaigns WHERE id = ? LIMIT 1', args: [id] });
  return result.rows[0] ? (result.rows[0] as unknown as Campaign) : null;
}

export async function createCampaign(data: {
  name: string;
  description?: string;
  goal?: string;
}, dbUrl?: string, dbToken?: string): Promise<string> {
  const db = getContentDb(dbUrl, dbToken);
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO campaigns (id, name, description, goal, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    args: [id, data.name, data.description ?? null, data.goal ?? null, now, now],
  });
  return id;
}

export async function updateCampaign(id: string, data: {
  name?: string;
  description?: string;
  goal?: string;
  status?: string;
}, dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  const now = Date.now();
  await db.execute({
    sql: `UPDATE campaigns SET name = COALESCE(?, name), description = COALESCE(?, description), goal = COALESCE(?, goal), status = COALESCE(?, status), updated_at = ? WHERE id = ?`,
    args: [data.name ?? null, data.description ?? null, data.goal ?? null, data.status ?? null, now, id],
  });
}

// === CHANNELS ===

export async function getChannels(dbUrl?: string, dbToken?: string): Promise<Channel[]> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: 'SELECT * FROM channels ORDER BY platform, account_name',
    args: [],
  });
  return result.rows as unknown as Channel[];
}

export async function getChannelById(id: string, dbUrl?: string, dbToken?: string): Promise<Channel | null> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({ sql: 'SELECT * FROM channels WHERE id = ? LIMIT 1', args: [id] });
  return result.rows[0] ? (result.rows[0] as unknown as Channel) : null;
}

export async function createChannel(data: {
  name: string;
  platform: string;
  account_name?: string;
  connection_type?: string;
  connection_status?: string;
  connection_detail?: string;
}, dbUrl?: string, dbToken?: string): Promise<string> {
  const db = getContentDb(dbUrl, dbToken);
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute({
    sql: `INSERT INTO channels (id, name, platform, account_name, connection_type, connection_status, connection_detail, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.name, data.platform, data.account_name ?? null, data.connection_type ?? null, data.connection_status ?? 'disconnected', data.connection_detail ?? null, now, now],
  });
  return id;
}

export async function updateChannel(id: string, data: Partial<Omit<Channel, 'id' | 'created_at' | 'updated_at'>>, dbUrl?: string, dbToken?: string): Promise<void> {
  const db = getContentDb(dbUrl, dbToken);
  const now = Date.now();
  await db.execute({
    sql: `UPDATE channels SET name = COALESCE(?, name), platform = COALESCE(?, platform), account_name = COALESCE(?, account_name), connection_type = COALESCE(?, connection_type), connection_status = COALESCE(?, connection_status), connection_detail = COALESCE(?, connection_detail), updated_at = ? WHERE id = ?`,
    args: [data.name ?? null, data.platform ?? null, data.account_name ?? null, data.connection_type ?? null, data.connection_status ?? null, data.connection_detail ?? null, now, id],
  });
}

// === CAMPAIGN CONTENT STATS ===

export async function getCampaignContentStats(campaignId: string, dbUrl?: string, dbToken?: string): Promise<{
  draft: number; review: number; approved: number; scheduled: number; published: number; unwritten: number; cancelled: number; total: number;
}> {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: `SELECT status, COUNT(*) as count FROM content_queue WHERE campaign_id = ? GROUP BY status`,
    args: [campaignId],
  });
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.status as string] = Number(row.count);
  }
  return {
    draft: counts['draft'] ?? 0,
    review: counts['review'] ?? 0,
    approved: counts['approved'] ?? 0,
    scheduled: counts['scheduled'] ?? 0,
    published: counts['published'] ?? 0,
    unwritten: counts['unwritten'] ?? 0,
    cancelled: counts['cancelled'] ?? 0,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

// 캠페인의 콘텐츠 목록 (채널별 그룹핑용)
export async function getCampaignContents(campaignId: string, dbUrl?: string, dbToken?: string) {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: `SELECT * FROM content_queue WHERE campaign_id = ? ORDER BY channel_id, scheduled_at, created_at`,
    args: [campaignId],
  });
  return result.rows as unknown as ContentQueueItem[];
}

// 채널의 콘텐츠 목록 (프로젝트별 그룹핑용)
export async function getChannelContents(channelId: string, dbUrl?: string, dbToken?: string) {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: `SELECT * FROM content_queue WHERE channel_id = ? ORDER BY campaign_id, scheduled_at, created_at`,
    args: [channelId],
  });
  return result.rows as unknown as ContentQueueItem[];
}

// 캘린더용: 기간 내 예약/발행 콘텐츠
export async function getCalendarContents(startTs: number, endTs: number, dbUrl?: string, dbToken?: string) {
  const db = getContentDb(dbUrl, dbToken);
  const result = await db.execute({
    sql: `SELECT cq.*, c.name as campaign_name, ch.platform as channel_platform, ch.account_name
          FROM content_queue cq
          LEFT JOIN campaigns c ON cq.campaign_id = c.id
          LEFT JOIN channels ch ON cq.channel_id = ch.id
          WHERE cq.scheduled_at BETWEEN ? AND ?
          ORDER BY cq.scheduled_at`,
    args: [startTs, endTs],
  });
  return result.rows;
}
```

**Step 4: Server Actions 파일 생성**

`src/app/actions/campaign-actions.ts` 파일 생성:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { createCampaign, updateCampaign, createChannel, updateChannel } from '@/lib/content-db';

export async function createCampaignAction(data: { name: string; description?: string; goal?: string }) {
  const id = await createCampaign(data);
  revalidatePath('/');
  revalidatePath('/projects');
  return { id };
}

export async function updateCampaignAction(id: string, data: { name?: string; description?: string; goal?: string; status?: string }) {
  await updateCampaign(id, data);
  revalidatePath('/');
  revalidatePath('/projects');
  revalidatePath(`/projects/${id}`);
}

export async function createChannelAction(data: { name: string; platform: string; account_name?: string; connection_type?: string; connection_status?: string; connection_detail?: string }) {
  const id = await createChannel(data);
  revalidatePath('/channels');
  return { id };
}

export async function updateChannelAction(id: string, data: Partial<{ name: string; platform: string; account_name: string; connection_type: string; connection_status: string; connection_detail: string }>) {
  await updateChannel(id, data);
  revalidatePath('/channels');
  revalidatePath(`/channels/${id}`);
}
```

**Step 5: 빌드 확인**

```bash
cd /Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration
npm run build 2>&1 | tail -20
```

**Step 6: Commit**

```bash
git add src/lib/content-db.ts src/app/actions/campaign-actions.ts
git commit -m "feat: DB 스키마 추가 — campaigns/channels 테이블, CRUD 함수, Server Actions"
```

---

## Task 3: 홈 화면 재설계 (캠페인 카드)

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: 홈 화면 전체 교체**

`src/app/page.tsx`를 다음으로 교체:

```typescript
import Link from 'next/link';
import { getCampaigns, getCampaignContentStats, ensureSchema } from '@/lib/content-db';

export const revalidate = 60;

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<string, string> = {
  active: '진행중',
  paused: '일시중단',
  completed: '완료',
  archived: '아카이브',
};

export default async function HomePage() {
  await ensureSchema().catch(() => {});
  const campaigns = await getCampaigns().catch(() => []);

  const campaignStats = await Promise.all(
    campaigns.map(async (c) => ({
      campaign: c,
      stats: await getCampaignContentStats(c.id).catch(() => ({
        draft: 0, review: 0, approved: 0, scheduled: 0, published: 0, unwritten: 0, cancelled: 0, total: 0,
      })),
    }))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-800">콘텐츠 오케스트레이션</span>
          <div className="flex items-center gap-3">
            <Link href="/channels" className="text-xs text-gray-500 hover:text-blue-600 transition-colors">채널 관리</Link>
            <Link href="/calendar" className="text-xs text-gray-500 hover:text-blue-600 transition-colors">캘린더</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트</h1>
            <p className="mt-1 text-sm text-gray-500">캠페인별 콘텐츠 오케스트레이션</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 새 프로젝트
          </Link>
        </div>

        {campaignStats.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm mb-4">아직 프로젝트가 없습니다.</p>
            <Link href="/projects/new" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + 첫 프로젝트 만들기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignStats.map(({ campaign, stats }) => (
              <div key={campaign.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-base font-bold text-gray-900 truncate">{campaign.name}</h2>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {STATUS_LABELS[campaign.status] ?? campaign.status}
                  </span>
                </div>
                {campaign.goal && (
                  <p className="text-xs text-gray-400 mb-3 line-clamp-1">{campaign.goal}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-4">
                  <span className="font-medium text-yellow-700">Draft {stats.draft + stats.unwritten}</span>
                  <span>·</span>
                  <span className="font-medium text-purple-700">예약 {stats.scheduled}</span>
                  <span>·</span>
                  <span className="font-medium text-gray-500">발행 누적 {stats.published}</span>
                </div>
                <Link
                  href={`/projects/${campaign.id}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  열기
                </Link>
              </div>
            ))}

            <Link
              href="/projects/new"
              className="flex items-center justify-center bg-white rounded-xl border border-dashed border-gray-300 shadow-sm p-5 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors min-h-[160px]"
            >
              + 새 프로젝트 만들기
            </Link>
          </div>
        )}

        {/* 빠른 탐색 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-700 mb-3">빠른 탐색</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/channels" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
              📡 채널별 뷰
            </Link>
            <Link href="/calendar" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors">
              📅 캘린더
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
```

**Step 2: 빌드 확인**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: 홈 화면 재설계 — 캠페인 카드 (Draft·예약·발행 누적)"
```

---

## Task 4: 프로젝트 상세 화면 (콘텐츠 슬롯 + 채널별 그룹핑)

**Files:**
- Create: `src/app/projects/[id]/page.tsx`
- Create: `src/app/projects/new/page.tsx`
- Create: `src/app/projects/[id]/edit/page.tsx`

**Step 1: `src/app/projects/new/page.tsx` 생성**

새 캠페인 생성 폼:

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCampaignAction } from '@/app/actions/campaign-actions';

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', goal: '' });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    const { id } = await createCampaignAction({ name: form.name, description: form.description, goal: form.goal });
    router.push(`/projects/${id}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 홈</Link>
          <span className="text-sm font-bold text-gray-800">새 프로젝트</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">프로젝트 이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="예: AI 설계자 세일즈 PLF"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">목표</label>
            <input
              type="text"
              value={form.goal}
              onChange={(e) => setForm(f => ({ ...f, goal: e.target.value }))}
              placeholder="예: 리치부캐 채널 AI 설계자 서비스 세일즈 전환"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="프로젝트 배경, 전략 등"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Link href="/" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</Link>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '생성 중...' : '프로젝트 만들기'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
```

**Step 2: `src/app/projects/[id]/page.tsx` 생성**

캠페인 상세 — 채널별 그룹핑 콘텐츠 슬롯:

```typescript
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getCampaignById,
  getCampaignContents,
  getCampaignContentStats,
  getChannels,
  ensureSchema,
} from '@/lib/content-db';

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  unwritten: '미작성',
  draft: 'Draft',
  review: '검토요청',
  rejected: '반려',
  approved: '승인완료',
  scheduled: '예약',
  published: '발행완료',
  cancelled: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  unwritten: 'bg-gray-100 text-gray-500',
  draft: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  published: 'bg-green-200 text-green-800',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📱',
  youtube: '🎥',
  newsletter: '📰',
  blog: '✍️',
  facebook: '👥',
  x: '🐦',
};

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema().catch(() => {});
  const { id } = await params;
  const campaign = await getCampaignById(id);
  if (!campaign) notFound();

  const [contents, stats, allChannels] = await Promise.all([
    getCampaignContents(id),
    getCampaignContentStats(id),
    getChannels(),
  ]);

  // 채널별 그룹핑
  const channelMap = new Map(allChannels.map(c => [c.id, c]));
  const byChannel: Record<string, typeof contents> = {};
  for (const item of contents) {
    const key = item.channel_id ?? '__none__';
    if (!byChannel[key]) byChannel[key] = [];
    byChannel[key].push(item);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 홈</Link>
            <span className="text-sm font-bold text-gray-800">{campaign.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${id}/content/new`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
              + 콘텐츠 추가
            </Link>
            <Link href={`/projects/${id}/edit`} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 border border-gray-200 rounded-lg">편집</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* 목표 + 통계 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          {campaign.goal && (
            <p className="text-sm text-gray-600 mb-4">🎯 {campaign.goal}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-700">{stats.draft + stats.unwritten}</div>
              <div className="text-xs text-gray-500">Draft/미작성</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-700">{stats.review + stats.approved}</div>
              <div className="text-xs text-gray-500">검토중/승인</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-700">{stats.scheduled}</div>
              <div className="text-xs text-gray-500">예약</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-700">{stats.published}</div>
              <div className="text-xs text-gray-500">발행완료</div>
            </div>
          </div>
        </div>

        {/* 채널별 콘텐츠 슬롯 */}
        {Object.keys(byChannel).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
            <p className="text-gray-400 text-sm mb-3">아직 콘텐츠가 없습니다.</p>
            <Link href={`/projects/${id}/content/new`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + 첫 콘텐츠 추가
            </Link>
          </div>
        ) : (
          Object.entries(byChannel).map(([channelId, items]) => {
            const ch = channelId !== '__none__' ? channelMap.get(channelId) : null;
            const emoji = ch ? (PLATFORM_EMOJI[ch.platform] ?? '📄') : '📄';
            const channelName = ch ? `${ch.name} (${ch.account_name ?? ch.platform})` : '채널 미지정';
            const done = items.filter(i => i.status === 'published').length;
            return (
              <div key={channelId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-800">{emoji} {channelName}</h3>
                  <span className="text-xs text-gray-500">총 {items.length}건 · 발행 {done}건</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title || '(제목 없음)'}</p>
                        {item.scheduled_at && (
                          <p className="text-xs text-gray-400">{new Date(item.scheduled_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                      {item.status === 'unwritten' ? (
                        <Link href={`/projects/${id}/content/new?channel_id=${channelId}&prefill_id=${item.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">작성하기</Link>
                      ) : (
                        <Link href={`/projects/${id}/content/${item.id}`} className="text-xs text-gray-500 hover:text-gray-700">
                          {item.status === 'draft' || item.status === 'rejected' ? '편집' : '보기'}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
```

**Step 3: 빌드 확인**

```bash
npm run build 2>&1 | tail -20
```

**Step 4: Commit**

```bash
git add src/app/projects/
git commit -m "feat: 프로젝트 상세 화면 — 콘텐츠 슬롯 채널별 그룹핑, 새 프로젝트 생성"
```

---

## Task 5: 채널 관리 화면

**Files:**
- Create: `src/app/channels/page.tsx`
- Create: `src/app/channels/[id]/page.tsx`
- Create: `src/app/channels/new/page.tsx`

**Step 1: `src/app/channels/page.tsx` 생성**

채널 목록 + 연동 상태:

```typescript
import Link from 'next/link';
import { getChannels, getChannelContents, ensureSchema } from '@/lib/content-db';

export const revalidate = 0;

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📱',
  youtube: '🎥',
  newsletter: '📰',
  blog: '✍️',
  facebook: '👥',
  x: '🐦',
};

const CONNECTION_BADGE: Record<string, { label: string; color: string }> = {
  connected: { label: '✅ 자동발행 가능', color: 'text-green-600' },
  disconnected: { label: '⚠️ 미연결 (수동 발행)', color: 'text-yellow-600' },
  error: { label: '❌ 연결 오류', color: 'text-red-600' },
};

export default async function ChannelsPage() {
  await ensureSchema().catch(() => {});
  const channels = await getChannels().catch(() => []);

  const channelStats = await Promise.all(
    channels.map(async (ch) => {
      const contents = await getChannelContents(ch.id).catch(() => []);
      return {
        channel: ch,
        draft: contents.filter(c => ['draft', 'unwritten'].includes(c.status)).length,
        scheduled: contents.filter(c => c.status === 'scheduled').length,
        published: contents.filter(c => c.status === 'published').length,
      };
    })
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 홈</Link>
            <span className="text-sm font-bold text-gray-800">채널 관리</span>
          </div>
          <Link href="/channels/new" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
            + 채널 추가
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-3">
        {channelStats.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm mb-3">등록된 채널이 없습니다.</p>
            <Link href="/channels/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              + 첫 채널 추가
            </Link>
          </div>
        ) : (
          channelStats.map(({ channel, draft, scheduled, published }) => {
            const badge = CONNECTION_BADGE[channel.connection_status] ?? CONNECTION_BADGE['disconnected'];
            return (
              <div key={channel.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-5">
                <div className="text-3xl">{PLATFORM_EMOJI[channel.platform] ?? '📄'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-gray-900">{channel.name}</h3>
                    {channel.account_name && (
                      <span className="text-xs text-gray-400">{channel.account_name}</span>
                    )}
                  </div>
                  <p className={`text-xs ${badge.color} mb-1`}>
                    {badge.label}
                    {channel.connection_type && channel.connection_detail && ` — ${channel.connection_type}: ${channel.connection_detail}`}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Draft {draft}</span>
                    <span>·</span>
                    <span>예약 {scheduled}</span>
                    <span>·</span>
                    <span>발행 {published}</span>
                  </div>
                </div>
                <Link href={`/channels/${channel.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                  콘텐츠 보기 →
                </Link>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
```

**Step 2: `src/app/channels/[id]/page.tsx` 생성**

채널 상세 — 프로젝트별 그룹핑:

```typescript
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChannelById, getChannelContents, getCampaigns, ensureSchema } from '@/lib/content-db';

export const revalidate = 0;

const STATUS_LABELS: Record<string, string> = {
  unwritten: '미작성', draft: 'Draft', review: '검토요청',
  rejected: '반려', approved: '승인완료', scheduled: '예약',
  published: '발행완료', cancelled: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  unwritten: 'bg-gray-100 text-gray-500',
  draft: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  rejected: 'bg-red-100 text-red-700',
  approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  published: 'bg-green-200 text-green-800',
  cancelled: 'bg-gray-100 text-gray-400',
};

export default async function ChannelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await ensureSchema().catch(() => {});
  const { id } = await params;
  const [channel, contents, campaigns] = await Promise.all([
    getChannelById(id),
    getChannelContents(id),
    getCampaigns(),
  ]);
  if (!channel) notFound();

  const campaignMap = new Map(campaigns.map(c => [c.id, c]));
  const byCampaign: Record<string, typeof contents> = {};
  for (const item of contents) {
    const key = item.campaign_id ?? '__none__';
    if (!byCampaign[key]) byCampaign[key] = [];
    byCampaign[key].push(item);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <Link href="/channels" className="text-sm text-gray-500 hover:text-gray-700">← 채널 목록</Link>
          <span className="text-sm font-bold text-gray-800">{channel.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500">{channel.connection_status === 'connected' ? '✅' : '⚠️'} {channel.connection_type ?? '미연결'}: {channel.connection_detail ?? '-'}</p>
        </div>

        {Object.entries(byCampaign).map(([campaignId, items]) => {
          const campaign = campaignId !== '__none__' ? campaignMap.get(campaignId) : null;
          return (
            <div key={campaignId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-800">📌 {campaign?.name ?? '프로젝트 미지정'}</h3>
                <span className="text-xs text-gray-500">{items.length}건</span>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.title || '(제목 없음)'}</p>
                      {item.scheduled_at && (
                        <p className="text-xs text-gray-400">{new Date(item.scheduled_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    {campaign && (
                      <Link href={`/projects/${campaign.id}/content/${item.id}`} className="text-xs text-gray-500 hover:text-gray-700">
                        {['draft', 'unwritten', 'rejected'].includes(item.status) ? '편집' : '보기'}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}
```

**Step 3: `src/app/channels/new/page.tsx` 생성**

채널 추가 폼 (New Project 폼과 유사한 구조, platform/account_name/connection_type/connection_status/connection_detail 입력):

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createChannelAction } from '@/app/actions/campaign-actions';

const PLATFORMS = [
  { value: 'instagram', label: '📱 인스타그램' },
  { value: 'youtube', label: '🎥 유튜브' },
  { value: 'newsletter', label: '📰 뉴스레터' },
  { value: 'blog', label: '✍️ 블로그' },
  { value: 'facebook', label: '👥 페이스북' },
  { value: 'x', label: '🐦 X (트위터)' },
];

const CONNECTION_TYPES: Record<string, string[]> = {
  instagram: ['getlate', 'manual'],
  youtube: ['manual', 'youtube_api'],
  newsletter: ['brevo', 'manual'],
  blog: ['wordpress', 'manual'],
  facebook: ['getlate', 'manual'],
  x: ['getlate', 'manual'],
};

export default function NewChannelPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', platform: 'instagram', account_name: '',
    connection_type: 'manual', connection_status: 'disconnected', connection_detail: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await createChannelAction(form);
    router.push('/channels');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link href="/channels" className="text-sm text-gray-500 hover:text-gray-700">← 채널 목록</Link>
          <span className="text-sm font-bold text-gray-800">채널 추가</span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">채널 이름 *</label>
            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="예: 리치부캐 인스타그램" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">플랫폼 *</label>
            <select value={form.platform} onChange={(e) => setForm(f => ({ ...f, platform: e.target.value, connection_type: 'manual' }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">계정명</label>
            <input type="text" value={form.account_name} onChange={(e) => setForm(f => ({ ...f, account_name: e.target.value }))}
              placeholder="예: @richbukae_official"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연동 방식</label>
            <select value={form.connection_type} onChange={(e) => setForm(f => ({ ...f, connection_type: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {(CONNECTION_TYPES[form.platform] ?? ['manual']).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연동 상태</label>
            <select value={form.connection_status} onChange={(e) => setForm(f => ({ ...f, connection_status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="connected">✅ 연결됨</option>
              <option value="disconnected">⚠️ 미연결</option>
              <option value="error">❌ 오류</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">연동 상세</label>
            <input type="text" value={form.connection_detail} onChange={(e) => setForm(f => ({ ...f, connection_detail: e.target.value }))}
              placeholder="예: contact@richbukae.com (Brevo)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-3">
            <Link href="/channels" className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</Link>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '추가 중...' : '채널 추가'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
```

**Step 4: 빌드 확인**

```bash
npm run build 2>&1 | tail -20
```

**Step 5: Commit**

```bash
git add src/app/channels/
git commit -m "feat: 채널 관리 화면 — 목록(연동상태), 상세(프로젝트별 그룹핑), 채널 추가"
```

---

## Task 6: 캘린더 뷰 재설계

**Files:**
- Create: `src/app/calendar/page.tsx` (기존 `/[project]/calendar`를 전체 캘린더로 재설계)

**Step 1: `src/app/calendar/page.tsx` 생성**

월간 캘린더 — 채널 아이콘 표시:

```typescript
import Link from 'next/link';
import { getCalendarContents, ensureSchema } from '@/lib/content-db';

export const revalidate = 0;

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📱', youtube: '🎥', newsletter: '📰', blog: '✍️', facebook: '👥', x: '🐦',
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await ensureSchema().catch(() => {});
  const params = await searchParams;
  const now = new Date();
  const year = parseInt(params.year ?? String(now.getFullYear()));
  const month = parseInt(params.month ?? String(now.getMonth())) ; // 0-indexed

  const startTs = new Date(year, month, 1).getTime();
  const endTs = new Date(year, month + 1, 0, 23, 59, 59).getTime();
  const contents = await getCalendarContents(startTs, endTs).catch(() => []);

  // 날짜별 그룹핑
  const byDay: Record<number, typeof contents> = {};
  for (const item of contents) {
    if (!item.scheduled_at) continue;
    const day = new Date(Number(item.scheduled_at)).getDate();
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month); // 0=일요일

  const prevMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const DAY_NAMES = ['일','월','화','수','목','금','토'];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">← 홈</Link>
            <span className="text-sm font-bold text-gray-800">캘린더</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">◀</Link>
            <span className="text-sm font-bold text-gray-800">{year}년 {MONTH_NAMES[month]}</span>
            <Link href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">▶</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAY_NAMES.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-medium text-gray-500">{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayItems = byDay[day] ?? [];
              const isToday = now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
              return (
                <div key={day} className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 ${isToday ? 'bg-blue-50' : ''}`}>
                  <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>{day}</div>
                  <div className="space-y-0.5">
                    {dayItems.slice(0, 3).map((item) => (
                      <div key={item.id as string} className="text-xs truncate">
                        {PLATFORM_EMOJI[(item as Record<string, unknown>).channel_platform as string] ?? '📄'}{' '}
                        <span className="text-gray-700">{item.title as string || '...'}</span>
                      </div>
                    ))}
                    {dayItems.length > 3 && (
                      <div className="text-xs text-gray-400">+{dayItems.length - 3}건</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 범례 */}
        <div className="mt-4 flex flex-wrap gap-3">
          {Object.entries(PLATFORM_EMOJI).map(([platform, emoji]) => (
            <span key={platform} className="text-xs text-gray-500">{emoji} {platform}</span>
          ))}
        </div>
      </main>
    </div>
  );
}
```

**Step 2: 빌드 확인**

```bash
npm run build 2>&1 | tail -20
```

**Step 3: Commit**

```bash
git add src/app/calendar/
git commit -m "feat: 캘린더 뷰 — 전체 채널 월간 캘린더, 채널 아이콘 표시"
```

---

## Task 7: Push + 배포 확인

**Step 1: 최종 빌드 확인**

```bash
cd /Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration
npm run build 2>&1 | tail -30
```

**Step 2: Pull + Push**

```bash
git pull --rebase origin main
git push origin main
```

**Step 3: Vercel 배포 확인**

```bash
# 30초 후 배포 상태 확인
sleep 30
curl -s -o /dev/null -w "%{http_code}" https://content-orchestration.vercel.app/
```

예상: 200

**Step 4: 완료 보고**

팀 리더에게 완료 보고 (커밋 해시 포함).

---

## 완료 기준

- [ ] 파이프라인 화면(rss/logs/analytics) 제거
- [ ] `campaigns`, `channels` 테이블 생성 (ensureSchema)
- [ ] 홈 화면: 캠페인 카드 (Draft·예약·발행 누적)
- [ ] 프로젝트 상세: 채널별 콘텐츠 슬롯, 빈 슬롯 [작성하기]
- [ ] 채널 목록: 연동 상태 표시
- [ ] 채널 상세: 프로젝트별 그룹핑
- [ ] 캘린더: 월간, 채널 아이콘
- [ ] `npm run build` 에러 없음
- [ ] main 브랜치 push 완료
