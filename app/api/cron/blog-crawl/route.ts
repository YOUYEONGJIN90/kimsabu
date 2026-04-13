import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 1500; // 25분

export async function GET(req: NextRequest) {
  // Vercel Cron 요청 검증
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // D-1 날짜 계산 (KST 기준)
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() - 1);
  const yyyy = kst.getUTCFullYear();
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kst.getUTCDate()).padStart(2, '0');
  const date = `${yyyy}-${mm}-${dd}`;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `https://${req.headers.get('host')}`;

  const res = await fetch(`${baseUrl}/api/blog-crawl`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });

  const result = await res.json();
  console.log(`[cron] blog-crawl ${date}:`, JSON.stringify(result));

  return NextResponse.json({ date, ...result });
}
