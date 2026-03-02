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
  connected: { label: '자동발행 가능', color: 'text-green-600' },
  disconnected: { label: '미연결 (수동 발행)', color: 'text-yellow-600' },
  error: { label: '연결 오류', color: 'text-red-600' },
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
