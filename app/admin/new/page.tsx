'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { saveWork } from '@/lib/storage';
import { WorkPost, WorkCategory, CATEGORIES } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const DraftEditor = dynamic(() => import('@/components/DraftEditor'), {
  ssr: false,
  loading: () => (
    <div className="border border-steel-200 rounded-xl min-h-96 flex items-center justify-center bg-steel-50">
      <span className="text-steel-400 text-sm">에디터 로딩 중...</span>
    </div>
  ),
});

function compressImage(file: File, maxWidth = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewWorkPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    category: '' as WorkCategory | '',
    summary: '',
    content: '',
    thumbnail: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const thumbnailRef = useRef<HTMLInputElement>(null);

  const handleContentChange = useCallback((raw: string) => {
    setForm((prev) => ({ ...prev, content: raw }));
  }, []);

  const handleThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, thumbnail: '이미지 파일만 업로드 가능합니다' }));
      return;
    }
    try {
      const compressed = await compressImage(file);
      setForm((prev) => ({ ...prev, thumbnail: compressed }));
      setErrors((prev) => ({ ...prev, thumbnail: '' }));
    } catch {
      setErrors((prev) => ({ ...prev, thumbnail: '이미지 처리 중 오류가 발생했습니다' }));
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.title.trim()) newErrors.title = '제목을 입력해주세요';
    if (!form.category) newErrors.category = '카테고리를 선택해주세요';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);

    const work: WorkPost = {
      id: uuidv4(),
      title: form.title.trim(),
      category: form.category as WorkCategory,
      summary: form.summary.trim(),
      content: form.content,
      thumbnail: form.thumbnail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveWork(work);
    router.push('/admin');
  };

  return (
    <div className="pt-16 md:pt-20 min-h-screen bg-steel-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="p-2 text-steel-400 hover:text-steel-600 hover:bg-white rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-steel-900">새 시공사례 등록</h1>
            <p className="text-steel-500 text-sm">작업 내용을 입력하고 등록하세요</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-6">
            <h2 className="font-bold text-steel-800 mb-5">기본 정보</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-steel-700 mb-1.5">
                  제목 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="예) 경기도 OO아파트 휀스 시공"
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors ${
                    errors.title
                      ? 'border-red-400 bg-red-50'
                      : 'border-steel-200 focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20'
                  }`}
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-steel-700 mb-2">
                  카테고리 <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.filter((c) => c.value !== 'all').map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, category: cat.value as WorkCategory }));
                        setErrors((prev) => ({ ...prev, category: '' }));
                      }}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                        form.category === cat.value
                          ? 'bg-steel-900 text-white border-steel-900'
                          : 'bg-white text-steel-600 border-steel-200 hover:border-steel-400'
                      }`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-steel-700 mb-1.5">
                  한 줄 요약{' '}
                  <span className="text-steel-400 font-normal">(선택 — 목록에 표시됩니다)</span>
                </label>
                <input
                  type="text"
                  value={form.summary}
                  onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                  placeholder="예) 빌라 옥상 스테인리스 난간 시공 완료"
                  maxLength={100}
                  className="w-full px-4 py-3 rounded-xl border border-steel-200 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 outline-none transition-colors"
                />
                <p className="text-xs text-steel-400 mt-1">{form.summary.length}/100자</p>
              </div>
            </div>
          </div>

          {/* 썸네일 */}
          <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-6">
            <h2 className="font-bold text-steel-800 mb-5">대표 이미지</h2>
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                errors.thumbnail ? 'border-red-300 bg-red-50' : 'border-steel-200 hover:border-accent-400'
              }`}
              onClick={() => thumbnailRef.current?.click()}
            >
              {form.thumbnail ? (
                <div className="relative">
                  <img
                    src={form.thumbnail}
                    alt="썸네일"
                    className="max-h-64 mx-auto rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setForm((prev) => ({ ...prev, thumbnail: '' }));
                      if (thumbnailRef.current) thumbnailRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 transition-colors text-sm font-bold"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="py-6">
                  <div className="text-4xl mb-3">📷</div>
                  <p className="text-steel-600 font-medium mb-1">이미지를 클릭하여 업로드</p>
                  <p className="text-steel-400 text-xs">JPG, PNG, GIF (최대 10MB, 자동 압축)</p>
                </div>
              )}
            </div>
            <input
              ref={thumbnailRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnail}
              className="hidden"
            />
            {errors.thumbnail && <p className="text-red-500 text-xs mt-2">{errors.thumbnail}</p>}
          </div>

          {/* 본문 에디터 */}
          <div className="bg-white rounded-2xl border border-steel-100 shadow-sm p-6">
            <h2 className="font-bold text-steel-800 mb-5">
              본문 내용{' '}
              <span className="text-steel-400 font-normal text-sm">(선택)</span>
            </h2>
            <DraftEditor onChange={handleContentChange} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pb-8">
            <Link
              href="/admin"
              className="flex-1 text-center bg-white border border-steel-200 hover:bg-steel-50 text-steel-700 font-semibold py-3.5 rounded-xl transition-colors"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-accent-500 hover:bg-accent-600 disabled:bg-steel-300 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg disabled:cursor-not-allowed"
            >
              {saving ? '저장 중...' : '시공사례 등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
