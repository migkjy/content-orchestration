import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client/web';
import { XMLParser } from 'fast-xml-parser';
import { RSS_FEEDS, FeedSource, isYouTubeFeed, parseYouTubeEntry } from '@/lib/rss-feeds';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;

function getDb() {
  return createClient({
    url: process.env.CONTENT_OS_DB_URL!,
    authToken: process.env.CONTENT_OS_DB_TOKEN!,
  });
}

async function ensureCollectedNewsTable() {
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS collected_news (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      title TEXT,
      url TEXT,
      summary TEXT,
      platform TEXT DEFAULT 'rss',
      video_id TEXT,
      channel_id TEXT,
      thumbnail_url TEXT,
      video_url TEXT,
      duration TEXT,
      used_in_newsletter INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )
  `);
  await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_collected_news_url ON collected_news(url)`).catch(() => {});
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_collected_news_platform ON collected_news(platform)`).catch(() => {});
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_collected_news_source ON collected_news(source)`).catch(() => {});
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

interface CollectedItem {
  source: string;
  title: string;
  url: string;
  summary: string;
  platform: 'rss' | 'youtube';
  video_id?: string;
  channel_id?: string;
  thumbnail_url?: string;
  video_url?: string;
}

async function fetchFeed(feed: FeedSource): Promise<CollectedItem[]> {
  const items: CollectedItem[] = [];

  const res = await fetch(feed.url, {
    headers: { 'User-Agent': 'ContentOrchestration/1.0' },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return items;

  const xml = await res.text();
  const parsed = xmlParser.parse(xml);

  if (isYouTubeFeed(feed)) {
    // YouTube RSS is Atom format: feed.entry[]
    const entries = parsed?.feed?.entry;
    if (!entries) return items;
    const entryList = Array.isArray(entries) ? entries : [entries];

    for (const entry of entryList.slice(0, 10)) {
      const meta = parseYouTubeEntry(entry);
      if (!meta) continue;

      items.push({
        source: feed.name,
        title: meta.title,
        url: meta.videoUrl,
        summary: meta.description.slice(0, 500),
        platform: 'youtube',
        video_id: meta.videoId,
        channel_id: meta.channelId,
        thumbnail_url: meta.thumbnailUrl,
        video_url: meta.videoUrl,
      });
    }
  } else {
    // Standard RSS 2.0: rss.channel.item[]
    const channel = parsed?.rss?.channel;
    if (!channel) {
      // Try Atom format (some feeds use Atom)
      const atomEntries = parsed?.feed?.entry;
      if (atomEntries) {
        const entryList = Array.isArray(atomEntries) ? atomEntries : [atomEntries];
        for (const entry of entryList.slice(0, 10)) {
          const title = typeof entry.title === 'string' ? entry.title : entry.title?.['#text'] || '';
          const link = typeof entry.link === 'string'
            ? entry.link
            : Array.isArray(entry.link)
              ? entry.link.find((l: Record<string, string>) => l['@_rel'] === 'alternate')?.['@_href'] || entry.link[0]?.['@_href'] || ''
              : entry.link?.['@_href'] || '';
          const summary = entry.summary || entry.content || '';

          if (link) {
            items.push({
              source: feed.name,
              title: typeof title === 'string' ? title : String(title),
              url: typeof link === 'string' ? link : String(link),
              summary: (typeof summary === 'string' ? summary : '').replace(/<[^>]*>/g, '').slice(0, 500),
              platform: 'rss',
            });
          }
        }
      }
      return items;
    }

    const rssItems = channel.item;
    if (!rssItems) return items;
    const itemList = Array.isArray(rssItems) ? rssItems : [rssItems];

    for (const item of itemList.slice(0, 10)) {
      const title = item.title || '';
      const link = item.link || '';
      const description = item.description || item['content:encoded'] || '';

      if (link) {
        items.push({
          source: feed.name,
          title: typeof title === 'string' ? title : String(title),
          url: typeof link === 'string' ? link : String(link),
          summary: (typeof description === 'string' ? description : '').replace(/<[^>]*>/g, '').slice(0, 500),
          platform: 'rss',
        });
      }
    }
  }

  return items;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureCollectedNewsTable();

  const db = getDb();
  const results: { source: string; fetched: number; inserted: number; error?: string }[] = [];
  let totalInserted = 0;

  // Collect from all feeds (RSS + YouTube) in parallel batches
  const batchSize = 5;
  for (let i = 0; i < RSS_FEEDS.length; i += batchSize) {
    const batch = RSS_FEEDS.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(async (feed) => {
        try {
          const items = await fetchFeed(feed);
          let inserted = 0;

          for (const item of items) {
            try {
              const id = crypto.randomUUID();
              await db.execute({
                sql: `INSERT OR IGNORE INTO collected_news
                      (id, source, title, url, summary, platform, video_id, channel_id, thumbnail_url, video_url, used_in_newsletter, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
                args: [
                  id,
                  item.source,
                  item.title,
                  item.url,
                  item.summary,
                  item.platform,
                  item.video_id || null,
                  item.channel_id || null,
                  item.thumbnail_url || null,
                  item.video_url || null,
                  Date.now(),
                ],
              });
              inserted++;
            } catch {
              // Duplicate URL — skip silently
            }
          }

          return { source: feed.name, fetched: items.length, inserted };
        } catch (e) {
          return { source: feed.name, fetched: 0, inserted: 0, error: e instanceof Error ? e.message : String(e) };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
        totalInserted += result.value.inserted;
      } else {
        results.push({ source: 'unknown', fetched: 0, inserted: 0, error: result.reason?.message || 'Unknown error' });
      }
    }
  }

  const youtubeResults = results.filter(r => {
    const feed = RSS_FEEDS.find(f => f.name === r.source);
    return feed && isYouTubeFeed(feed);
  });

  const rssResults = results.filter(r => {
    const feed = RSS_FEEDS.find(f => f.name === r.source);
    return !feed || !isYouTubeFeed(feed);
  });

  return NextResponse.json({
    ok: true,
    total_feeds: RSS_FEEDS.length,
    total_inserted: totalInserted,
    rss: {
      feeds: rssResults.length,
      inserted: rssResults.reduce((s, r) => s + r.inserted, 0),
    },
    youtube: {
      feeds: youtubeResults.length,
      inserted: youtubeResults.reduce((s, r) => s + r.inserted, 0),
    },
    details: results,
  });
}
