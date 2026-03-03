# Content Detail Pages Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement content detail/edit pages, new content form, and comment system for `/projects/[campaignId]` routes so CEO can view, edit, change status, reschedule, and comment on content items.

**Architecture:** Client Components using fetch API (matching existing `/projects/[id]/edit/page.tsx` pattern). REST API v1 already complete (`/api/v1/contents/[id]`, `/api/v1/contents/[id]/transition`). Comments use a new `content_comments` table added via `ensureSchema`. No Server Actions needed — all via existing API endpoints.

**Tech Stack:** Next.js 15 App Router (Client Components), Tailwind CSS, Turso/LibSQL, existing `/api/v1/` REST endpoints

---

## Context: Existing Code to Know

**Project path:** `projects/content-orchestration/src/`

**Existing patterns to follow:**
- `src/app/projects/[id]/edit/page.tsx` — Client Component pattern, fetch API usage
- `src/app/projects/[id]/page.tsx` — Campaign detail page with content list (links to missing routes)

**Existing REST APIs (fully working):**
- `GET /api/v1/contents/[id]` → `{ success, data: ContentQueueItem }`
- `PUT /api/v1/contents/[id]` → update title/content_body
- `POST /api/v1/contents/[id]/transition` body: `{ to: string, scheduled_at?: number }` → change status
- `GET /api/v1/channels` → channel list

**Status flow allowed transitions:**
```
unwritten → draft | cancelled
draft     → review | cancelled
review    → approved | draft | cancelled
approved  → scheduled | draft | cancelled
scheduled → published | approved | cancelled
published → (none)
cancelled → draft
```

**Status labels (Korean):**
```
unwritten=미작성, draft=Draft, review=검토요청, approved=승인완료,
scheduled=예약, published=발행완료, cancelled=취소
```

---

## Task 1: Comments DB Schema + API

**Files:**
- Modify: `src/lib/content-db.ts` (add `ensureSchema` comment table + `getComments`/`addComment` functions)
- Create: `src/app/api/v1/contents/[id]/comments/route.ts`

**Step 1: Add `content_comments` table to `ensureSchema`**

In `src/lib/content-db.ts`, find the `ensureSchema` function (around line 129) and add after the channels ALTER TABLE block:

```typescript
  // content_comments 테이블
  await db.execute(`
    CREATE TABLE IF NOT EXISTS content_comments (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '자비스',
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).catch(() => {});
```

**Step 2: Add `getComments` and `addComment` functions to `src/lib/content-db.ts`**

Add at the end of the file:

```typescript
export interface ContentComment {
  id: string;
  content_id: string;
  author: string;
  body: string;
  created_at: number;
}

export async function getComments(contentId: string, dbUrl?: string, dbToken?: string): Promise<ContentComment[]> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute(`CREATE TABLE IF NOT EXISTS content_comments (id TEXT PRIMARY KEY, content_id TEXT NOT NULL, author TEXT NOT NULL DEFAULT '자비스', body TEXT NOT NULL, created_at INTEGER NOT NULL)`).catch(() => {});
  const result = await db.execute({
    sql: 'SELECT * FROM content_comments WHERE content_id = ? ORDER BY created_at ASC',
    args: [contentId],
  });
  return result.rows as unknown as ContentComment[];
}

