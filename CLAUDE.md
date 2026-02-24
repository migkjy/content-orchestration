# Content Orchestration - 콘텐츠 통합 관리 대시보드

## 프로젝트 개요

여러 프로젝트의 콘텐츠를 통합 관리하는 독립 대시보드.
프로젝트별 콘텐츠 수집(RSS) → 가공 → 배포 전체 파이프라인 모니터링.
content-pipeline(blog.apppro.kr)에서 분리된 독립 플랫폼 (2026-02-24).

## 관리 대상 프로젝트

- **apppro** (활성): AppPro.kr 블로그/뉴스레터 — content-os DB 연결
- **richbukae** (Coming Soon): Richbukae.com
- **ai-architect** (Coming Soon): AI Architect Global

## 라우트 구조

```
/                      → 전체 프로젝트 요약
/[project]/            → 프로젝트별 대시보드 (apppro, richbukae 등)
/[project]/calendar    → 프로젝트별 콘텐츠 캘린더
/[project]/rss         → 프로젝트별 RSS 모니터
/[project]/logs        → 프로젝트별 파이프라인 로그
/newsletter/[id]       → 뉴스레터 상세 (공통)
```

## 기술 스택

- Next.js 15 (App Router)
- Tailwind CSS
- Turso (LibSQL) — content-os DB
- Vercel 배포

## 환경 변수

```bash
CONTENT_OS_DB_URL=libsql://...
CONTENT_OS_DB_TOKEN=...
# Coming Soon:
RICHBUKAE_DB_URL=
RICHBUKAE_DB_TOKEN=
AI_ARCHITECT_DB_URL=
AI_ARCHITECT_DB_TOKEN=
```

## 프로젝트 경로

`/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration/`

## 배포

- **Vercel 프로젝트**: junyoung-kims-projects/content-orchestration
- **GitHub**: https://github.com/migkjy/content-orchestration
- GitHub main 브랜치 push → Vercel 자동 배포

## 빌드

```bash
npm run build
npm run dev
```
