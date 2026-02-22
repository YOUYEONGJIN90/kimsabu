import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

const SITE_URL = 'https://k-sabu.com'; // 도메인 변경 시 여기만 수정

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 정적 페이지
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/works`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // 시공사례 동적 페이지
  const { data: works } = await supabase
    .from('works')
    .select('id, updated_at')
    .order('created_at', { ascending: false });

  const workPages: MetadataRoute.Sitemap = (works ?? []).map((w) => ({
    url: `${SITE_URL}/works/${w.id}`,
    lastModified: new Date(w.updated_at),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...workPages];
}
