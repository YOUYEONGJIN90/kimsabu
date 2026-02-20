import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: '난간닥터 김사부 - 휀스·난간·대문·데크 전문 시공',
  description:
    '철구조물 전문 시공업체. 휀스, 난간, 대문, 데크, 금속구조물 제작 및 설치. 전국 시공 가능. 무료 견적 문의.',
  keywords: '휀스, 난간, 대문, 데크, 금속구조물, 철구조물, 시공, 설치',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
