'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: '회사소개' },
  { href: '/works', label: '시공사례' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-steel-900/95 backdrop-blur-md shadow-lg' : 'bg-steel-900'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* 로고 */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-accent-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:bg-accent-600 transition-colors">
              K
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight">난간닥터 김사부</div>
              <div className="text-steel-400 text-xs">철구조물 전문 시공</div>
            </div>
          </Link>

          {/* 데스크탑 메뉴 */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors relative group ${
                  pathname === link.href
                    ? 'text-accent-400'
                    : 'text-steel-300 hover:text-white'
                }`}
              >
                {link.label}
                <span
                  className={`absolute -bottom-1 left-0 h-0.5 bg-accent-500 transition-all duration-300 ${
                    pathname === link.href ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </Link>
            ))}
            <Link
              href="/contact"
              className="bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-accent-500/30"
            >
              무료 견적 문의
            </Link>
          </div>

          {/* 모바일 햄버거 버튼 */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-steel-800 transition-colors"
            aria-label="메뉴 열기"
          >
            <div className="w-6 h-5 flex flex-col justify-between">
              <span
                className={`block h-0.5 bg-white transition-all duration-300 ${
                  isOpen ? 'rotate-45 translate-y-2' : ''
                }`}
              />
              <span
                className={`block h-0.5 bg-white transition-all duration-300 ${
                  isOpen ? 'opacity-0 scale-x-0' : ''
                }`}
              />
              <span
                className={`block h-0.5 bg-white transition-all duration-300 ${
                  isOpen ? '-rotate-45 -translate-y-2' : ''
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="bg-steel-800 px-4 py-4 space-y-2 border-t border-steel-700">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-accent-500/20 text-accent-400'
                  : 'text-steel-300 hover:bg-steel-700 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="block mt-2 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold px-4 py-3 rounded-lg text-center transition-colors"
          >
            무료 견적 문의
          </Link>
        </div>
      </div>
    </nav>
  );
}
