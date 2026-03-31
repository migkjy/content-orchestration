import Link from 'next/link';
import {
  getYoutubeVideos,
  ensureYoutubeSchema,
  type YoutubeVideo,
} from '@/lib/youtube-db';

export const revalidate = 60;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  scripting: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  filming: 'bg-blue-100 text-blue-800 border-blue-300',
  editing: 'bg-purple-100 text-purple-800 border-purple-300',
  review: 'bg-orange-100 text-orange-800 border-orange-300',
  published: 'bg-green-100 text-green-800 border-green-300',
};

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  // 0 = Sunday, we want Monday as first day
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function StatusDot({ status }: { status: string }) {
  const dotColors: Record<string, string> = {
    draft: 'bg-gray-400',
    scripting: 'bg-yellow-500',
    filming: 'bg-blue-500',
    editing: 'bg-purple-500',
    review: 'bg-orange-500',
    published: 'bg-green-500',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColors[status] ?? 'bg-gray-400'}`} />;
}

function VideoCard({ video }: { video: YoutubeVideo }) {
  const cls = STATUS_COLORS[video.status] ?? 'bg-gray-100 text-gray-600 border-gray-300';
  return (
    <Link
      href={`/youtube/${video.id}`}
      className={`block px-1.5 py-1 rounded border text-[10px] leading-tight truncate hover:opacity-80 transition-opacity ${cls}`}
      title={`${video.title} (${video.status})`}
    >
      <span className="flex items-center gap-1">
        <StatusDot status={video.status} />
        <span className="truncate">{video.title}</span>
      </span>
    </Link>
  );
}

function CalendarGrid({
  year,
  month,
  videosByDate,
}: {
  year: number;
  month: number;
  videosByDate: Record<string, YoutubeVideo[]>;
}) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const cells: { day: number | null; dateKey: string }[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ day: null, dateKey: '' });
    } else {
      const m = String(month + 1).padStart(2, '0');
      const d = String(dayNum).padStart(2, '0');
      cells.push({ day: dayNum, dateKey: `${year}-${m}-${d}` });
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {weekdays.map((wd) => (
          <div key={wd} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase">
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const isToday = isCurrentMonth && cell.day === today.getDate();
          const videos = cell.dateKey ? (videosByDate[cell.dateKey] ?? []) : [];
          const isWeekend = idx % 7 >= 5;

          return (
            <div
              key={idx}
              className={`min-h-[100px] border-b border-r border-gray-100 p-1.5 ${
                cell.day === null
                  ? 'bg-gray-50/50'
                  : isWeekend
                  ? 'bg-gray-50/30'
                  : 'bg-white'
              }`}
            >
              {cell.day !== null && (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium leading-none ${
                        isToday
                          ? 'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center'
                          : 'text-gray-500'
                      }`}
                    >
                      {cell.day}
                    </span>
                    {videos.length > 0 && (
                      <span className="text-[10px] text-gray-400">{videos.length}</span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {videos.slice(0, 3).map((v) => (
                      <VideoCard key={v.id} video={v} />
                    ))}
                    {videos.length > 3 && (
                      <span className="block text-[10px] text-gray-400 pl-1">
                        +{videos.length - 3} more
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusLegend() {
  const items = [
    { status: 'draft', label: 'Draft' },
    { status: 'scripting', label: 'Scripting' },
    { status: 'filming', label: 'Filming' },
    { status: 'editing', label: 'Editing' },
    { status: 'review', label: 'Review' },
    { status: 'published', label: 'Published' },
  ];
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item) => (
        <span key={item.status} className="flex items-center gap-1.5 text-xs text-gray-600">
          <StatusDot status={item.status} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export default async function YouTubeCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  await ensureYoutubeSchema().catch(() => {});
  const params = await searchParams;

  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) - 1 : now.getMonth(); // 0-indexed internally

  // Previous / next month
  const prevDate = new Date(year, month - 1, 1);
  const nextDate = new Date(year, month + 1, 1);
  const prevHref = `/youtube/calendar?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`;
  const nextHref = `/youtube/calendar?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`;
  const todayHref = `/youtube/calendar?year=${now.getFullYear()}&month=${now.getMonth() + 1}`;

  const monthLabel = new Date(year, month, 1).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  // Fetch all videos and group by scheduled_date
  const allVideos = await getYoutubeVideos().catch(() => [] as YoutubeVideo[]);
  const videosByDate: Record<string, YoutubeVideo[]> = {};
  for (const v of allVideos) {
    if (!v.scheduled_date) continue;
    // scheduled_date is ISO string like '2026-04-01'
    const key = v.scheduled_date.slice(0, 10);
    if (!videosByDate[key]) videosByDate[key] = [];
    videosByDate[key].push(v);
  }

  // Count videos with scheduled dates in this month
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const thisMonthCount = Object.entries(videosByDate)
    .filter(([key]) => key.startsWith(monthPrefix))
    .reduce((sum, [, vids]) => sum + vids.length, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/youtube" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              ← YouTube 목록
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-sm font-bold text-gray-800">발행 캘린더</span>
          </div>
          <Link
            href="/youtube/new"
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + 새 영상 등록
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Title + Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">YouTube 발행 캘린더</h1>
            <p className="mt-1 text-sm text-gray-500">
              예정일 기준 월간 발행 일정 ({thisMonthCount}건)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={prevHref}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ← 이전
            </Link>
            <span className="px-4 py-1.5 text-sm font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg min-w-[140px] text-center">
              {monthLabel}
            </span>
            <Link
              href={nextHref}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              다음 →
            </Link>
            <Link
              href={todayHref}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              오늘
            </Link>
          </div>
        </div>

        {/* Status Legend */}
        <StatusLegend />

        {/* Calendar Grid */}
        <CalendarGrid year={year} month={month} videosByDate={videosByDate} />

        {/* Videos without scheduled date */}
        {(() => {
          const unscheduled = allVideos.filter((v) => !v.scheduled_date);
          if (unscheduled.length === 0) return null;
          return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">
                예정일 미지정 ({unscheduled.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {unscheduled.map((v) => (
                  <Link
                    key={v.id}
                    href={`/youtube/${v.id}`}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                  >
                    <StatusDot status={v.status} />
                    <span className="text-sm text-gray-700 truncate">{v.title}</span>
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${STATUS_COLORS[v.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {v.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
