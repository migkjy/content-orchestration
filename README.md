# Content Orchestration — 콘텐츠 통합 관리 대시보드

여러 프로젝트의 콘텐츠를 통합 관리하는 독립 대시보드.
프로젝트별 콘텐츠 수집(RSS) → 가공 → 배포 파이프라인 모니터링.

## 빠른 시작

```bash
npm install
npm run dev       # 개발 서버
npm run build     # 프로덕션 빌드
npm start         # 프로덕션 서버
```

## 환경 변수 설정

`.env` 파일:
```
CONTENT_OS_DB_URL=libsql://content-os-...
CONTENT_OS_DB_TOKEN=<your-token>
# Coming Soon:
RICHBUKAE_DB_URL=
AI_ARCHITECT_DB_URL=
```

## 기술 스택

- **Next.js 15**, TypeScript
- **Turso (LibSQL)** — content-os DB
- **Tailwind CSS v4**
- **react-markdown** (Markdown 렌더링)
- **Vercel** 배포

## 라우트 구조

- `/` — 전체 프로젝트 요약
- `/[project]` — 프로젝트별 대시보드
- `/[project]/calendar` — 콘텐츠 캘린더
- `/[project]/rss` — RSS 모니터
- `/[project]/logs` — 파이프라인 로그
- `/newsletter/[id]` — 뉴스레터 상세

## 관리 대상 프로젝트

- **apppro** (활성) — AppPro.kr 블로그/뉴스레터
- **richbukae** (Coming Soon)
- **ai-architect** (Coming Soon)

## npm 스크립트

| 명령어 | 용도 |
|--------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm start` | 프로덕션 서버 |
| `npm run lint` | ESLint |
| `npm run sync-docs` | 문서 동기화 |

## 배포

- **GitHub**: https://github.com/migkjy/content-orchestration
- **Vercel**: junyoung-kims-projects/content-orchestration
- GitHub main 브랜치 push → Vercel 자동 배포

## 프로젝트 경로

```
/Users/nbs22/(Claude)/(claude).projects/business-builder/projects/content-orchestration/
```

## 참고

- Turso: https://turso.tech/
- react-markdown: https://github.com/remarkjs/react-markdown
