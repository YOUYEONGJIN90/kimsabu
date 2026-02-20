export type WorkCategory = 'fence' | 'railing' | 'gate' | 'deck' | 'metal';

export interface WorkPost {
  id: string;
  title: string;
  category: WorkCategory;
  summary: string;
  content: string;
  thumbnail: string;
  createdAt: string;
  updatedAt: string;
}

export const CATEGORY_LABELS: Record<WorkCategory, string> = {
  fence: '휀스',
  railing: '난간',
  gate: '대문',
  deck: '데크',
  metal: '금속구조물',
};

export const CATEGORIES = [
  { value: 'all', label: '전체', icon: '🏗️' },
  { value: 'fence', label: '휀스', icon: '🪞' },
  { value: 'railing', label: '난간', icon: '🏗️' },
  { value: 'gate', label: '대문', icon: '🚪' },
  { value: 'deck', label: '데크', icon: '🪵' },
  { value: 'metal', label: '금속구조물', icon: '⚙️' },
];
