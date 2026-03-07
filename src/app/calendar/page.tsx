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

interface CalendarItem {
  id: unknown;
  title: unknown;
  scheduled_at: unknown;
  channel_platform: unknown;
  campaign_name: unknown;
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
  const month = parseInt(params.month ?? String(now.getMonth())); // 0-indexed

  const startTs = new Date(year, month, 1).getTime();
  const endTs = new Date(year, month + 1, 0, 23, 59, 59).getTime();
  const rawContents = await getCalendarContents(startTs, endTs).catch(() => []);
  const contents = rawContents as unknown as CalendarItem[];

  // 날짜별 그룹핑
  const byDay: Record<number, CalendarItem[]> = {};
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
      {/* 월 네비게이션 서브 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-base font-bold text-gray-800">캘린더</h1>
          <div className="flex items-center gap-2">
            <Link href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">◀</Link>
            <span className="text-sm font-bold text-gray-800">{year}년 {MONTH_NAMES[month]}</span>
            <Link href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">▶</Link>
          </div>
        </div>
      </div>

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
                      <div key={String(item.id)} className="text-xs truncate">
                        {PLATFORM_EMOJI[String(item.channel_platform)] ?? '📄'}{' '}
                        <span className="text-gray-700">{String(item.title) || '...'}</span>
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
