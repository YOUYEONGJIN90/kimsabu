'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getWorks, getWorksByCategory } from '@/lib/storage';
import { WorkPost, WorkCategory, CATEGORIES } from '@/lib/types';
import WorkCard from '@/components/WorkCard';

function WorksContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [works, setWorks] = useState<WorkPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(categoryParam ?? 'all');

  useEffect(() => {
    if (activeCategory === 'all') {
      setWorks(getWorks());
    } else {
      setWorks(getWorksByCategory(activeCategory as WorkCategory));
    }
  }, [activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* 카테고리 필터 */}
      <div className="flex flex-wrap gap-2 mb-10">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
              activeCategory === cat.value
                ? 'bg-steel-900 text-white border-steel-900'
                : 'bg-white text-steel-600 border-steel-200 hover:border-steel-400'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* 작업 목록 */}
      {works.length === 0 ? (
        <div className="text-center py-24 text-steel-400">
          <div className="text-5xl mb-4">🏗️</div>
          <p className="text-lg font-medium">아직 등록된 시공사례가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorksPage() {
  return (
    <div className="pt-16 md:pt-20">
      {/* 헤더 */}
      <div className="bg-steel-900 py-14 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3">시공사례</h1>
          <p className="text-steel-400 text-lg">
            난간닥터 김사부의 다양한 시공 작업들을 확인하세요.
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center text-steel-400">
          <div className="text-4xl mb-4">🏗️</div>
          <p>불러오는 중...</p>
        </div>
      }>
        <WorksContent />
      </Suspense>
    </div>
  );
}
