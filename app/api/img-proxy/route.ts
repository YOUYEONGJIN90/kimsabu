import { NextRequest, NextResponse } from 'next/server';

// 허용할 네이버 이미지 도메인만 프록시
const ALLOWED_HOSTS = [
  'postfiles.pstatic.net',
  'blogfiles.pstatic.net',
  'blogthumb.pstatic.net',
];

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('url parameter required', { status: 400 });
  }

  // 허용된 도메인만 프록시 (보안)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return new NextResponse('invalid url', { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
    return new NextResponse('forbidden host', { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://blog.naver.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return new NextResponse('upstream error', { status: res.status });
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new NextResponse('fetch failed', { status: 502 });
  }
}
