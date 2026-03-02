'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
      <Link href={`/projects/${campaignId}`} className="text-sm text-blue-600 hover:underline">&larr; 프로젝트로 돌아가기</Link>
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
            <Link href={`/projects/${campaignId}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; 프로젝트</Link>
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
          ) : item.content_body ? (
            item.content_body.trim().startsWith('<') ? (
              // HTML 콘텐츠 렌더링 (뉴스레터 등)
              <div
                className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: item.content_body }}
              />
            ) : (
              // 마크다운/일반 텍스트
              <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans">
                {item.content_body}
              </pre>
            )
          ) : (
            <p className="text-sm text-gray-400 italic text-center py-4">본문이 없습니다.</p>
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
