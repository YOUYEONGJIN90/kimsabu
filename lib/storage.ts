import { WorkPost, WorkCategory } from './types';
import { supabase } from './supabase';

// ── 인메모리 캐시 ─────────────────────────────────────────────────────────────
// 모듈 레벨에 저장 → 컴포넌트 리렌더 간 유지, saveWork/deleteWork 호출 시 초기화
let cache: WorkPost[] | null = null;

function invalidateCache() {
  cache = null;
}

// ── 조회 ──────────────────────────────────────────────────────────────────────

export async function getWorks(): Promise<WorkPost[]> {
  if (cache !== null) return cache;

  const { data, error } = await supabase
    .from('works')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('getWorks error:', error); return []; }

  cache = (data ?? []).map(toWorkPost);
  return cache;
}

export async function getWork(id: string): Promise<WorkPost | null> {
  // 캐시에 전체 목록이 있으면 거기서 찾음
  if (cache !== null) {
    return cache.find((w) => w.id === id) ?? null;
  }

  const { data, error } = await supabase
    .from('works')
    .select('*')
    .eq('id', id)
    .single();
  if (error) { console.error('getWork error:', error); return null; }
  return data ? toWorkPost(data) : null;
}

export async function getWorksByCategory(category: WorkCategory): Promise<WorkPost[]> {
  const all = await getWorks();
  return all.filter((w) => w.category === category);
}

// ── 변경 (캐시 초기화) ────────────────────────────────────────────────────────

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
  invalidateCache();
}

export async function deleteWork(id: string): Promise<void> {
  const { error } = await supabase.from('works').delete().eq('id', id);
  if (error) { console.error('deleteWork error:', error); return; }
  invalidateCache();
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
