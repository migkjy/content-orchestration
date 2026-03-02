import { NextResponse } from 'next/server';
import {
  ensureSchema, createCampaign, createChannel, getCampaigns, getChannels
} from '@/lib/content-db';
import { createClient } from '@libsql/client/web';

function getDb() {
  return createClient({
    url: process.env.CONTENT_OS_DB_URL!,
    authToken: process.env.CONTENT_OS_DB_TOKEN!,
  });
}

export async function POST() {
  await ensureSchema();

  const existingCampaigns = await getCampaigns();

  const alreadySeeded = existingCampaigns.some(c => c.name === 'AI 설계자 세일즈 PLF');
  if (alreadySeeded) {
    return NextResponse.json({ success: true, message: '이미 시드 데이터가 존재합니다.', seeded: false });
  }

  const NOW = Date.now();
  const DAY = 86_400_000;

  // 1. 캠페인 생성
  const campaignId = await createCampaign({
    name: 'AI 설계자 세일즈 PLF',
    description: '리치부캐 채널을 통해 AI 설계자 서비스를 홍보하고 세일즈 전환을 달성하는 4주 PLF 캠페인',
    goal: '리치부캐 채널 AI 설계자 서비스 세일즈 전환 — 수강생 10명 모집',
    type: 'campaign',
    start_date: NOW - 1 * DAY,
    end_date: NOW + 27 * DAY,
  });

  // 2. 채널 생성 (4개)
  const igId = await createChannel({
    name: '리치부캐 인스타그램',
    platform: 'instagram',
    account_name: '@richbukae_official',
    connection_type: 'getlate',
    connection_status: 'disconnected',
    connection_detail: JSON.stringify({ note: 'GetLate 연동 예정' }),
  });

  const ytId = await createChannel({
    name: '리치부캐 유튜브',
    platform: 'youtube',
    account_name: '@richbukae',
    connection_type: 'manual',
    connection_status: 'disconnected',
    connection_detail: JSON.stringify({ note: '수동 업로드' }),
  });

  const nlId = await createChannel({
    name: '리치부캐 뉴스레터',
    platform: 'newsletter',
    account_name: 'contact@richbukae.com',
    connection_type: 'brevo',
    connection_status: 'connected',
    connection_detail: JSON.stringify({ list_id: 'richbukae-main' }),
  });

  const blogId = await createChannel({
    name: '리치부캐 블로그',
    platform: 'blog',
    account_name: 'richbukae.com/blog',
    connection_type: 'wordpress',
    connection_status: 'disconnected',
    connection_detail: JSON.stringify({ url: 'https://richbukae.com/blog' }),
  });

  const db = getDb();

  // 3. 콘텐츠 슬롯 생성 (총 20개)
  const contents = [
    // === 인스타그램 8개 ===
    { channel_id: igId, title: 'AI 설계자란 무엇인가?', status: 'published', scheduled_at: NOW - 1 * DAY,
      content_body: '🤖 AI 설계자는 AI 도구를 활용해 비즈니스 문제를 설계하고 해결하는 전문가입니다.\n\n✅ AI 설계자가 하는 일:\n- 업무 자동화 설계\n- AI 도구 선정 및 통합\n- ROI 분석 및 최적화\n\n여러분도 AI 설계자가 될 수 있습니다. 👇 링크 바이오 참고\n\n#AI설계자 #AI자동화 #부업 #재테크' },
    { channel_id: igId, title: 'AI 설계자 하루 루틴 공개', status: 'published', scheduled_at: NOW - 1 * DAY + 3600000,
      content_body: '⏰ AI 설계자의 하루 루틴을 공개합니다!\n\n🌅 오전 9시: Claude로 오늘 업무 계획 수립\n📊 오전 11시: 클라이언트 AI 자동화 설계\n🍱 점심 후: ChatGPT로 보고서 초안 작성\n🎯 오후 3시: 자동화 테스트 및 최적화\n💰 오후 5시: 결과 보고 및 청구\n\n월 수익: 300~500만원 가능\n\n#AI설계자 #재택근무 #AI부업' },
    { channel_id: igId, title: '비전공자도 AI 설계자 가능?', status: 'scheduled', scheduled_at: NOW + 1 * DAY,
      content_body: '✋ 비전공자도 AI 설계자가 될 수 있을까요?\n\n결론: YES! 코딩 불필요 ✅\n\n필요한 것:\n📌 AI 도구 사용법 (ChatGPT, Claude)\n📌 비즈니스 문제 파악 능력\n📌 소통 스킬\n\n기술보다 중요한 건 "문제를 보는 눈"\n\n↓ 커리큘럼 링크 바이오에서 확인\n\n#비전공자 #AI설계자 #커리어전환' },
    { channel_id: igId, title: 'AI 설계자 수강생 후기', status: 'scheduled', scheduled_at: NOW + 3 * DAY,
      content_body: null },
    { channel_id: igId, title: 'AI 설계자 포트폴리오 만드는 법', status: 'approved', scheduled_at: NOW + 5 * DAY,
      content_body: '📂 AI 설계자 포트폴리오 3단계\n\n1️⃣ 실제 문제 해결 사례 정리\n2️⃣ Before/After ROI 수치화\n3️⃣ Notion 포트폴리오 페이지 구성\n\n가장 중요한 건 "숫자"\n- 시간 절감: 주 10시간 → 2시간\n- 비용 절감: 월 300만원 → 50만원\n\n#AI설계자포트폴리오 #프리랜서' },
    { channel_id: igId, title: 'AI 설계자 실전 프로젝트 공개', status: 'draft', scheduled_at: NOW + 7 * DAY,
      content_body: '초안 작성 중...' },
    { channel_id: igId, title: 'AI 설계자 FAQ 총정리', status: 'review', scheduled_at: NOW + 10 * DAY,
      content_body: '자주 묻는 질문을 정리했습니다. 검토 요청합니다.' },
    { channel_id: igId, title: '마감 D-7 알림', status: 'unwritten', scheduled_at: NOW + 20 * DAY,
      content_body: null },

    // === 유튜브 4개 ===
    { channel_id: ytId, title: 'AI 설계자 완전 입문 가이드 (40분)', status: 'published', scheduled_at: NOW - 1 * DAY,
      content_body: '# AI 설계자 완전 입문 가이드\n\n## 목차\n1. AI 설계자란?\n2. 필요 스킬셋\n3. 수익 구조\n4. 실전 데모\n\n영상 설명: 이 영상에서는 AI 설계자가 되기 위한 모든 것을 40분 만에 알려드립니다.' },
    { channel_id: ytId, title: 'Claude AI로 업무 자동화 실전 (30분)', status: 'draft', scheduled_at: NOW + 5 * DAY,
      content_body: '# Claude AI로 업무 자동화 실전\n\n## 영상 스크립트 초안\n\n이 영상에서는 Claude AI를 활용한 실전 업무 자동화 방법을 30분 안에 배웁니다.\n\n## 목차\n1. Claude AI 기본 설정 (5분)\n2. 반복 업무 자동화 실전 (10분)\n3. 보고서 자동 생성 (8분)\n4. 이메일 답변 자동화 (5분)\n5. Q&A (2분)\n\n## 핵심 포인트\n- 코딩 없이 자동화 가능\n- 하루 2~3시간 절약\n- 실제 수익 사례 공개\n\n## 촬영 체크리스트\n- [ ] 화면 녹화 설정\n- [ ] 예제 파일 준비\n- [ ] 자막 작성' },
    { channel_id: ytId, title: 'AI 설계자 수강 신청 안내 라이브', status: 'unwritten', scheduled_at: NOW + 14 * DAY,
      content_body: null },
    { channel_id: ytId, title: 'AI 설계자 수강생 성과 인터뷰', status: 'unwritten', scheduled_at: NOW + 21 * DAY,
      content_body: null },

    // === 뉴스레터 4개 ===
    { channel_id: nlId, title: '[Week 1] AI 설계자 시리즈 시작합니다', status: 'published', scheduled_at: NOW - 1 * DAY,
      content_body: '<h1>AI 설계자 세일즈 PLF를 시작합니다</h1><p>안녕하세요, 리치부캐입니다.</p><p>이번 4주 동안 AI 설계자가 되는 여정을 함께합니다.</p>' },
    { channel_id: nlId, title: '[Week 2] AI 설계자 실전 사례 공개', status: 'scheduled', scheduled_at: NOW + 6 * DAY,
      content_body: '<h1>실전 사례 3가지 공개</h1><p>이번 주에는 실제 AI 설계자로 활동 중인 수강생들의 사례를 공개합니다.</p>' },
    { channel_id: nlId, title: '[Week 3] 수강 신청 오픈 안내', status: 'draft', scheduled_at: NOW + 13 * DAY,
      content_body: '<h1>AI 설계자 과정 수강 신청이 오픈됩니다</h1>\n<p>안녕하세요, 리치부캐입니다.</p>\n<p>드디어 AI 설계자 과정 <strong>3기 수강 신청</strong>이 오픈됩니다!</p>\n<h2>수강 혜택</h2>\n<ul>\n<li>✅ 8주 심화 커리큘럼</li>\n<li>✅ 1:1 멘토링 2회</li>\n<li>✅ 수강생 전용 Discord 커뮤니티</li>\n<li>✅ 평생 강의 업데이트</li>\n</ul>\n<h2>모집 인원</h2>\n<p>선착순 <strong>10명</strong> 한정</p>\n<h2>수강료</h2>\n<p>정가 <del>99만원</del> → 조기 신청 <strong>69만원</strong></p>' },
    { channel_id: nlId, title: '[Week 4] 마감 임박 + 마지막 혜택', status: 'unwritten', scheduled_at: NOW + 20 * DAY,
      content_body: null },

    // === 블로그 4개 ===
    { channel_id: blogId, title: 'AI 설계자란? 2026년 완전 가이드', status: 'published', scheduled_at: NOW - 1 * DAY,
      content_body: '# AI 설계자란? 2026년 완전 가이드\n\n## AI 설계자의 정의\nAI 설계자는 인공지능 도구를 활용하여 비즈니스 문제를 분석하고 자동화 솔루션을 설계하는 전문가입니다.\n\n## 핵심 역량\n- 프롬프트 엔지니어링\n- 업무 프로세스 분석\n- ROI 계산 및 보고' },
    { channel_id: blogId, title: 'AI 설계자 포트폴리오 구성 방법', status: 'review', scheduled_at: NOW + 7 * DAY,
      content_body: '포트폴리오 구성 방법에 대한 상세 가이드입니다. 검토 후 발행 예정.' },
    { channel_id: blogId, title: 'AI 설계자 vs AI 개발자 차이점', status: 'draft', scheduled_at: NOW + 14 * DAY,
      content_body: '초안: AI 설계자와 AI 개발자의 차이를 설명하는 글입니다.' },
    { channel_id: blogId, title: 'AI 설계자 과정 수강생 인터뷰 모음', status: 'unwritten', scheduled_at: NOW + 21 * DAY,
      content_body: null },
  ];

  let inserted = 0;
  for (const item of contents) {
    const id = crypto.randomUUID();
    await db.execute({
      sql: `INSERT INTO content_queue
            (id, type, title, content_body, status, priority, channel_id, campaign_id,
             scheduled_at, channel, project, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        item.channel_id === igId ? 'instagram' :
        item.channel_id === ytId ? 'youtube' :
        item.channel_id === nlId ? 'newsletter' : 'blog',
        item.title,
        item.content_body ?? null,
        item.status,
        0,
        item.channel_id,
        campaignId,
        item.scheduled_at,
        item.channel_id === igId ? 'instagram' :
        item.channel_id === ytId ? 'youtube' :
        item.channel_id === nlId ? 'newsletter' : 'blog',
        'richbukae',
        NOW,
        NOW,
      ],
    });
    inserted++;
  }

  return NextResponse.json({
    success: true,
    message: `시드 완료: 캠페인 1개, 채널 4개, 콘텐츠 ${inserted}개`,
    seeded: true,
    data: { campaignId, channels: { igId, ytId, nlId, blogId }, contentsCount: inserted },
  });
}
