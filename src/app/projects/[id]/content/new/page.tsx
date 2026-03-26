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

  // Derive type from selected channel platform (no setState needed)
  const derivedType = (() => {
    const ch = channels.find(c => c.id === form.channel_id);
    if (ch) {
      const platformTypeMap: Record<string, string> = {
        instagram: 'instagram', youtube: 'youtube',
        newsletter: 'newsletter', blog: 'blog', facebook: 'facebook', x: 'x',
      };
      return platformTypeMap[ch.platform] ?? 'blog';
    }
    return form.type;
  })();

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
            type: derivedType,
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
          <Link href={`/projects/${campaignId}`} className="text-sm text-gray-500 hover:text-gray-700">&larr; 프로젝트</Link>
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
