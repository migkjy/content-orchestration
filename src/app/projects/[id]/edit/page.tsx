'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { updateCampaignAction } from '@/app/actions/campaign-actions';

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', goal: '', status: 'active' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setForm({
            name: data.name ?? '',
            description: data.description ?? '',
            goal: data.goal ?? '',
            status: data.status ?? 'active',
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    await updateCampaignAction(id, form);
    router.push(`/projects/${id}`);
  }

  if (!loaded) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">로딩중...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <Link href={`/projects/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← 돌아가기</Link>
          <span className="text-sm font-bold text-gray-800">프로젝트 편집</span>
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
            <select
              value={form.status}
              onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">진행중</option>
              <option value="paused">일시중단</option>
              <option value="completed">완료</option>
              <option value="archived">아카이브</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Link href={`/projects/${id}`} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">취소</Link>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
