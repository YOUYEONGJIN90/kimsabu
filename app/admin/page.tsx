'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWorks, deleteWork } from '@/lib/storage';
import { WorkPost, CATEGORY_LABELS, CATEGORIES } from '@/lib/types';

export default function AdminPage() {
  const [allWorks, setAllWorks] = useState<WorkPost[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    getWorks().then(setAllWorks);
  }, []);

  const works = activeCategory === 'all'
    ? allWorks
    : allWorks.filter((w) => w.category === activeCategory);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}"을(를) 삭제하시겠습니까?`)) return;
    await deleteWork(id);
    setAllWorks(await getWorks());
  };

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-steel-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-steel-900">시공사례 관리</h1>
            <p className="text-steel-500 text-sm">
              전체 {allWorks.length}개
              {activeCategory !== 'all' && ` · 현재 필터 ${works.length}개`}
            </p>
          </div>
          <Link
            href="/admin/new"
            className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-lg"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 사례 등록
          </Link>
        </div>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => {
            const count = cat.value === 'all'
              ? allWorks.length
              : allWorks.filter((w) => w.category === cat.value).length;
            return (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all border ${activeCategory === cat.value
                    ? 'bg-steel-900 text-white border-steel-900'
                    : 'bg-white text-steel-600 border-steel-200 hover:border-steel-400'
                  }`}
              >
                {cat.icon} {cat.label}
                <span className={`text-xs px-1 py-0.5 sm:px-1.5 rounded-full ${activeCategory === cat.value
                    ? 'bg-white/20 text-white'
                    : 'bg-steel-100 text-steel-500'
                  }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {works.length === 0 ? (
          <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-16 text-center">
            <div className="text-5xl mb-4">🏗️</div>
            {allWorks.length === 0 ? (
              <>
                <p className="text-steel-500 font-medium mb-6">등록된 시공사례가 없습니다.</p>
                <Link
                  href="/admin/new"
                  className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                >
                  첫 번째 사례 등록하기
                </Link>
              </>
            ) : (
              <p className="text-steel-500 font-medium">
                해당 카테고리의 시공사례가 없습니다.
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-steel-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-steel-50 border-b border-steel-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-steel-600 hidden sm:table-cell">썸네일</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-steel-600">제목</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-steel-600 hidden sm:table-cell">카테고리</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-steel-600 hidden md:table-cell">등록일</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-steel-600">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {works.map((work) => (
                  <tr key={work.id} className="hover:bg-steel-50 transition-colors">
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-steel-100 flex-shrink-0">
                        {work.thumbnail ? (
                          <img
                            src={work.thumbnail}
                            alt={work.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-steel-300 text-xl">
                            🏗️
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-steel-800 text-sm line-clamp-2">{work.title}</p>
                      {work.summary && (
                        <p className="text-steel-400 text-xs mt-1 line-clamp-1">{work.summary}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="inline-block bg-accent-50 text-accent-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                        {CATEGORY_LABELS[work.category]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-steel-400 text-sm hidden md:table-cell">
                      {new Date(work.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/works/${work.id}`}
                          className="p-2 text-steel-400 hover:text-steel-600 hover:bg-steel-100 rounded-lg transition-colors"
                          title="미리보기"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/admin/edit/${work.id}`}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="수정"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        <button
                          onClick={() => handleDelete(work.id, work.title)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
