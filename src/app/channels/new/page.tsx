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
              <option value="connected">연결됨</option>
              <option value="disconnected">미연결</option>
              <option value="error">오류</option>
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
