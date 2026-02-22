import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const SITE_URL = 'https://k-sabu.com'; // 도메인 변경 시 여기만 수정

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '난간닥터 김사부 - 휀스·난간·대문·데크 전문 시공',
    template: '%s | 난간닥터 김사부',
  },
  description:
    '철구조물 전문 시공업체. 휀스, 난간, 대문, 데크, 금속구조물 제작 및 설치. 경기 남양주 기반 전국 시공 가능. 무료 현장 견적 문의 010-9132-8489.',
  keywords: [
    '휀스', '난간', '대문', '데크', '금속구조물', '철구조물', '시공', '설치',
    '휀스시공', '난간시공', '대문시공', '데크시공', '남양주', '경기도',
    '무료견적', '난간닥터', '김사부',
  ],
  authors: [{ name: '난간닥터 김사부' }],
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: '난간닥터 김사부',
    title: '난간닥터 김사부 - 휀스·난간·대문·데크 전문 시공',
    description:
      '철구조물 전문 시공업체. 휀스, 난간, 대문, 데크, 금속구조물 제작 및 설치. 전국 시공 가능. 무료 견적 010-9132-8489.',
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <meta name="google-site-verification" content="uxmIqR33M4s-0u6vhjRR-w0Jzq3ba_VMz4W5-OU_uOM" />
        <meta name="naver-site-verification" content="82765c2b14208bbafb18ab8a137eb5ef055c7ede" />
      </head>
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
