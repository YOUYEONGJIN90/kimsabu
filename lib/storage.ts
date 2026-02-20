import { WorkPost, WorkCategory } from './types';
import { supabase } from './supabase';

// ── 읽기: API 라우트 경유 → Next.js 서버 캐시(unstable_cache) 활용 ────────────
// 모든 사용자가 서버에서 캐시된 동일한 응답을 받음

export async function getWorks(): Promise<WorkPost[]> {
  const res = await fetch('/api/works');
  if (!res.ok) return [];
  const rows = (await res.json()) as Record<string, unknown>[];
  return rows.map(toWorkPost);
}

export async function getWork(id: string): Promise<WorkPost | null> {
  const res = await fetch(`/api/works/${id}`);
  if (!res.ok) return null;
  const row = (await res.json()) as Record<string, unknown> | null;
  return row ? toWorkPost(row) : null;
}

export async function getWorksByCategory(category: WorkCategory): Promise<WorkPost[]> {
  const all = await getWorks();
  return all.filter((w) => w.category === category);
}

// ── 쓰기: Supabase 직접 변경 후 서버 캐시 무효화 ─────────────────────────────
// 이미지가 base64로 커서 API 라우트를 거치지 않고 Supabase 직접 전송
// 변경 완료 후 /api/revalidate 호출 → revalidateTag('works')

export async function saveWork(work: WorkPost): Promise<void> {
  const { error } = await supabase.from('works').upsert({
    id: work.id,
    title: work.title,
    category: work.category,
    summary: work.summary,
    content: work.content,
    thumbnail: work.thumbnail,
    created_at: work.createdAt,
    updated_at: work.updatedAt,
  });
  if (error) { console.error('saveWork error:', error); return; }
  await fetch('/api/revalidate', { method: 'POST' });
}

export async function deleteWork(id: string): Promise<void> {
  const { error } = await supabase.from('works').delete().eq('id', id);
  if (error) { console.error('deleteWork error:', error); return; }
  await fetch('/api/revalidate', { method: 'POST' });
}

// ── 내부 유틸 ─────────────────────────────────────────────────────────────────

function toWorkPost(row: Record<string, unknown>): WorkPost {
  return {
    id: row.id as string,
    title: row.title as string,
    category: row.category as WorkCategory,
    summary: (row.summary as string) ?? '',
    content: (row.content as string) ?? '',
    thumbnail: (row.thumbnail as string) ?? '',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
