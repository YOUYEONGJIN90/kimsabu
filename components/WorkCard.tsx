import Link from 'next/link';
import { WorkPost, CATEGORY_LABELS } from '@/lib/types';

export default function WorkCard({ work }: { work: WorkPost }) {
  return (
    <Link
      href={`/works/${work.id}`}
      className="group bg-white border border-steel-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
    >
      {/* 썸네일 */}
      <div className="aspect-video bg-steel-100 overflow-hidden">
        {work.thumbnail ? (
          <img
            src={work.thumbnail}
            alt={work.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-steel-300 text-4xl">
            🏗️
          </div>
        )}
      </div>

      {/* 내용 */}
      <div className="p-5">
        <span className="inline-block bg-accent-50 text-accent-600 text-xs font-semibold px-2.5 py-1 rounded-full mb-3">
          {CATEGORY_LABELS[work.category]}
        </span>
        <h3 className="font-bold text-steel-800 text-base leading-snug mb-2 group-hover:text-accent-600 transition-colors line-clamp-2">
          {work.title}
        </h3>
        {work.summary && (
          <p className="text-steel-500 text-sm line-clamp-2">{work.summary}</p>
        )}
        <p className="text-steel-400 text-xs mt-3">
          {new Date(work.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </Link>
  );
}
