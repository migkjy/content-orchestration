# History — Content Orchestration

## 프로젝트 탄생
- **2026-02-24**: content-pipeline(blog.apppro.kr)에서 분리, 독립 플랫폼으로 시작

## 주요 마일스톤

### 2026-02 (초기 구축)
- 기본 대시보드 구조 (Next.js App Router)
- Turso DB 연결 (content-os)
- 콘텐츠 상태 관리 시스템

### 2026-03 (기능 확장)
- **LLM 프로바이더 3차 전환**: Gemini → OpenAI(gpt-4o-mini) → OpenRouter (CEO 지시)
- 콘텐츠 상태 전환 워크플로우 정책 UI
- AI 실수 방지 시스템 (발행 전 검증 + 확인 UI)
- KoreaAI Hub 보고서 섹션 + 칸반 OKR 링크
- 브랜딩 변경: KoreaAI Hub → AIHub Korea
- 도메인 전환: koreaaihub.kr → aihubkorea.kr
- 멀티사이트 블로그 자동 파이프라인 MVP
- Welcome 이메일 시퀀스 프리뷰/편집/승인 UI
- GitHub Actions CI 워크플로 추가
- Vercel Preview 배포 비활성화
- 대시보드 UX 개선 (공유 Nav + 요약 메트릭 카드)
- RSS + YouTube 수집 Cron 파이프라인

## LLM 프로바이더 변경 이력
1. Gemini 2.0 Flash (초기)
2. OpenAI gpt-4o-mini (커밋 ac13439)
3. OpenRouter (커밋 82c194f, CEO 지시)
