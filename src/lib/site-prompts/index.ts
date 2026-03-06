import type { TargetSite } from '../schedule';
import * as koreaai from './koreaai';
import * as apppro from './apppro';
import * as richbukae from './richbukae';

export interface SitePromptConfig {
  siteId: TargetSite;
  systemPrompt: string;
  blogInstructions: string;
  topicPillars: string[];
  seoKeywords: string[];
}

const SITE_CONFIGS: Record<TargetSite, SitePromptConfig> = {
  koreaai: {
    siteId: 'koreaai',
    systemPrompt: koreaai.SYSTEM_PROMPT,
    blogInstructions: koreaai.BLOG_INSTRUCTIONS,
    topicPillars: koreaai.TOPIC_PILLARS,
    seoKeywords: koreaai.SEO_KEYWORDS,
  },
  apppro: {
    siteId: 'apppro',
    systemPrompt: apppro.SYSTEM_PROMPT,
    blogInstructions: apppro.BLOG_INSTRUCTIONS,
    topicPillars: apppro.TOPIC_PILLARS,
    seoKeywords: apppro.SEO_KEYWORDS,
  },
  richbukae: {
    siteId: 'richbukae',
    systemPrompt: richbukae.SYSTEM_PROMPT,
    blogInstructions: richbukae.BLOG_INSTRUCTIONS,
    topicPillars: richbukae.TOPIC_PILLARS,
    seoKeywords: richbukae.SEO_KEYWORDS,
  },
};

export function getSiteConfig(site: TargetSite): SitePromptConfig {
  return SITE_CONFIGS[site];
}

export function getRandomKeyword(site: TargetSite): string {
  const config = SITE_CONFIGS[site];
  return config.seoKeywords[Math.floor(Math.random() * config.seoKeywords.length)];
}

export function getRandomPillar(site: TargetSite): string {
  const config = SITE_CONFIGS[site];
  return config.topicPillars[Math.floor(Math.random() * config.topicPillars.length)];
}
