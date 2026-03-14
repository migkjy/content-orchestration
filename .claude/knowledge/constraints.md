# Constraints — Content Orchestration

## 내부 전용 도구
**내부 전용 도구 — SEO/마케팅/Lighthouse 최적화 금지**

이 프로젝트는 내부 운영 대시보드로, 외부 사용자 대상이 아님.
따라서 다음 작업은 불필요하며 금지:
- SEO 메타태그 최적화
- 마케팅 관련 기능 추가
- Lighthouse 성능 점수 최적화
- Open Graph / Twitter Card 설정
- 사이트맵, robots.txt 최적화

## DB 보호 규칙
- `drizzle-kit push` 절대 금지
- `drizzle-kit generate` → SQL 확인 → 승인 후 실행
- DROP TABLE / TRUNCATE 포함 마이그레이션 발견 시 즉시 중단 + CEO 보고

## 배포 제약
- Vercel CLI 단독 배포 금지 (Git push로만 배포)
- Vercel 무료 플랜 일일 배포 100개 제한
- Preview 배포 비활성화됨 (커밋 05ca94c)

## 이메일 안전장치
- 전체 구독자 대상 대량 발송 절대 금지
- 테스트 발송은 Brevo 리스트 9번(TEST-ONLY) 전용
- Brevo campaign API 호출 절대 금지
- 10명 이상 수신자 발송 시 즉시 중단 + CEO 승인 요청

## 콘텐츠 생성 규칙
- 자비스/PL 콘텐츠 직접 생성 금지 — 게리 바이너척 에이전트 전담
- 대량 사전 생성 절대 금지
