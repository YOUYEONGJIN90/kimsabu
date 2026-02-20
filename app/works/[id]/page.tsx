'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getWork } from '@/lib/storage';
import { WorkPost, CATEGORY_LABELS } from '@/lib/types';
import { renderDraftContent } from '@/components/DraftEditor';

export default function WorkDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [work, setWork] = useState<WorkPost | null>(null);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    const found = getWork(id);
    if (!found) {
      router.replace('/works');
    } else {
      setWork(found);
    }
  }, [id, router]);

  if (!work) return null;

  const htmlContent = work.content ? renderDraftContent(work.content) : '';

  return (
    <div className="pt-16 md:pt-20 min-h-screen">
      {/* 헤더 */}
      <div className="bg-steel-900 py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/works"
            className="inline-flex items-center gap-2 text-steel-400 hover:text-white transition-colors mb-6 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            시공사례 목록
          </Link>
          <span className="inline-block bg-accent-500/20 text-accent-400 text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {CATEGORY_LABELS[work.category]}
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-3">{work.title}</h1>
          {work.summary && (
            <p className="text-steel-400 text-lg">{work.summary}</p>
          )}
          <p className="text-steel-500 text-sm mt-4">
            {new Date(work.createdAt).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 썸네일 */}
        {work.thumbnail && (
          <div className="mb-10">
            <img
              src={work.thumbnail}
              alt={work.title}
              className="w-full rounded-2xl object-cover cursor-zoom-in max-h-[500px]"
              onClick={() => setLightbox(true)}
            />
          </div>
        )}

        {/* 본문 */}
        {htmlContent && (
          <div
            className="prose prose-steel max-w-none text-steel-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        )}

        {/* 문의 CTA */}
        <div className="mt-14 bg-steel-50 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-steel-800 mb-2">
            이런 시공이 필요하신가요?
          </h3>
          <p className="text-steel-500 mb-6">무료로 현장 방문 견적을 받아보세요.</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-bold px-8 py-4 rounded-xl transition-colors"
          >
            무료 견적 문의하기
          </Link>
        </div>
      </div>

      {/* 라이트박스 */}
      {lightbox && work.thumbnail && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={work.thumbnail}
            alt={work.title}
            className="max-w-full max-h-full rounded-xl object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-steel-300 transition-colors"
            onClick={() => setLightbox(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
