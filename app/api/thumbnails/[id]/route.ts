import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const revalidate = 86400; // 24시간 캐시

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data } = await supabase
    .from('works')
    .select('thumbnail')
    .eq('id', id)
    .single();

  if (!data?.thumbnail) {
    return new NextResponse(null, { status: 404 });
  }

  // base64 data URL 파싱
  const match = data.thumbnail.match(/^data:([^;]+);base64,(.+)$/s);
  if (!match) {
    return new NextResponse(null, { status: 400 });
  }

  const [, mime, b64] = match;
  const buffer = Buffer.from(b64, 'base64');

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
