import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '콘텐츠 오케스트레이션',
  description: '멀티 프로젝트 콘텐츠 통합 관리 대시보드',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
