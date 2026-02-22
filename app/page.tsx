'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getWorks } from '@/lib/storage';
import { WorkPost, CATEGORY_LABELS } from '@/lib/types';
import WorkCard from '@/components/WorkCard';

const services = [
  {
    icon: '🪞',
    title: '휀스',
    desc: '주거·상업·산업 공간에 맞는 다양한 소재와 디자인의 휀스를 제작 시공합니다.',
    color: 'from-blue-500 to-blue-600',
  },
  {
    icon: '🏗️',
    title: '난간',
    desc: '계단, 베란다, 옥상 등 모든 공간의 안전하고 미려한 난간을 시공합니다.',
    color: 'from-purple-500 to-purple-600',
  },
  {
    icon: '🚪',
    title: '대문',
    desc: '슬라이딩, 여닫이, 자동 대문까지 기능과 디자인을 모두 갖춘 대문을 만듭니다.',
    color: 'from-green-500 to-green-600',
  },
  {
    icon: '🪵',
    title: '데크',
    desc: '목재·합성목재·알루미늄 데크를 활용하여 실용적이고 아름다운 공간을 조성합니다.',
    color: 'from-amber-500 to-amber-600',
  },
  {
    icon: '⚙️',
    title: '금속구조물',
    desc: '캐노피, 철재 계단, 각종 구조물까지 맞춤 제작으로 원하는 형태를 구현합니다.',
    color: 'from-slate-500 to-slate-600',
  },
];

const stats = [
  { value: '빠른 시공', label: '일정 맞춤 진행' },
  { value: '원스톱', label: '상담·실측·시공 한번에' },
  { value: '100%', label: '고객 만족' },
  { value: '전국', label: '시공 가능' },
];

export default function HomePage() {
  const [recentWorks, setRecentWorks] = useState<WorkPost[]>([]);

  useEffect(() => {
    getWorks().then((works) => setRecentWorks(works.slice(0, 3)));
  }, []);

  return (
    <div className="pt-16 md:pt-20">
      {/* 히어로 섹션 */}
      <section className="relative min-h-[90vh] flex items-center bg-steel-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                #64748b 0px,
                #64748b 1px,
                transparent 0px,
                transparent 50%
              )`,
              backgroundSize: '20px 20px',
            }}
          />
        </div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-accent-500/20 text-accent-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse" />
              철구조물 전문 제작 · 시공
            </div>
            <h1 className="text-2xl sm:text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              디테일을 놓치지 않는
              <br />
              설계와 시공으로 완성도 높은
              <br />
              <span className="text-accent-400">철구조물</span>
              을 만들어 드립니다
            </h1>
            <p className="text-steel-300 text-sm sm:text-lg md:text-xl leading-relaxed mb-10 max-w-2xl">
              휀스, 난간, 대문, 데크, 금속구조물까지
              <br className="hidden sm:block" />
              고객의 요구에 맞춘 책임 시공을 약속드립니다.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-lg hover:shadow-accent-500/30 hover:-translate-y-0.5"
              >
                무료 견적 문의
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href="/works"
                className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200 backdrop-blur-sm border border-white/20"
              >
                시공사례 보기
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-2 text-steel-400 animate-bounce">
          <span className="text-xs">스크롤</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* 통계 섹션 */}
      <section className="bg-accent-500 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-amber-100 text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 서비스 섹션 */}
      <section className="py-20 bg-white" id="services">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-steel-900 mb-4">
              전문 시공 서비스
            </h2>
            <p className="text-steel-500 text-lg max-w-2xl mx-auto">
              다양한 철구조물 제작 및 시공 서비스를 제공합니다
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Link
                key={service.title}
                href={`/works?category=${service.title === '휀스'
                  ? 'fence'
                  : service.title === '난간'
                    ? 'railing'
                    : service.title === '대문'
                      ? 'gate'
                      : service.title === '데크'
                        ? 'deck'
                        : 'metal'
                  }`}
                className="group bg-white border border-steel-100 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${service.color} rounded-2xl flex items-center justify-center text-2xl mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-steel-800 mb-3 group-hover:text-accent-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-steel-500 text-sm leading-relaxed">{service.desc}</p>
                <div className="mt-4 flex items-center gap-1 text-accent-500 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  시공사례 보기
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 최근 시공사례 */}
      {recentWorks.length > 0 && (
        <section className="py-20 bg-steel-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-steel-900 mb-2">
                  최근 시공사례
                </h2>
                <p className="text-steel-500">최근 완료된 프로젝트를 확인하세요</p>
              </div>
              <Link
                href="/works"
                className="inline-flex items-center gap-2 text-accent-500 font-semibold hover:text-accent-600 transition-colors group"
              >
                전체 보기
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentWorks.map((work) => (
                <WorkCard key={work.id} work={work} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 회사 소개 섹션 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-steel-900 mb-6">
                왜 난간닥터 김사부를
                <br />
                선택해야 할까요?
              </h2>
              <div className="space-y-6">
                {[
                  {
                    icon: '🔩',
                    title: '직접 제작 · 직접 시공',
                    desc: '중간 유통 없이 제작부터 시공까지 직접 진행하여 비용을 절감합니다.',
                  },
                  {
                    icon: '📏',
                    title: '맞춤 설계',
                    desc: '고객의 공간과 요구에 맞게 1:1 맞춤 설계로 최적의 결과물을 제공합니다.',
                  },
                  {
                    icon: '🏆',
                    title: '완성도',
                    desc: '공간에 맞는 최적의 금속 솔루션을 제공합니다.',
                  },
                  {
                    icon: '🛡️',
                    title: 'A/S 보장',
                    desc: '시공 후에도 철저한 사후 관리로 오랫동안 안심하고 사용하실 수 있습니다.',
                  },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-steel-800 mb-1">{item.title}</h3>
                      <p className="text-steel-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 문의 CTA 카드 */}
            <div className="bg-steel-900 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-accent-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="relative">
                <h3 className="text-2xl md:text-3xl font-bold mb-4">
                  무료 견적 상담
                  <br />
                  지금 바로 문의하세요!
                </h3>
                <p className="text-steel-400 mb-8 leading-relaxed">
                  현장 방문 후 정확한 견적을 제공해 드립니다.
                  <br />
                  전화 또는 온라인으로 편리하게 문의하세요.
                </p>
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-steel-300">
                    <span className="text-accent-400">📞</span>
                    <span className="text-xl font-bold text-white">010-9132-8489</span>
                  </div>
                  <div className="text-steel-400 text-sm">
                    평일 08:00 ~ 18:00 (주말·공휴일 상담 가능)
                  </div>
                </div>
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center w-full gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-6 py-4 rounded-xl transition-colors text-lg"
                >
                  무료 견적 문의
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
