/**
 * Welcome Email Sequence Data Management
 *
 * JSON 파일 기반 이메일 데이터 CRUD.
 * content-pipeline의 welcome-templates.ts에서 추출한 초기 데이터 포함.
 */

export type ServiceId = "ai-architect" | "richbukae" | "aihubkorea" | "apppro";
export type SequenceId = "d0" | "d3" | "d7";
export type EmailStatus = "draft" | "approved" | "sent";

export interface ServiceBrand {
  name: string;
  senderName: string;
  senderEmail: string;
  primaryColor: string;
  url: string;
  tagline: string;
}

export interface WelcomeEmailData {
  service: ServiceId;
  sequence: SequenceId;
  delayDays: number;
  subject: string;
  bodyHtml: string;
  status: EmailStatus;
  updatedAt: string;
}

export const SERVICE_BRANDS: Record<ServiceId, ServiceBrand> = {
  "ai-architect": {
    name: "AI Architect",
    senderName: "AI Architect",
    senderEmail: "contact@apppro.kr",
    primaryColor: "#1e3a5f",
    url: "https://ai-architect.io",
    tagline: "AI 시대의 건축 설계 혁신",
  },
  richbukae: {
    name: "리치부캐",
    senderName: "리치부캐",
    senderEmail: "contact@richbukae.com",
    primaryColor: "#2563eb",
    url: "https://richbukae.com",
    tagline: "AI 설계자 시리즈로 수익을 만드세요",
  },
  aihubkorea: {
    name: "AIHub Korea",
    senderName: "AIHub Korea",
    senderEmail: "contact@apppro.kr",
    primaryColor: "#0077cc",
    url: "https://aihubkorea.kr",
    tagline: "한국 AI 비즈니스 허브",
  },
  apppro: {
    name: "AppPro",
    senderName: "AppPro",
    senderEmail: "contact@apppro.kr",
    primaryColor: "#1A73E8",
    url: "https://apppro.kr",
    tagline: "아이디어를 빠르게 현실로",
  },
};

export const SERVICES: ServiceId[] = ["ai-architect", "richbukae", "aihubkorea", "apppro"];
export const SEQUENCES: { id: SequenceId; label: string; delayDays: number }[] = [
  { id: "d0", label: "D+0 (즉시)", delayDays: 0 },
  { id: "d3", label: "D+3 (3일 후)", delayDays: 3 },
  { id: "d7", label: "D+7 (7일 후)", delayDays: 7 },
];

