import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-steel-900 text-steel-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 회사 정보 */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                K
              </div>
              <div>
                <div className="text-white font-bold text-lg leading-tight">난간닥터 김사부</div>
                <div className="text-steel-500 text-xs">철구조물 전문 시공</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-steel-400">
              직접 설계 · 직접 제작 시스템으로<br />
              휀스, 난간, 대문, 데크, 금속구조물<br />
              완성도 높은 시공을 제공합니다.
            </p>
          </div>

          {/* 빠른 링크 */}
          <div>
            <h3 className="text-white font-semibold mb-4">빠른 메뉴</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-sm hover:text-accent-400 transition-colors">
                  회사소개
                </Link>
              </li>
              <li>
                <Link href="/works" className="text-sm hover:text-accent-400 transition-colors">
                  시공사례
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-sm hover:text-accent-400 transition-colors">
                  무료견적문의
                </Link>
              </li>
            </ul>
          </div>

          {/* 연락처 */}
          <div>
            <h3 className="text-white font-semibold mb-4">연락처</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-accent-500 mt-0.5">📞</span>
                <div>
                  <div className="text-white font-medium">010-0000-0000</div>
                  <div className="text-steel-500 text-xs">평일 08:00 ~ 18:00</div>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-500 mt-0.5">📍</span>
                <div className="text-steel-400">경기도 OO시 OO구 OO동</div>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent-500 mt-0.5">✉️</span>
                <div className="text-steel-400">kimsabu@email.com</div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-steel-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-steel-500">
            © {new Date().getFullYear()} 난간닥터 김사부. All rights reserved.
          </p>
          <Link
            href="/admin"
            className="text-xs text-steel-700 hover:text-steel-500 transition-colors"
          >
            관리자
          </Link>
        </div>
      </div>
    </footer>
  );
}
