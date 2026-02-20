import { WorkPost, WorkCategory } from './types';

const STORAGE_KEY = 'kimsabu_works';

export function getWorks(): WorkPost[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as WorkPost[];
  } catch {
    return [];
  }
}

export function getWork(id: string): WorkPost | null {
  return getWorks().find((w) => w.id === id) ?? null;
}

export function getWorksByCategory(category: WorkCategory): WorkPost[] {
  return getWorks().filter((w) => w.category === category);
}

export function saveWork(work: WorkPost): void {
  const works = getWorks();
  const idx = works.findIndex((w) => w.id === work.id);
  if (idx >= 0) {
    works[idx] = work;
  } else {
    works.unshift(work);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
}

export function deleteWork(id: string): void {
  const works = getWorks().filter((w) => w.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(works));
}
