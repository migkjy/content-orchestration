# Content Pipeline Local Verification Report

**Date**: 2026-02-21
**Executor**: blog-dev PL
**Project**: `projects/content-pipeline/`

## 1. Dependencies & Package.json

### package.json Summary
- **Name**: ai-blog (v0.1.0)
- **Node.js**: >=20 required
- **Framework**: Next.js 15+ (App Router)
- **Key Dependencies**: @anthropic-ai/sdk, @neondatabase/serverless, rss-parser, tsx
- **Scripts**: 8 pipeline scripts + standard Next.js scripts

### npm install Result
```
added 1 package, audited 179 packages in 602ms
98 packages are looking for funding
found 0 vulnerabilities
```
**Status**: PASS - Zero vulnerabilities

## 2. TypeScript Compilation

```bash
npx tsc --noEmit
```
**Result**: No errors. Clean compilation.
**Status**: PASS

## 3. Pipeline Source Code Review

### 3.1 collect.ts - News Collection
- **Function**: RSS feed collection from 16 configured sources (international + Korean)
- **Features**: URL normalization, title similarity dedup, DB persistence
- **Quality**: Solid implementation with proper error handling per feed
- **Issue**: None found

### 3.2 generate.ts - Newsletter Generation
- **Function**: Claude Sonnet API newsletter generation with news relevance scoring
- **Features**: Relevance scoring (high/med/low keywords), source diversity, mock fallback
- **Quality**: Good fallback to mock when ANTHROPIC_API_KEY not set
- **Issue**: None found

### 3.3 generate-blog.ts - Blog Post Generation
- **Function**: Pillar-specific blog post generation with quality validation
- **Features**: 5 content pillars (Mon-Fri), 8-point quality checks, retry logic
- **Quality**: Robust JSON parsing with fallback regex extraction
- **Issue**: None found

### 3.4 publish.ts - Newsletter Publishing (Stibee + Blog + SNS)
- **Function**: Multi-channel publishing (Stibee email, blog DB, getlate.dev SNS)
- **Features**: HTML template system, mock mode support, status tracking
- **Issue**: None found

### 3.5 publish-blog.ts - Blog DB Publishing
- **Function**: Direct DB insert of generated blog posts
- **Features**: Duplicate slug detection
- **Issue**: None found

### 3.6 publish-sns.ts - SNS Multi-Platform Publishing
- **Function**: getlate.dev API integration for multi-platform SNS posting
- **Features**: Platform-specific character limits, account auto-detection
- **BUG FOUND**: Environment variable name inconsistency (see Issues section)

### 3.7 run.ts - Newsletter Pipeline Orchestrator
- **Function**: Full pipeline: collect -> generate -> publish (Stibee + blog + SNS)
- **Issue**: None found

### 3.8 run-blog-pipeline.ts - Blog Pipeline Orchestrator
- **Function**: Blog pipeline: collect -> select topic/pillar -> generate -> quality check -> publish
- **Features**: Daily limit, retry on quality failure, CLI topic/pillar selection
- **Issue**: None found

### 3.9 lib/db.ts - Database Layer
- **Function**: Neon serverless DB queries for blog posts
- **Features**: Full CRUD, pagination support via getPublishedPosts, adjacent posts
- **Issue**: None found

### 3.10 lib/stibee.ts - Stibee API Client
- **Function**: Stibee v2 API integration for newsletter management
- **Features**: Email CRUD, subscriber management, automation triggers, mock mode
- **Issue**: None found

### 3.11 lib/getlate.ts - getlate.dev API Client
- **Function**: getlate.dev API integration for SNS multi-platform posting
- **Features**: Account listing, post creation (immediate/scheduled), mock mode
- **Env Var**: Uses `GETLATE_API_KEY` (correct per CLAUDE.md)

### 3.12 actions/subscribe.ts - Server Action
- **Function**: Email subscription server action
- **Issue**: None found

### 3.13 Prompt Templates
- `prompts/newsletter.md` - Newsletter generation prompt (exists)
- `prompts/newsletter-template.html` - HTML email template (exists)
- `prompts/pillars/` - 5 pillar-specific prompts (all 5 exist, matching PILLAR_CONFIG)

## 4. Issues Found

### BUG: Environment Variable Name Inconsistency (publish-sns.ts)

| File | Variable Used | Expected |
|------|--------------|----------|
| `lib/getlate.ts:15` | `GETLATE_API_KEY` | Correct (matches .env / CLAUDE.md) |
| `src/pipeline/publish-sns.ts:61` | `LATE_API_KEY` | **WRONG** - should be `GETLATE_API_KEY` |

**Impact**: `publish-sns.ts` CLI entry point will fail to authenticate with getlate.dev API even when the correct env var is set, because it reads `LATE_API_KEY` instead of `GETLATE_API_KEY`.

**Fix**: Change `LATE_API_KEY` to `GETLATE_API_KEY` in `publish-sns.ts:61`.

**Note**: The `run.ts` and `run-blog-pipeline.ts` orchestrators use `lib/getlate.ts` (correct var) so this only affects the standalone `publish-sns.ts` CLI script.

**Status**: FIXED in this session (see git commit).

### No Other Issues Found
- All TypeScript files compile without errors
- All prompt files exist and are referenced correctly
- DB queries use parameterized queries (no SQL injection risk)
- Mock mode properly handles missing API keys
- Error handling is consistent across all modules

## 5. Environment Variables Required

| Variable | Required By | Status |
|----------|------------|--------|
| `DATABASE_URL` | collect, generate, publish, db | CEO must set (NeonDB) |
| `ANTHROPIC_API_KEY` | generate, generate-blog | CEO must set (Anthropic console) |
| `STIBEE_API_KEY` | publish (Stibee) | CEO must set (Stibee dashboard) |
| `STIBEE_LIST_ID` | publish | CEO must set |
| `GETLATE_API_KEY` | publish-sns, lib/getlate | Set in .env (CEO confirmed 2026-02-19) |
| `BLOG_DAILY_LIMIT` | run-blog-pipeline | Optional, defaults to 1 |

## 6. Summary

| Check | Result |
|-------|--------|
| npm install | PASS (0 vulnerabilities) |
| TypeScript compilation | PASS (0 errors) |
| Source code review | 1 bug found (env var mismatch) |
| Prompt templates | PASS (all files exist) |
| Dependencies | PASS (all imports resolve) |
| Security | PASS (parameterized queries, no secrets in code) |

**Overall**: Pipeline is structurally sound. One env var bug fixed. Ready for integration testing once CEO provides API keys (ANTHROPIC_API_KEY, STIBEE_API_KEY, DATABASE_URL).
