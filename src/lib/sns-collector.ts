/**
 * SNS Collector — Threads / Instagram 수집 인터페이스
 *
 * 현재 상태: 구조 설계만 완료, API 키 없어 실제 수집 미구현
 * CEO 블로킹: Threads API key, Instagram Basic Display API key 필요
 */

export type SnsPlatform = 'threads' | 'instagram';

export type SnsCollectorStatus = 'active' | 'needs_api_key' | 'disabled';

export interface SnsBookmark {
  id: string;
  platform: SnsPlatform;
  external_id: string;
  url: string;
  title: string | null;
  content: string | null;
  author: string | null;
  media_url: string | null;
  saved_at: number;
  synced_at: number | null;
}

export interface SnsCollectorConfig {
  platform: SnsPlatform;
  status: SnsCollectorStatus;
  api_key_env: string;
}

// TODO: Threads API — Meta Threads API key 필요 (CEO 대기)
// TODO: Instagram Basic Display API — Instagram API key 필요 (CEO 대기)
export const SNS_COLLECTORS: SnsCollectorConfig[] = [
  {
    platform: 'threads',
    status: 'needs_api_key',
    api_key_env: 'THREADS_API_KEY',
  },
  {
    platform: 'instagram',
    status: 'needs_api_key',
    api_key_env: 'INSTAGRAM_API_KEY',
  },
];

/** Placeholder — returns empty array until API keys are configured */
export async function collectSnsBookmarks(_platform: SnsPlatform): Promise<SnsBookmark[]> {
  const config = SNS_COLLECTORS.find((c) => c.platform === _platform);
  if (!config || config.status === 'needs_api_key') {
    return [];
  }
  return [];
}
