'use client';

import { useState } from 'react';
import { scheduleContent } from '@/app/actions/content';

function computeMinDatetime(): string {
  const d = new Date(Date.now() + 10 * 60 * 1000);
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(d.getTime() + kstOffset);
  return kst.toISOString().slice(0, 16);
}

export function SchedulerForm({
  contentId,
  projectId,
  currentScheduledAt,
}: {
  contentId: string;
  projectId: string;
  currentScheduledAt: number | null;
}) {
  const [open, setOpen] = useState(false);

  // Unix ms → datetime-local 형식 (YYYY-MM-DDTHH:mm)
  const toDatetimeLocal = (ms: number | null) => {
    if (!ms) return '';
    const d = new Date(ms);
    // KST (UTC+9) 기준
    const offset = 9 * 60 * 60 * 1000;
    const kst = new Date(d.getTime() + offset);
    return kst.toISOString().slice(0, 16);
  };

  // datetime-local 값 → Unix ms (KST → UTC)
  const toUnixMs = (value: string) => {
    if (!value) return 0;
    // datetime-local은 로컬 시간 기준 → 직접 Date.parse로 UTC 변환
    return new Date(value).getTime();
  };

  const [datetime, setDatetime] = useState(toDatetimeLocal(currentScheduledAt));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ms = toUnixMs(datetime);
    if (!ms) return;
    await scheduleContent(contentId, projectId, ms);
    setOpen(false);
  };

  // 최소값: 지금으로부터 10분 후 (initialized via useState initializer to avoid impure render)
  const [minDatetime] = useState(computeMinDatetime);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100 transition-colors"
      >
        🕐 예약 설정
        {currentScheduledAt && (
          <span className="ml-1 text-purple-500">
            ({new Date(currentScheduledAt).toLocaleDateString('ko-KR')})
          </span>
        )}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="datetime-local"
        value={datetime}
        min={minDatetime}
        onChange={(e) => setDatetime(e.target.value)}
        required
        className="px-2 py-1 text-xs border border-purple-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400 text-gray-900"
      />
      <button
        type="submit"
        className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-700 transition-colors"
      >
        예약 확정
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
      >
        취소
      </button>
    </form>
  );
}
