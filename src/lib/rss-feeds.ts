export interface FeedSource {
  name: string;
  url: string;
  lang: 'en' | 'ko';
  grade: 'S' | 'A' | 'B';
  category: 'news' | 'official' | 'community' | 'research' | 'youtube';
  platform: 'rss' | 'youtube' | 'threads' | 'instagram';
}

export const RSS_FEEDS: FeedSource[] = [
  // === International AI News (English) ===
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', lang: 'en', grade: 'A', category: 'news', platform: 'rss' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', lang: 'en', grade: 'A', category: 'news', platform: 'rss' },
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', lang: 'en', grade: 'S', category: 'news', platform: 'rss' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', lang: 'en', grade: 'A', category: 'news', platform: 'rss' },
  { name: 'Hacker News AI', url: 'https://hnrss.org/best?q=AI+OR+LLM+OR+GPT', lang: 'en', grade: 'A', category: 'community', platform: 'rss' },

  // === Official Blogs ===
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', lang: 'en', grade: 'S', category: 'official', platform: 'rss' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', lang: 'en', grade: 'S', category: 'official', platform: 'rss' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/rss.xml', lang: 'en', grade: 'S', category: 'official', platform: 'rss' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', lang: 'en', grade: 'A', category: 'official', platform: 'rss' },
  { name: 'NVIDIA AI Blog', url: 'https://blogs.nvidia.com/feed/', lang: 'en', grade: 'A', category: 'official', platform: 'rss' },

  // === Korean AI News ===
  { name: 'AI타임스', url: 'https://www.aitimes.com/rss/allArticle.xml', lang: 'ko', grade: 'A', category: 'news', platform: 'rss' },
  { name: '인공지능신문', url: 'https://www.aitimes.kr/rss/allArticle.xml', lang: 'ko', grade: 'A', category: 'news', platform: 'rss' },
  { name: 'ZDNet Korea AI', url: 'https://zdnet.co.kr/rss/news_ai.xml', lang: 'ko', grade: 'A', category: 'news', platform: 'rss' },
  { name: '블로터', url: 'https://www.bloter.net/feed', lang: 'ko', grade: 'A', category: 'news', platform: 'rss' },
  { name: 'ITWorld Korea', url: 'https://www.itworld.co.kr/rss/feed', lang: 'ko', grade: 'A', category: 'news', platform: 'rss' },

  // === Community / Reddit ===
  { name: 'Reddit r/artificial', url: 'https://www.reddit.com/r/artificial/.rss', lang: 'en', grade: 'B', category: 'community', platform: 'rss' },
  { name: 'Reddit r/LocalLLaMA', url: 'https://www.reddit.com/r/LocalLLaMA/.rss', lang: 'en', grade: 'A', category: 'community', platform: 'rss' },

  // === YouTube Channels (RSS, no API key required) ===
  // URL format: https://www.youtube.com/feeds/videos.xml?channel_id=<CHANNEL_ID>
  { name: 'Two Minute Papers', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg', lang: 'en', grade: 'S', category: 'youtube', platform: 'youtube' },
  { name: 'Yannic Kilcher', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCZHmQk67mSJgfCCTn7xBfew', lang: 'en', grade: 'A', category: 'youtube', platform: 'youtube' },
  { name: 'AI Explained', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtRbbw', lang: 'en', grade: 'A', category: 'youtube', platform: 'youtube' },
  { name: 'Matt Wolfe', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCJMQEjyFVqBIG_YFtPCjNPg', lang: 'en', grade: 'A', category: 'youtube', platform: 'youtube' },
  { name: '노마드 코더 Nomad Coders', url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCUpJs89fSBXNolQGOYKn0YQ', lang: 'ko', grade: 'A', category: 'youtube', platform: 'youtube' },
];

/** Helper to extract YouTube video ID from a YouTube RSS entry's yt:videoId field */
export function extractYouTubeVideoId(entry: { 'yt:videoId'?: string; id?: string }): string | null {
  if (entry['yt:videoId']) return entry['yt:videoId'];
  // YouTube RSS <id> tag format: yt:video:<VIDEO_ID>
  if (entry.id && entry.id.startsWith('yt:video:')) return entry.id.replace('yt:video:', '');
  return null;
}

/** Build YouTube video URL from video ID */
export function youtubeVideoUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Build YouTube thumbnail URL from video ID */
export function youtubeThumbnailUrl(videoId: string, quality: 'default' | 'hqdefault' | 'maxresdefault' = 'hqdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/** Check if a FeedSource is a YouTube feed */
export function isYouTubeFeed(feed: FeedSource): boolean {
  return feed.platform === 'youtube';
}

/** Parse YouTube-specific fields from an RSS entry (Atom format) */
export interface YouTubeEntryMeta {
  videoId: string;
  channelId: string;
  title: string;
  published: string;
  updated: string;
  thumbnailUrl: string;
  videoUrl: string;
  description: string;
}

export function parseYouTubeEntry(entry: Record<string, unknown>): YouTubeEntryMeta | null {
  const videoId = (entry['yt:videoId'] as string) ?? null;
  const channelId = (entry['yt:channelId'] as string) ?? null;
  if (!videoId || !channelId) return null;

  const mediaGroup = entry['media:group'] as Record<string, unknown> | undefined;
  const description = (mediaGroup?.['media:description'] as string) ?? '';

  return {
    videoId,
    channelId,
    title: (entry.title as string) ?? '',
    published: (entry.published as string) ?? '',
    updated: (entry.updated as string) ?? '',
    thumbnailUrl: youtubeThumbnailUrl(videoId),
    videoUrl: youtubeVideoUrl(videoId),
    description,
  };
}
