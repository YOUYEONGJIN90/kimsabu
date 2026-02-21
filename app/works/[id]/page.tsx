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
    getWork(id).then((found) => {
      if (!found) {
        router.replace('/works');
      } else {
        setWork(found);
      }
    });
  }, [id, router]);

  if (!work) return (
    <div className="pt-16 md:pt-20 min-h-screen animate-pulse">
      {/* 헤더 스켈레톤 */}
      <div className="bg-steel-900 py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-3 mb-6">
            <div className="h-4 w-24 bg-steel-700 rounded-full" />
            <div className="h-6 w-16 bg-steel-700 rounded-full" />
          </div>
          <div className="h-8 w-3/4 bg-steel-700 rounded-lg mb-3" />
          <div className="h-5 w-1/2 bg-steel-800 rounded-lg mb-4" />
          <div className="h-4 w-28 bg-steel-800 rounded-full" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* 썸네일 스켈레톤 */}
        <div className="mb-10 w-full h-72 md:h-[400px] bg-steel-100 rounded-2xl" />

        {/* 본문 스켈레톤 */}
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`h-4 bg-steel-100 rounded ${i % 3 === 2 ? 'w-2/3' : 'w-full'}`} />
          ))}
          <div className="my-6 w-full h-56 bg-steel-100 rounded-xl" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`h-4 bg-steel-100 rounded ${i === 3 ? 'w-1/2' : 'w-full'}`} />
          ))}
          <div className="my-6 w-full h-56 bg-steel-100 rounded-xl" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`h-4 bg-steel-100 rounded ${i === 2 ? 'w-3/4' : 'w-full'}`} />
          ))}
        </div>

        {/* CTA 스켈레톤 */}
        <div className="mt-14 bg-steel-50 rounded-2xl p-8 flex flex-col items-center gap-4">
          <div className="h-6 w-48 bg-steel-200 rounded-lg" />
          <div className="h-4 w-64 bg-steel-200 rounded-lg" />
          <div className="h-12 w-40 bg-steel-200 rounded-xl" />
        </div>
      </div>
    </div>
  );

  const htmlContent = work.content ? renderDraftContent(work.content) : '';

  return (
    <div className="pt-16 md:pt-20 min-h-screen">
      {/* 헤더 */}
      <div className="bg-steel-900 py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-3 mb-6">
            <Link
              href="/works"
              className="inline-flex items-center gap-2 text-steel-400 hover:text-white transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              시공사례 목록
            </Link>
            <span className="inline-block bg-accent-500/20 text-accent-400 text-xs font-semibold px-3 py-1 rounded-full">
              {CATEGORY_LABELS[work.category]}
            </span>
          </div>
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
            className="text-steel-700 leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1 [&_strong]:font-bold [&_em]:italic"
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
