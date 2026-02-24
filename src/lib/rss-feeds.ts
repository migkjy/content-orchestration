export interface FeedSource {
  name: string;
  url: string;
  lang: 'en' | 'ko';
  grade: 'S' | 'A' | 'B';
  category: 'news' | 'official' | 'community' | 'research';
}

export const RSS_FEEDS: FeedSource[] = [
  // === International AI News (English) ===
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', lang: 'en', grade: 'A', category: 'news' },
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', lang: 'en', grade: 'A', category: 'news' },
  { name: 'MIT Tech Review AI', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', lang: 'en', grade: 'S', category: 'news' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', lang: 'en', grade: 'A', category: 'news' },
  { name: 'Hacker News AI', url: 'https://hnrss.org/best?q=AI+OR+LLM+OR+GPT', lang: 'en', grade: 'A', category: 'community' },

  // === Official Blogs ===
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', lang: 'en', grade: 'S', category: 'official' },
  { name: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/', lang: 'en', grade: 'S', category: 'official' },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/rss.xml', lang: 'en', grade: 'S', category: 'official' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', lang: 'en', grade: 'A', category: 'official' },
  { name: 'NVIDIA AI Blog', url: 'https://blogs.nvidia.com/feed/', lang: 'en', grade: 'A', category: 'official' },

  // === Korean AI News ===
  { name: 'AI타임스', url: 'https://www.aitimes.com/rss/allArticle.xml', lang: 'ko', grade: 'A', category: 'news' },
  { name: '인공지능신문', url: 'https://www.aitimes.kr/rss/allArticle.xml', lang: 'ko', grade: 'A', category: 'news' },
  { name: 'ZDNet Korea AI', url: 'https://zdnet.co.kr/rss/news_ai.xml', lang: 'ko', grade: 'A', category: 'news' },
  { name: '블로터', url: 'https://www.bloter.net/feed', lang: 'ko', grade: 'A', category: 'news' },
  { name: 'ITWorld Korea', url: 'https://www.itworld.co.kr/rss/feed', lang: 'ko', grade: 'A', category: 'news' },

  // === Community / Reddit ===
  { name: 'Reddit r/artificial', url: 'https://www.reddit.com/r/artificial/.rss', lang: 'en', grade: 'B', category: 'community' },
  { name: 'Reddit r/LocalLLaMA', url: 'https://www.reddit.com/r/LocalLLaMA/.rss', lang: 'en', grade: 'A', category: 'community' },
];