export async function addComment(contentId: string, body: string, author: string = '자비스', dbUrl?: string, dbToken?: string): Promise<ContentComment> {
  const db = getContentDb(dbUrl, dbToken);
  await db.execute(`CREATE TABLE IF NOT EXISTS content_comments (id TEXT PRIMARY KEY, content_id TEXT NOT NULL, author TEXT NOT NULL DEFAULT '자비스', body TEXT NOT NULL, created_at INTEGER NOT NULL)`).catch(() => {});
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.execute({
    sql: 'INSERT INTO content_comments (id, content_id, author, body, created_at) VALUES (?, ?, ?, ?, ?)',
    args: [id, contentId, author, body, now],
  });
  return { id, content_id: contentId, author, body, created_at: now };
}
```

**Step 3: Create `src/app/api/v1/contents/[id]/comments/route.ts`**

```typescript
import { getComments, addComment } from '@/lib/content-db';
import { requireAuth, apiOk, apiError } from '@/lib/api-utils';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;
  const { id } = await params;
  const comments = await getComments(id);
  return apiOk(comments);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireAuth(request);
  if (auth) return auth;
  const { id } = await params;
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return apiError('Invalid JSON'); }
  const text = body.body as string | undefined;
  const author = (body.author as string | undefined) ?? '자비스';
  if (!text || typeof text !== 'string') return apiError('body is required');
  const comment = await addComment(id, text, author);
  return apiOk(comment, 201);
}
```

**Step 4: Build check**

```bash
cd projects/content-orchestration
npm run build 2>&1 | tail -20
```
Expected: no errors

**Step 5: Commit**

```bash
git add src/lib/content-db.ts src/app/api/v1/contents/[id]/comments/route.ts
git commit -m "feat: add content_comments schema + GET/POST /api/v1/contents/[id]/comments"
```

---

## Task 2: Content Detail/Edit Page

**Files:**
- Create: `src/app/projects/[id]/content/[contentId]/page.tsx`

This is a Client Component. It loads content via `GET /api/v1/contents/[contentId]`, handles status transitions via `POST /api/v1/contents/[contentId]/transition`, updates body via `PUT /api/v1/contents/[contentId]`, and shows/adds comments via the new comments API.

**Step 1: Create `src/app/projects/[id]/content/[contentId]/page.tsx`**

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContentItem {
  id: string;
  title: string | null;
  content_body: string | null;
  status: string;
  scheduled_at: number | null;
  channel_id: string | null;
  campaign_id: string | null;
  type: string;
  created_at: number;
  updated_at: number;
}

interface Comment {
  id: string;
  author: string;
  body: string;
  created_at: number;
}

const STATUS_LABELS: Record<string, string> = {
  unwritten: '미작성', draft: 'Draft', review: '검토요청',
  approved: '승인완료', scheduled: '예약', published: '발행완료', cancelled: '취소',
};

const STATUS_COLORS: Record<string, string> = {
  unwritten: 'bg-gray-100 text-gray-500',
  draft: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  scheduled: 'bg-purple-100 text-purple-700',
  published: 'bg-green-200 text-green-800',
  cancelled: 'bg-gray-100 text-gray-400',
};

const TRANSITIONS: Record<string, string[]> = {
  unwritten: ['draft', 'cancelled'],
  draft: ['review', 'cancelled'],
  review: ['approved', 'draft', 'cancelled'],
  approved: ['scheduled', 'draft', 'cancelled'],
  scheduled: ['published', 'approved', 'cancelled'],
  published: [],
  cancelled: ['draft'],
};

const TRANSITION_LABELS: Record<string, string> = {
  draft: 'Draft로', review: '검토 요청', approved: '승인',
  scheduled: '예약', published: '발행', cancelled: '취소',
};

const TRANSITION_COLORS: Record<string, string> = {
  draft: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  review: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  approved: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  scheduled: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  published: 'bg-green-600 text-white border-green-700 hover:bg-green-700',
  cancelled: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
};

export default function ContentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const contentId = params.contentId as string;

  const [item, setItem] = useState<ContentItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [scheduleAt, setScheduleAt] = useState('');
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, cmRes] = await Promise.all([
        fetch(`/api/v1/contents/${contentId}`),
        fetch(`/api/v1/contents/${contentId}/comments`),
      ]);
      if (!cRes.ok) { setError('콘텐츠를 찾을 수 없습니다.'); setLoading(false); return; }
      const cData = await cRes.json();
      const content = cData.data;
      setItem(content);
      setEditTitle(content.title ?? '');
      setEditBody(content.content_body ?? '');
      if (content.scheduled_at) {
        const d = new Date(content.scheduled_at);
        setScheduleAt(d.toISOString().slice(0, 16));
      }
      if (cmRes.ok) {
        const cmData = await cmRes.json();
        setComments(cmData.data ?? []);
      }
    } catch {
      setError('로딩 중 오류가 발생했습니다.');
    }
    setLoading(false);
  }, [contentId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSave() {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/contents/${contentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, content_body: editBody }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? '저장 실패'); } else {
        setSuccessMsg('저장되었습니다.');
        setTimeout(() => setSuccessMsg(null), 2000);
        await loadData();
      }
    } catch { setError('저장 중 오류'); }
    setSaving(false);
  }

  async function handleTransition(to: string) {
    if (!item) return;
    setTransitioning(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { to };
      if (to === 'scheduled' && scheduleAt) {
        body.scheduled_at = new Date(scheduleAt).getTime();
      }
      const res = await fetch(`/api/v1/contents/${contentId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error ?? '상태 변경 실패'); } else {
        setSuccessMsg(`상태가 "${STATUS_LABELS[to]}"로 변경되었습니다.`);
        setTimeout(() => setSuccessMsg(null), 2000);
        await loadData();
      }
    } catch { setError('상태 변경 중 오류'); }
    setTransitioning(false);
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    try {
      const res = await fetch(`/api/v1/contents/${contentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText }),
      });
      const data = await res.json();
      if (data.success) {
        setCommentText('');
        setComments(prev => [...prev, data.data]);
      }
    } catch { setError('코멘트 추가 실패'); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">로딩중...</div>
  );

  if (error && !item) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <p className="text-red-600 text-sm">{error}</p>
      <Link href={`/projects/${campaignId}`} className="text-sm text-blue-600 hover:underline">← 프로젝트로 돌아가기</Link>
    </div>
  );

  if (!item) return null;

  const nextStatuses = TRANSITIONS[item.status] ?? [];
  const isEditable = item.status === 'draft' || item.status === 'unwritten' || item.status === 'review';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/projects/${campaignId}`} className="text-sm text-gray-500 hover:text-gray-700">← 프로젝트</Link>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
              {STATUS_LABELS[item.status] ?? item.status}
            </span>
          </div>
          {isEditable && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-5">
        {/* Feedback messages */}
        {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        {successMsg && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{successMsg}</div>}

        {/* Title */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">제목</label>
          {isEditable ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full text-lg font-bold text-gray-900 border-0 border-b border-gray-200 pb-1 focus:outline-none focus:border-blue-500 bg-transparent"
              placeholder="콘텐츠 제목"
            />
          ) : (
            <h1 className="text-lg font-bold text-gray-900">{item.title || '(제목 없음)'}</h1>
          )}
          <div className="flex gap-3 mt-2 text-xs text-gray-400">
            <span>유형: {item.type}</span>
            {item.scheduled_at && (
              <span className="text-purple-600">예약: {new Date(item.scheduled_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            )}
            <span>수정: {new Date(item.updated_at).toLocaleDateString('ko-KR')}</span>
          </div>
        </div>

        {/* Status transitions */}
        {nextStatuses.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-xs font-medium text-gray-500 mb-3">상태 변경</h3>
            {/* Schedule input for 'scheduled' transition */}
            {item.status === 'approved' && (
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">예약 일시 (예약 상태로 변경 시 필요)</label>
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={e => setScheduleAt(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map(to => (
                <button
                  key={to}
                  onClick={() => handleTransition(to)}
                  disabled={transitioning}
                  className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors disabled:opacity-50 ${TRANSITION_COLORS[to] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}
                >
                  {TRANSITION_LABELS[to] ?? to}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content body */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">본문</label>
          {isEditable ? (
            <textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              rows={16}
              className="w-full text-sm text-gray-800 font-mono border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="콘텐츠 본문을 입력하세요 (Markdown 지원)..."
            />
          ) : (
            <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
              {item.content_body || <span className="text-gray-400 italic">본문이 없습니다.</span>}
            </pre>
          )}
        </div>

        {/* Comments */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-xs font-medium text-gray-500 mb-3">코멘트 {comments.length > 0 ? `(${comments.length})` : ''}</h3>
          {comments.length === 0 && (
            <p className="text-xs text-gray-400 mb-3">아직 코멘트가 없습니다.</p>
          )}
          <div className="space-y-3 mb-4">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0 mt-0.5">
                  {c.author.charAt(0)}
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-gray-700">{c.author}</span>
                    <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              rows={2}
              placeholder="코멘트를 입력하세요..."
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleAddComment(); }}
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 self-end"
            >
              추가
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Cmd+Enter로 빠르게 추가</p>
        </div>
      </main>
    </div>
  );
}
```

**Step 2: Build check**

```bash
cd projects/content-orchestration
npm run build 2>&1 | tail -30
```
Expected: no errors (new route compiles cleanly)

**Step 3: Commit**

```bash
git add src/app/projects/[id]/content/[contentId]/page.tsx
git commit -m "feat: add content detail/edit/status/comment page for campaigns"
```

---

## Task 3: New Content Page

**Files:**
- Create: `src/app/projects/[id]/content/new/page.tsx`

This page handles two cases:
1. `?channel_id=xxx` — creating a brand new content slot
2. `?prefill_id=xxx&channel_id=xxx` — converting an "unwritten" slot to draft (PUT existing item)

**Step 1: Create `src/app/projects/[id]/content/new/page.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Channel {
  id: string;
  name: string;
  platform: string;
  account_name: string | null;
}

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📱', youtube: '🎥', newsletter: '📰', blog: '✍️', facebook: '👥', x: '🐦',
};

export default function NewContentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const channelIdParam = searchParams.get('channel_id') ?? '';
  const prefillId = searchParams.get('prefill_id') ?? '';

  const [channels, setChannels] = useState<Channel[]>([]);
  const [form, setForm] = useState({
    title: '',
    content_body: '',
    channel_id: channelIdParam,
    type: 'blog',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/channels')
      .then(r => r.json())
      .then(d => setChannels(d.data ?? []));
  }, []);

  // Set type from selected channel platform
  useEffect(() => {
    const ch = channels.find(c => c.id === form.channel_id);
    if (ch) {
      const platformTypeMap: Record<string, string> = {
        instagram: 'instagram', youtube: 'youtube',
        newsletter: 'newsletter', blog: 'blog', facebook: 'facebook', x: 'x',
      };
      setForm(f => ({ ...f, type: platformTypeMap[ch.platform] ?? 'blog' }));
    }
  }, [form.channel_id, channels]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('제목을 입력하세요.'); return; }
    setSaving(true);
    setError(null);

    try {
      if (prefillId) {
        // Convert unwritten slot: save body + transition to draft
        const putRes = await fetch(`/api/v1/contents/${prefillId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: form.title, content_body: form.content_body }),
        });
        if (!putRes.ok) { setError('저장 실패'); setSaving(false); return; }
        await fetch(`/api/v1/contents/${prefillId}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: 'draft' }),
        });
        router.push(`/projects/${campaignId}/content/${prefillId}`);
      } else {
        // Create new content slot
        const res = await fetch('/api/v1/contents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            content_body: form.content_body || null,
            type: form.type,
            channel_id: form.channel_id || null,
            campaign_id: campaignId,
            status: form.content_body ? 'draft' : 'unwritten',
          }),
        });
        const data = await res.json();
        if (!data.success) { setError(data.error ?? '생성 실패'); setSaving(false); return; }
        router.push(`/projects/${campaignId}/content/${data.data.id}`);
      }
    } catch { setError('오류가 발생했습니다.'); }
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link href={`/projects/${campaignId}`} className="text-sm text-gray-500 hover:text-gray-700">← 프로젝트</Link>
          <span className="text-sm font-bold text-gray-800">{prefillId ? '콘텐츠 작성' : '새 콘텐츠 추가'}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                className="w-full text-base font-medium border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="콘텐츠 제목을 입력하세요"
              />
            </div>

            {/* Channel selector */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">채널</label>
              <select
                value={form.channel_id}
                onChange={e => setForm(f => ({ ...f, channel_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">채널 선택</option>
                {channels.map(ch => (
                  <option key={ch.id} value={ch.id}>
                    {PLATFORM_EMOJI[ch.platform] ?? '📄'} {ch.name} {ch.account_name ? `(${ch.account_name})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <label className="block text-xs font-medium text-gray-500 mb-1.5">본문 (선택사항 — 나중에 작성 가능)</label>
            <textarea
              value={form.content_body}
              onChange={e => setForm(f => ({ ...f, content_body: e.target.value }))}
              rows={14}
              className="w-full text-sm text-gray-800 font-mono border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="마크다운으로 작성하세요..."
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Link href={`/projects/${campaignId}`} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</Link>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : (prefillId ? '작성 완료' : '추가')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
```

**Step 2: Build check**

```bash
cd projects/content-orchestration
npm run build 2>&1 | tail -30
```
Expected: no errors

**Step 3: Commit**

```bash
git add src/app/projects/[id]/content/new/page.tsx
git commit -m "feat: add new content creation page for campaigns"
```

---

## Task 4: Deploy + Verify

**Step 1: Push to GitHub (Vercel auto-deploys)**

```bash
cd projects/content-orchestration
git pull --rebase origin main
git push origin main
```

Wait ~2 minutes for Vercel to deploy.

**Step 2: Verify deployment**

```bash
curl -s https://content-orchestration.vercel.app/api/v1/contents/[any-content-id] | python3 -m json.tool
```
Replace `[any-content-id]` with actual ID from `GET /api/v1/campaigns` response.

**Step 3: Browser test**

Open: `https://content-orchestration.vercel.app/projects/fbce25ae-44c8-4e08-8d8b-e81701db8a07`

Test:
1. Click "편집" on a draft item → should open content detail page
2. Click "보기" on a published item → should open read-only view
3. Click "작성하기" on an unwritten item → should open new content form
4. On detail page: edit title/body and save → should update
5. On detail page: click status transition button → status should change
6. On detail page: add comment → should appear in list

**Step 4: If Vercel auto-deploy didn't trigger**

```bash
cd projects/content-orchestration
vercel --prod
```

**Step 5: Final commit message check**

```bash
cd projects/content-orchestration
git log --oneline -5
```

Expected commits:
- `feat: add content_comments schema + GET/POST api`
- `feat: add content detail/edit/status/comment page for campaigns`
- `feat: add new content creation page for campaigns`
