import { notFound } from 'next/navigation';
import { getProject } from '@/lib/projects';
import {
  getDailyPublishStats,
  getPillarDistribution,
  getPipelineEfficiency,
  getErrorTrends,
  getChannelPerformance,
  getWeeklySummary,
  getNewsStats,
  getRssSourceStats,
} from '@/lib/content-db';
import { BarChart, MiniLineChart, DonutChart } from '@/components/charts';

export const revalidate = 60;

const PILLAR_COLORS: Record<string, string> = {
  'AI 뉴스': '#3b82f6',
  'AI 활용팁': '#22c55e',
  '산업 분석': '#f97316',
  '트렌드': '#a855f7',
  '튜토리얼': '#06b6d4',
};

function getColor(pillar: string) {
  return PILLAR_COLORS[pillar] || '#6b7280';
}

export default async function AnalyticsPage({ params }: { params: Promise<{ project: string }> }) {
  const { project: projectId } = await params;
  const projectConfig = getProject(projectId);
  if (!projectConfig) notFound();

  if (!projectConfig.available) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-lg font-medium">Coming Soon</p>
        <p className="text-sm mt-2">{projectConfig.name} 성과 분석을 준비 중입니다.</p>
      </div>
    );
  }

  const [dailyStats, pillarStats, pipelineStats, errorTrends, channelPerf, weeklySummary, newsStats, sourceStats] =
    await Promise.all([
      getDailyPublishStats(14).catch(() => []),
      getPillarDistribution().catch(() => []),
      getPipelineEfficiency(30).catch(() => []),
      getErrorTrends(30).catch(() => []),
      getChannelPerformance().catch(() => []),
      getWeeklySummary().catch(() => ({
        this_week: { published: 0, collected: 0, errors: 0 },
        last_week: { published: 0, collected: 0, errors: 0 },
      })),
      getNewsStats().catch(() => ({ total: 0, used: 0, unused: 0 })),
      getRssSourceStats().catch(() => []),
    ]);

  // Aggregate daily stats by day
  const dayMap = new Map<string, number>();
  dailyStats.forEach((s) => {
    dayMap.set(s.day, (dayMap.get(s.day) || 0) + s.count);
  });
  const sortedDays = [...dayMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dailyBarData = sortedDays.map(([day, count]) => ({
    label: `${parseInt(day.split('-')[1])}/${parseInt(day.split('-')[2])}`,
    value: count,
  }));

  // Aggregate pillar stats
  const pillarMap = new Map<string, number>();
  pillarStats.forEach((s) => {
    pillarMap.set(s.pillar, (pillarMap.get(s.pillar) || 0) + s.count);
  });
  const pillarDonutData = [...pillarMap.entries()].map(([pillar, count]) => ({
    label: pillar,
    value: count,
    color: getColor(pillar),
  }));

  // Pipeline efficiency
  const totalPipelineRuns = pipelineStats.reduce((s, p) => s + p.runs, 0);
  const totalPipelineSuccess = pipelineStats.reduce((s, p) => s + p.success, 0);
  const overallSuccessRate = totalPipelineRuns > 0 ? Math.round((totalPipelineSuccess / totalPipelineRuns) * 100) : 0;

  // Channel bar data
  const channelMap = new Map<string, number>();
  channelPerf.forEach((c) => {
    channelMap.set(c.name, (channelMap.get(c.name) || 0) + c.count);
  });
  const channelBarData = [...channelMap.entries()].map(([name, count]) => ({
    label: name,
    value: count,
  }));

  // Error trends aggregated by component
  const errorByComponent = new Map<string, { count: number; autoFixed: number }>();
  errorTrends.forEach((e) => {
    const existing = errorByComponent.get(e.component) || { count: 0, autoFixed: 0 };
    errorByComponent.set(e.component, {
      count: existing.count + e.count,
      autoFixed: existing.autoFixed + e.auto_fixed,
    });
  });
  const totalErrors = errorTrends.reduce((s, e) => s + e.count, 0);
  const totalAutoFixed = errorTrends.reduce((s, e) => s + e.auto_fixed, 0);

  // Weekly delta helpers
  function delta(thisWeek: number, lastWeek: number) {
    if (lastWeek === 0) return thisWeek > 0 ? '+100%' : '-';
    const pct = Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }

  function deltaColor(thisWeek: number, lastWeek: number, inverse = false) {
    const diff = thisWeek - lastWeek;
    if (diff === 0) return 'text-gray-400';
    const isPositive = inverse ? diff < 0 : diff > 0;
    return isPositive ? 'text-green-600' : 'text-red-500';
  }

  // Source stats top 5
  const topSources = sourceStats.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">성과 분석</h1>
        <p className="mt-1 text-sm text-gray-500">콘텐츠 파이프라인 성과 지표 및 추이</p>
      </div>

      {/* 4-1: Weekly Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard
          title="이번 주 발행"
          value={weeklySummary.this_week.published}
          delta={delta(weeklySummary.this_week.published, weeklySummary.last_week.published)}
          deltaClass={deltaColor(weeklySummary.this_week.published, weeklySummary.last_week.published)}
          color="blue"
        />
        <SummaryCard
          title="이번 주 수집"
          value={weeklySummary.this_week.collected}
          delta={delta(weeklySummary.this_week.collected, weeklySummary.last_week.collected)}
          deltaClass={deltaColor(weeklySummary.this_week.collected, weeklySummary.last_week.collected)}
          color="green"
        />
        <SummaryCard
          title="미해결 에러"
          value={weeklySummary.this_week.errors}
          delta={delta(weeklySummary.this_week.errors, weeklySummary.last_week.errors)}
          deltaClass={deltaColor(weeklySummary.this_week.errors, weeklySummary.last_week.errors, true)}
          color="red"
        />
        <SummaryCard
          title="파이프라인 성공률"
          value={`${overallSuccessRate}%`}
          delta={`${totalPipelineRuns}회 실행`}
          deltaClass="text-gray-400"
          color="purple"
        />
      </div>

      {/* 4-2: Daily Publish Trend */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">일별 발행 추이 (최근 14일)</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <BarChart data={dailyBarData} height={220} />
        </div>
      </section>

      {/* 4-3: Pillar Distribution */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">필라별 콘텐츠 분포</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <DonutChart data={pillarDonutData} />
        </div>
      </section>

      {/* 4-4: Pipeline Efficiency */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">파이프라인 효율</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {pipelineStats.length === 0 ? (
            <EmptyState message="파이프라인 실행 기록이 없습니다." />
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">파이프라인</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">실행</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">성공률</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">평균 소요</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">처리 건수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pipelineStats.map((p, i) => {
                  const rate = p.runs > 0 ? Math.round((p.success / p.runs) * 100) : 0;
                  return (
                    <tr key={p.pipeline_name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-700">{p.pipeline_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.runs}회</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-24">
                            <div
                              className={`h-2 rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{rate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {p.avg_duration ? `${(p.avg_duration / 1000).toFixed(1)}s` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.total_items}건</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 4-5: Channel Distribution */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">채널별 배포 현황</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <BarChart data={channelBarData} height={180} />
        </div>
      </section>

      {/* 4-6: Error Trends */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">에러 현황</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {totalErrors === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">에러 기록이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-6 text-sm">
                <span className="text-gray-600">
                  총 에러: <strong className="text-red-600">{totalErrors}건</strong>
                </span>
                <span className="text-gray-600">
                  자동교정: <strong className="text-green-600">{totalAutoFixed}건</strong>
                  <span className="text-gray-400 ml-1">
                    ({totalErrors > 0 ? Math.round((totalAutoFixed / totalErrors) * 100) : 0}%)
                  </span>
                </span>
              </div>
              <div className="space-y-2">
                {[...errorByComponent.entries()].map(([comp, data]) => (
                  <div key={comp} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32 shrink-0">{comp}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-red-400 h-2 rounded-full"
                        style={{ width: `${(data.count / totalErrors) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 w-16 text-right">{data.count}건</span>
                    <span className="text-xs text-green-600 w-16 text-right">
                      교정 {data.autoFixed}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4-7: Collection Efficiency */}
      <section>
        <h2 className="text-lg font-bold text-gray-900 mb-4">수집 효율</h2>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-gray-100 rounded-full h-4 relative overflow-hidden">
                <div
                  className="bg-blue-500 h-4 rounded-full transition-all"
                  style={{ width: `${newsStats.total > 0 ? (newsStats.used / newsStats.total) * 100 : 0}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 whitespace-nowrap">
                <span className="font-bold text-blue-600">{newsStats.used}</span>
                <span className="text-gray-400"> / {newsStats.total}건 사용</span>
              </div>
            </div>
            <div className="flex gap-6 text-xs text-gray-500">
              <span>
                미사용: <strong className="text-orange-600">{newsStats.unused}건</strong>
              </span>
              <span>
                사용률: <strong>{newsStats.total > 0 ? Math.round((newsStats.used / newsStats.total) * 100) : 0}%</strong>
              </span>
            </div>

            {topSources.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-3">수집량 상위 5개 소스</p>
                <div className="space-y-2">
                  {topSources.map((src) => {
                    const maxSrc = topSources[0]?.total || 1;
                    return (
                      <div key={src.source} className="flex items-center gap-3">
                        <span className="text-xs text-gray-700 w-40 shrink-0 truncate">{src.source}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-blue-400 h-1.5 rounded-full"
                            style={{ width: `${(src.total / maxSrc) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-12 text-right">{src.total}건</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  delta,
  deltaClass,
  color,
}: {
  title: string;
  value: number | string;
  delta: string;
  deltaClass: string;
  color: 'blue' | 'green' | 'red' | 'purple';
}) {
  const borderColors = {
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    red: 'border-l-red-500',
    purple: 'border-l-purple-500',
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${borderColors[color]} p-4 shadow-sm`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className={`text-xs mt-1 ${deltaClass}`}>{delta}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-12 text-center">
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
}