function wrapTemplate(brand: ServiceBrand, title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" style="width:600px;max-width:100%;border-collapse:collapse;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:${brand.primaryColor};padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${brand.name}</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">${brand.tagline}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background:#f9f9f9;padding:20px 32px;border-top:1px solid #eeeeee;">
              <p style="margin:0;color:#888888;font-size:12px;line-height:1.5;text-align:center;">
                <a href="${brand.url}" style="color:${brand.primaryColor};text-decoration:none;">${brand.name}</a>에서 발송했습니다.<br/>
                더 이상 수신을 원하지 않으시면 <a href="{{ unsubscribe }}" style="color:${brand.primaryColor};text-decoration:none;">구독 해지</a>해 주세요.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Initial seed data from content-pipeline welcome-templates.ts
function generateDefaultEmails(): WelcomeEmailData[] {
  const now = new Date().toISOString();
  const emails: WelcomeEmailData[] = [];

  // ai-architect
  const aiBrand = SERVICE_BRANDS["ai-architect"];
  emails.push({
    service: "ai-architect", sequence: "d0", delayDays: 0, status: "draft", updatedAt: now,
    subject: "AI Architect에 오신 것을 환영합니다",
    bodyHtml: wrapTemplate(aiBrand, "AI Architect에 오신 것을 환영합니다", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">AI Architect 뉴스레터를 구독해주셔서 감사합니다.</p>
      <p style="color:#333;font-size:16px;line-height:1.7;">AI가 건축 설계를 어떻게 바꾸고 있는지, 실전 활용법을 매주 공유합니다.</p>
      <h3 style="color:${aiBrand.primaryColor};margin:24px 0 12px;">구독자가 받는 혜택</h3>
      <ul style="color:#333;font-size:16px;line-height:2;">
        <li>AI 건축 설계 최신 트렌드</li>
        <li>실전 프롬프트 템플릿</li>
        <li>업계 전문가 인사이트</li>
      </ul>
      <div style="background:#f0f4f8;padding:20px;border-radius:8px;border-left:4px solid ${aiBrand.primaryColor};margin:24px 0;">
        <strong>3일 후 예고</strong><br/>
        <span style="color:#555;">AI 건축 설계의 3가지 핵심 원칙을 공유합니다.</span>
      </div>`),
  });
  emails.push({
    service: "ai-architect", sequence: "d3", delayDays: 3, status: "draft", updatedAt: now,
    subject: "AI 건축 설계의 3가지 핵심 원칙",
    bodyHtml: wrapTemplate(aiBrand, "AI 건축 설계의 3가지 핵심 원칙", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">AI를 건축 설계에 활용할 때 반드시 알아야 할 3가지 원칙입니다.</p>
      <div style="margin:20px 0;">
        <h3 style="color:${aiBrand.primaryColor};">1. 컨텍스트가 품질을 결정한다</h3>
        <p style="color:#555;line-height:1.7;">대지 조건, 법규, 클라이언트 요구사항을 구조화해서 AI에 전달하면 결과물의 질이 완전히 달라집니다.</p>
        <h3 style="color:${aiBrand.primaryColor};">2. 반복 설계의 자동화</h3>
        <p style="color:#555;line-height:1.7;">평면 배치, 일조 분석, 동선 최적화 같은 반복 작업을 AI로 자동화하면 창의적 설계에 집중할 수 있습니다.</p>
        <h3 style="color:${aiBrand.primaryColor};">3. AI는 도구, 판단은 건축가</h3>
        <p style="color:#555;line-height:1.7;">AI가 제안하는 옵션을 건축가의 전문성으로 평가하고 선택하는 것이 핵심입니다.</p>
      </div>
      <div style="background:#f0f4f8;padding:20px;border-radius:8px;border-left:4px solid ${aiBrand.primaryColor};margin:24px 0;">
        <strong>4일 후 예고</strong><br/>
        <span style="color:#555;">AI Architect 시리즈로 실무에 바로 적용하는 방법을 안내합니다.</span>
      </div>`),
  });
  emails.push({
    service: "ai-architect", sequence: "d7", delayDays: 7, status: "draft", updatedAt: now,
    subject: "AI 건축 설계, 지금 시작하세요",
    bodyHtml: wrapTemplate(aiBrand, "AI 건축 설계, 지금 시작하세요", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">지난 일주일간 AI 건축 설계의 가능성을 살펴보았습니다.</p>
      <p style="color:#333;font-size:16px;line-height:1.7;">이제 직접 실행에 옮길 차례입니다.</p>
      <h3 style="color:${aiBrand.primaryColor};margin:24px 0 12px;">AI Architect 시리즈 안내</h3>
      <ul style="color:#333;font-size:16px;line-height:2;">
        <li>6권의 전문가 프레임워크 PDF</li>
        <li>즉시 사용 가능한 프롬프트 300+</li>
        <li>측정 가능한 결과 시스템</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${aiBrand.url}" style="display:inline-block;background:${aiBrand.primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:16px;">자세히 보기</a>
      </div>`),
  });

  // richbukae
  const rbBrand = SERVICE_BRANDS["richbukae"];
  emails.push({
    service: "richbukae", sequence: "d0", delayDays: 0, status: "draft", updatedAt: now,
    subject: "리치부캐에 오신 것을 환영합니다",
    bodyHtml: wrapTemplate(rbBrand, "리치부캐에 오신 것을 환영합니다", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">리치부캐 뉴스레터를 구독해주셔서 감사합니다.</p>
      <h3 style="color:${rbBrand.primaryColor};margin:24px 0 12px;">AI 설계자의 3가지 핵심 원칙</h3>
      <ol style="color:#333;font-size:16px;line-height:2;">
        <li><strong>문제 정의 먼저</strong> -- AI 도구보다 해결할 문제를 먼저 명확히</li>
        <li><strong>프롬프트 시스템화</strong> -- 한 번 잘 만든 프롬프트를 반복 사용</li>
        <li><strong>측정 가능한 목표</strong> -- AI 도입 전후 수치를 비교</li>
      </ol>
      <div style="background:#f0f7ff;padding:20px;border-radius:8px;border-left:4px solid ${rbBrand.primaryColor};margin:24px 0;">
        <strong>3일 후 예고</strong><br/>
        <span style="color:#555;">AI 사용자와 AI 설계자의 차이를 공유합니다.</span>
      </div>`),
  });
  emails.push({
    service: "richbukae", sequence: "d3", delayDays: 3, status: "draft", updatedAt: now,
    subject: "AI 사용자 vs AI 설계자, 무엇이 다른가",
    bodyHtml: wrapTemplate(rbBrand, "AI 사용자 vs AI 설계자, 무엇이 다른가", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">같은 AI 도구를 쓰는데 왜 결과가 다를까요?</p>
      <p style="color:#333;font-size:16px;line-height:1.7;">AI <strong>사용자</strong>는 매번 새로 시작합니다. 결과가 들쑥날쑥합니다.</p>
      <p style="color:#333;font-size:16px;line-height:1.7;">AI <strong>설계자</strong>는 시스템을 씁니다. 결과가 예측 가능합니다.</p>
      <div style="background:#fff8e1;padding:20px;border-radius:8px;border-left:4px solid #f59e0b;margin:24px 0;">
        <strong>핵심 차이:</strong> 프롬프트를 자산으로 만드는가, 소모하는가
      </div>
      <div style="background:#f0f7ff;padding:20px;border-radius:8px;border-left:4px solid ${rbBrand.primaryColor};margin:24px 0;">
        <strong>4일 후 예고</strong><br/>
        <span style="color:#555;">AI 설계자 번들로 시스템을 구축하는 방법을 안내합니다.</span>
      </div>`),
  });
  emails.push({
    service: "richbukae", sequence: "d7", delayDays: 7, status: "draft", updatedAt: now,
    subject: "AI 설계자 시스템을 지금 구축하세요",
    bodyHtml: wrapTemplate(rbBrand, "AI 설계자 시스템을 지금 구축하세요", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">지난 일주일간 AI 설계자의 원칙과 차이를 공유했습니다.</p>
      <p style="color:#333;font-size:16px;line-height:1.7;">이제 당신 차례입니다.</p>
      <ul style="color:#333;font-size:16px;line-height:2;">
        <li>6권의 전문가 프레임워크 PDF</li>
        <li>즉시 사용 가능한 프롬프트 300+</li>
        <li>측정 가능한 결과 시스템</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${rbBrand.url}/bundle" style="display:inline-block;background:${rbBrand.primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:16px;">AI Architect 번들 보기</a>
        <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">6권 번들 -- 58% 할인</p>
      </div>`),
  });

  // aihubkorea
  const ahBrand = SERVICE_BRANDS["aihubkorea"];
  emails.push({
    service: "aihubkorea", sequence: "d0", delayDays: 0, status: "draft", updatedAt: now,
    subject: "AIHub Korea에 오신 것을 환영합니다!",
    bodyHtml: wrapTemplate(ahBrand, "AIHub Korea에 오신 것을 환영합니다!", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">한국 AI 비즈니스 인사이트를 매주 전달해드립니다.</p>
      <h3 style="color:${ahBrand.primaryColor};margin:24px 0 12px;">구독자 혜택</h3>
      <ul style="color:#333;font-size:16px;line-height:2;">
        <li>매주 AI 트렌드 브리핑</li>
        <li>업종별 AI 활용 가이드</li>
        <li>AI 도구 실전 리뷰</li>
        <li>프롬프트 템플릿 무료 제공</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${ahBrand.url}/tools" style="display:inline-block;background:${ahBrand.primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:16px;">AI 도구 디렉토리 둘러보기</a>
      </div>
      <div style="background:#e8f4fd;padding:20px;border-radius:8px;border-left:4px solid ${ahBrand.primaryColor};margin:24px 0;">
        <strong>3일 후 예고</strong><br/>
        <span style="color:#555;">한국 비즈니스에 바로 적용할 수 있는 AI 활용 팁 5가지를 보내드립니다.</span>
      </div>`),
  });
  emails.push({
    service: "aihubkorea", sequence: "d3", delayDays: 3, status: "draft", updatedAt: now,
    subject: "한국 비즈니스 AI 활용 팁 5가지",
    bodyHtml: wrapTemplate(ahBrand, "한국 비즈니스 AI 활용 팁 5가지", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">한국 SMB가 바로 적용할 수 있는 AI 활용 팁입니다.</p>
      <div style="margin:20px 0;">
        <h3 style="color:${ahBrand.primaryColor};">1. 고객 문의 자동 응답</h3>
        <p style="color:#555;line-height:1.7;">ChatGPT/Claude로 FAQ 기반 자동 응답 시스템을 30분 만에 구축할 수 있습니다.</p>
        <h3 style="color:${ahBrand.primaryColor};">2. 상품 설명 자동 생성</h3>
        <p style="color:#555;line-height:1.7;">키워드만 입력하면 SEO 최적화된 상품 설명을 AI가 작성합니다.</p>
        <h3 style="color:${ahBrand.primaryColor};">3. 리뷰 분석 자동화</h3>
        <p style="color:#555;line-height:1.7;">고객 리뷰에서 핵심 인사이트를 AI가 자동 추출합니다.</p>
        <h3 style="color:${ahBrand.primaryColor};">4. 마케팅 카피 A/B 테스트</h3>
        <p style="color:#555;line-height:1.7;">AI로 10개 변형을 만들고 최적의 카피를 찾으세요.</p>
        <h3 style="color:${ahBrand.primaryColor};">5. 주간 보고서 자동화</h3>
        <p style="color:#555;line-height:1.7;">데이터를 입력하면 AI가 인사이트 포함 보고서를 생성합니다.</p>
      </div>
      <div style="background:#e8f4fd;padding:20px;border-radius:8px;border-left:4px solid ${ahBrand.primaryColor};margin:24px 0;">
        <strong>4일 후 예고</strong><br/>
        <span style="color:#555;">AIHub Korea의 프리미엄 AI 스킬 패키지를 소개합니다.</span>
      </div>`),
  });
  emails.push({
    service: "aihubkorea", sequence: "d7", delayDays: 7, status: "draft", updatedAt: now,
    subject: "AI 비즈니스 레벨업, 지금 시작하세요",
    bodyHtml: wrapTemplate(ahBrand, "AI 비즈니스 레벨업, 지금 시작하세요", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">지난 일주일간 AI 비즈니스 활용의 기초를 다졌습니다.</p>
      <p style="color:#333;font-size:16px;line-height:1.7;">더 깊이 있는 AI 활용을 원하신다면, AIHub Korea의 프리미엄 콘텐츠를 확인하세요.</p>
      <h3 style="color:${ahBrand.primaryColor};margin:24px 0 12px;">프리미엄 혜택</h3>
      <ul style="color:#333;font-size:16px;line-height:2;">
        <li>업종별 AI 프롬프트 팩</li>
        <li>월간 AI 트렌드 심층 분석</li>
        <li>전문가 1:1 Q&A</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${ahBrand.url}/blog" style="display:inline-block;background:${ahBrand.primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:16px;">블로그에서 더 알아보기</a>
      </div>`),
  });

  // apppro
  const apBrand = SERVICE_BRANDS["apppro"];
  emails.push({
    service: "apppro", sequence: "d0", delayDays: 0, status: "draft", updatedAt: now,
    subject: "AppPro에 오신 것을 환영합니다",
    bodyHtml: wrapTemplate(apBrand, "AppPro에 오신 것을 환영합니다", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">앱 개발과 AI 비즈니스 인사이트를 구독해주셔서 감사합니다.</p>
      <h3 style="color:${apBrand.primaryColor};margin:24px 0 12px;">AppPro가 도와드리는 것</h3>
      <ul style="color:#333;font-size:16px;line-height:2;">
        <li>AI 기반 앱/MVP 개발 전문 스튜디오</li>
        <li>4주 만에 MVP 출시 프로세스</li>
        <li>정부지원사업 연계 개발</li>
        <li>스타트업 맞춤 기술 컨설팅</li>
      </ul>
      <div style="text-align:center;margin:28px 0;">
        <a href="${apBrand.url}/download" style="display:inline-block;background:${apBrand.primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:16px;">무료 리드마그넷 다운로드</a>
      </div>
      <div style="background:#e8f0fe;padding:20px;border-radius:8px;border-left:4px solid ${apBrand.primaryColor};margin:24px 0;">
        <strong>3일 후 예고</strong><br/>
        <span style="color:#555;">MVP 개발 비용을 50% 줄이는 실전 전략을 공유합니다.</span>
      </div>`),
  });
  emails.push({
    service: "apppro", sequence: "d3", delayDays: 3, status: "draft", updatedAt: now,
    subject: "MVP 개발 비용을 50% 줄이는 3가지 전략",
    bodyHtml: wrapTemplate(apBrand, "MVP 개발 비용을 50% 줄이는 3가지 전략", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">앱 개발에 수천만 원을 쓰기 전에 알아야 할 전략입니다.</p>
      <div style="margin:20px 0;">
        <h3 style="color:${apBrand.primaryColor};">1. No-Code/Low-Code 우선</h3>
        <p style="color:#555;line-height:1.7;">MVP는 검증이 목적입니다. 처음부터 커스텀 개발할 필요가 없습니다.</p>
        <h3 style="color:${apBrand.primaryColor};">2. AI 코딩 어시스턴트 활용</h3>
        <p style="color:#555;line-height:1.7;">Claude, Cursor 등 AI 도구로 개발 속도를 3배 높이세요.</p>
        <h3 style="color:${apBrand.primaryColor};">3. 정부지원사업 연계</h3>
        <p style="color:#555;line-height:1.7;">예비창업패키지, 초기창업패키지 등으로 개발 비용의 70%를 지원받을 수 있습니다.</p>
      </div>
      <div style="background:#e8f0fe;padding:20px;border-radius:8px;border-left:4px solid ${apBrand.primaryColor};margin:24px 0;">
        <strong>4일 후 예고</strong><br/>
        <span style="color:#555;">AppPro의 4주 MVP 프로세스를 상세히 안내합니다.</span>
      </div>`),
  });
  emails.push({
    service: "apppro", sequence: "d7", delayDays: 7, status: "draft", updatedAt: now,
    subject: "앱 아이디어가 있으신가요? 4주 만에 출시하세요",
    bodyHtml: wrapTemplate(apBrand, "앱 아이디어가 있으신가요? 4주 만에 출시하세요", `
      <h2 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;">환영합니다!</h2>
      <p style="color:#333;font-size:16px;line-height:1.7;">AppPro는 AI 기반 앱 개발 전문 스튜디오입니다.</p>
      <h3 style="color:${apBrand.primaryColor};margin:24px 0 12px;">4주 MVP 프로세스</h3>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr style="background:#f3f4f6;">
          <th style="padding:10px;text-align:left;border:1px solid #e5e7eb;">주차</th>
          <th style="padding:10px;text-align:left;border:1px solid #e5e7eb;">내용</th>
        </tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;">1주</td><td style="padding:10px;border:1px solid #e5e7eb;">기획 + 와이어프레임</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;">2주</td><td style="padding:10px;border:1px solid #e5e7eb;">디자인 + 프로토타입</td></tr>
        <tr><td style="padding:10px;border:1px solid #e5e7eb;">3주</td><td style="padding:10px;border:1px solid #e5e7eb;">개발 + 테스트</td></tr>
        <tr style="background:#f9fafb;"><td style="padding:10px;border:1px solid #e5e7eb;">4주</td><td style="padding:10px;border:1px solid #e5e7eb;">런칭 + 마케팅 세팅</td></tr>
      </table>
      <div style="text-align:center;margin:28px 0;">
        <a href="${apBrand.url}/contact" style="display:inline-block;background:${apBrand.primaryColor};color:#ffffff;padding:14px 32px;border-radius:8px;font-weight:bold;text-decoration:none;font-size:16px;">무료 상담 신청</a>
        <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">30분 무료 상담으로 시작하세요</p>
      </div>`),
  });

  return emails;
}

// In-memory store (server-side, persists during runtime)
let emailStore: WelcomeEmailData[] | null = null;

function getStore(): WelcomeEmailData[] {
  if (!emailStore) {
    emailStore = generateDefaultEmails();
  }
  return emailStore;
}

export function getAllEmails(): WelcomeEmailData[] {
  return getStore();
}

export function getEmail(service: ServiceId, sequence: SequenceId): WelcomeEmailData | undefined {
  return getStore().find((e) => e.service === service && e.sequence === sequence);
}

export function updateEmail(
  service: ServiceId,
  sequence: SequenceId,
  updates: { subject?: string; bodyHtml?: string },
): WelcomeEmailData | undefined {
  const store = getStore();
  const idx = store.findIndex((e) => e.service === service && e.sequence === sequence);
  if (idx === -1) return undefined;
  if (updates.subject !== undefined) store[idx].subject = updates.subject;
  if (updates.bodyHtml !== undefined) store[idx].bodyHtml = updates.bodyHtml;
  store[idx].updatedAt = new Date().toISOString();
  return store[idx];
}

export function approveEmail(service: ServiceId, sequence: SequenceId): WelcomeEmailData | undefined {
  const store = getStore();
  const idx = store.findIndex((e) => e.service === service && e.sequence === sequence);
  if (idx === -1) return undefined;
  store[idx].status = "approved";
  store[idx].updatedAt = new Date().toISOString();
  return store[idx];
}
