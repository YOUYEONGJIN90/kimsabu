import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import { WorkCategory } from '@/lib/types';

const BLOG_ID = 'k_sabu';
const UA_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';

// ── 카테고리 자동 감지 ────────────────────────────────────────────────────────

function detectCategory(title: string): WorkCategory {
  if (title.includes('난간')) return 'railing';
  if (title.includes('대문')) return 'gate';
  if (title.includes('데크')) return 'deck';
  if (title.includes('휀스') || title.includes('펜스')) return 'fence';
  if (
    title.includes('금속') ||
    title.includes('철제') ||
    title.includes('구조물') ||
    title.includes('스틸') ||
    title.includes('알루미늄')
  )
    return 'metal';
  return 'fence';
}

// ── KST 기준 날짜 비교 ────────────────────────────────────────────────────────

function toKSTDate(isoOrRfc: string): Date | null {
  const d = new Date(isoOrRfc);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getTime() + 9 * 60 * 60 * 1000);
}

function isSameKSTDate(pubDate: string, yyyy: number, mm: number, dd: number): boolean {
  const kst = toKSTDate(pubDate);
  if (!kst) return false;
  return kst.getUTCFullYear() === yyyy && kst.getUTCMonth() + 1 === mm && kst.getUTCDate() === dd;
}

// ── HTML 엔티티 디코드 ─────────────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// ── 공통 타입 ─────────────────────────────────────────────────────────────────

interface PostItem {
  title: string;
  logNo: string;
  pubDate: string; // ISO string
}

// ── RSS 파싱 ──────────────────────────────────────────────────────────────────

async function fetchFromRSS(yyyy: number, mm: number, dd: number): Promise<PostItem[]> {
  const res = await fetch(`https://rss.blog.naver.com/${BLOG_ID}.xml`, {
    headers: { 'User-Agent': UA_MOBILE },
    cache: 'no-store',
  });
  if (!res.ok) return [];

  const xml = await res.text();
  const matched: PostItem[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;

  while ((m = itemRe.exec(xml)) !== null) {
    const chunk = m[1];

    const titleMatch =
      /<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(chunk) ||
      /<title>([\s\S]*?)<\/title>/.exec(chunk);
    const title = decodeEntities(titleMatch?.[1]?.trim() ?? '');

    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(chunk);
    const link = linkMatch?.[1]?.trim() ?? '';
    const logNo =
      /\/(\d{8,})$/.exec(link)?.[1] ??
      /logNo=(\d+)/.exec(link)?.[1] ??
      '';

    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(chunk);
    const pubDate = pubDateMatch?.[1]?.trim() ?? '';

    if (logNo && title && isSameKSTDate(pubDate, yyyy, mm, dd)) {
      matched.push({ title, logNo, pubDate: new Date(pubDate).toISOString() });
    }
  }

  return matched;
}

// ── 페이지 목록 크롤링 (RSS 폴백) ─────────────────────────────────────────────

interface NextDataPost {
  logNo: string;
  title: string;
  addDate: string;
}


interface ScrapeDebug {
  pages: Array<{ page: number; url: string; status: number; logNosFound: number; html200: boolean; htmlSnippet: string }>;
  posts: Array<{ logNo: string; title: string; pubDate: string; kstDate: string }>;
}

/** Naver 블로그 PostTitleListAsync API로 포스트 목록 가져오기 */
async function fetchFromNaverBlogApi(
  yyyy: number,
  mm: number,
  dd: number
): Promise<{ items: PostItem[]; debug: ScrapeDebug }> {
  const matched: PostItem[] = [];
  const debug: ScrapeDebug = { pages: [], posts: [] };
  const targetTs = Date.UTC(yyyy, mm - 1, dd);

  const HEADERS = {
    'User-Agent': UA_MOBILE,
    Referer: `https://blog.naver.com/${BLOG_ID}`,
    Accept: 'application/json, text/plain, */*',
  };

  for (let page = 1; page <= 50; page++) {
    const apiUrl =
      `https://blog.naver.com/PostTitleListAsync.naver` +
      `?blogId=${BLOG_ID}&viewdate=&currentPage=${page}` +
      `&categoryNo=&parentCategoryNo=&countPerPage=30`;

    const apiRes = await fetch(apiUrl, { headers: HEADERS, cache: 'no-store' });
    const rawText = apiRes.ok ? await apiRes.text() : '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let apiPosts: NextDataPost[] = [];
    let parseError = '';
    if (rawText) {
      try {
        // 잘못된 JSON 이스케이프 문자 수정 (네이버 응답에 \x 등 포함될 수 있음)
        const sanitized = rawText.replace(/\\(?!["\\/bfnrtu]|u[0-9a-fA-F]{4})/g, '\\\\');
        const json = JSON.parse(sanitized) as Record<string, unknown>;
        if (json.resultCode !== 'S') {
          parseError = `resultCode=${json.resultCode}`;
        } else if (!Array.isArray(json.postList)) {
          parseError = 'postList가 배열이 아님';
        } else {
          apiPosts = (json.postList as Record<string, string>[])
            .map((item) => {
              let title = item.title ?? '';
              // + → 공백 변환 후 URL 디코딩 (Naver는 공백을 +로 인코딩)
              try { title = decodeURIComponent(title.replace(/\+/g, '%20')); } catch { title = title.replace(/\+/g, ' '); }
              return { logNo: String(item.logNo ?? ''), title: decodeEntities(title), addDate: item.addDate ?? '' };
            })
            .filter((p) => p.logNo !== '');
        }
      } catch (e) {
        parseError = `JSON.parse 실패: ${String(e)}`;
      }
    }

    debug.pages.push({
      page,
      url: apiUrl,
      status: apiRes.status,
      logNosFound: apiPosts.length,
      html200: apiRes.ok,
      htmlSnippet: (parseError ? `[오류: ${parseError}] ` : '') + rawText.slice(0, 300).replace(/\s+/g, ' '),
    });

    if (!apiRes.ok || apiPosts.length === 0) break;

    let allOlderThanTarget = true;

    for (const post of apiPosts) {
      // addDate 형식: "2026. 4. 2." → ISO KST
      const dateM = /(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\./.exec(post.addDate);
      const normalized = dateM
        ? `${dateM[1]}-${dateM[2].padStart(2, '0')}-${dateM[3].padStart(2, '0')}T00:00:00+09:00`
        : post.addDate.length === 14
          ? `${post.addDate.slice(0,4)}-${post.addDate.slice(4,6)}-${post.addDate.slice(6,8)}T${post.addDate.slice(8,10)}:${post.addDate.slice(10,12)}:${post.addDate.slice(12,14)}+09:00`
          : post.addDate;

      const kst = toKSTDate(normalized);
      const kstDate = kst
        ? `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`
        : '(파싱 실패)';

      debug.posts.push({ logNo: post.logNo, title: post.title, pubDate: normalized, kstDate });

      if (!kst) continue;
      const postTs = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate());

      if (postTs === targetTs) {
        matched.push({ title: post.title, logNo: post.logNo, pubDate: new Date(normalized).toISOString() });
        allOlderThanTarget = false;
      } else if (postTs > targetTs) {
        allOlderThanTarget = false;
      }
    }

    if (allOlderThanTarget) break;
  }

  return { items: matched, debug };
}

// ── 포스트 상세 크롤링 ─────────────────────────────────────────────────────────

interface PostDetail {
  draftRaw: string;  // Draft.js raw JSON (텍스트 + 이미지 atomic block 포함)
  firstImageUrl: string;  // 썸네일용 첫 번째 이미지 URL
  _debug?: { htmlLen: number; method: string };
}

interface InlineRange { offset: number; length: number; style: string }

type ContentPart =
  | { type: 'text'; value: string; align?: string; inlineStyleRanges: InlineRange[] }
  | { type: 'heading'; value: string; level: 1 | 2 | 3 }
  | { type: 'image'; src: string };

/** HTML 엔티티 완전 디코드 */
function fullDecode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#034;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** 3자리 hex → 6자리, rgb(r,g,b) → hex */
function normalizeColor(raw: string): string {
  const s = raw.trim().toUpperCase();
  if (s.startsWith('#')) {
    return s.length === 4
      ? '#' + s[1]+s[1]+s[2]+s[2]+s[3]+s[3]
      : s;
  }
  const rgb = /RGB\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/.exec(s);
  if (rgb) {
    return '#' + [rgb[1], rgb[2], rgb[3]]
      .map(n => parseInt(n).toString(16).padStart(2, '0').toUpperCase())
      .join('');
  }
  return '';
}

/**
 * 단락 innerHtml에서 텍스트와 Draft.js inlineStyleRanges를 추출한다.
 * bold, italic, underline, color 지원
 */
function parseInlineStyles(innerHtml: string): { text: string; inlineStyleRanges: InlineRange[] } {
  const ranges: InlineRange[] = [];
  let text = '';

  // 태그 / 텍스트 노드를 순서대로 처리
  const tokenRe = /(<\/[^>]+>)|(<[^>]+>)|([^<]+)/g;
  // 스타일 스택: 각 열린 태그마다 현재 적용 중인 스타일 목록을 push
  const styleStack: string[][] = [[]];
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(innerHtml)) !== null) {
    if (m[3]) {
      // 텍스트 노드
      const decoded = fullDecode(m[3]);
      if (decoded) {
        const offset = text.length;
        text += decoded;
        const currentStyles = styleStack[styleStack.length - 1] ?? [];
        for (const style of currentStyles) {
          ranges.push({ offset, length: decoded.length, style });
        }
      }
    } else if (m[1]) {
      // 닫는 태그
      if (styleStack.length > 1) styleStack.pop();
    } else if (m[2]) {
      // 여는 태그 (self-closing 제외)
      const tag = m[2];
      if (tag.endsWith('/>')) {
        styleStack.push([...(styleStack[styleStack.length - 1] ?? [])]);
        continue;
      }
      const parent = styleStack[styleStack.length - 1] ?? [];
      const styles = [...parent];

      // BOLD
      if (/font-weight\s*:\s*bold/i.test(tag) || /^<(?:strong|b)[\s>]/i.test(tag)) {
        if (!styles.includes('BOLD')) styles.push('BOLD');
      }
      // ITALIC
      if (/font-style\s*:\s*italic/i.test(tag) || /^<(?:em|i)[\s>]/i.test(tag)) {
        if (!styles.includes('ITALIC')) styles.push('ITALIC');
      }
      // UNDERLINE
      if (/text-decoration\s*:[^;'"]*underline/i.test(tag)) {
        if (!styles.includes('UNDERLINE')) styles.push('UNDERLINE');
      }
      // COLOR
      const colorM = /color\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))/i.exec(tag);
      if (colorM) {
        const hex = normalizeColor(colorM[1]);
        if (hex) {
          const colorStyle = `COLOR_${hex.replace('#', '')}`;
          if (!styles.some(s => s.startsWith('COLOR_'))) styles.push(colorStyle);
        }
      }

      styleStack.push(styles);
    }
  }

  return { text: text.replace(/\s{2,}/g, ' ').trim(), inlineStyleRanges: ranges };
}

/**
 * se-main-container 안에서 헤딩/텍스트/이미지를 HTML 순서대로 추출한다.
 */
function extractStructured(html: string): { parts: ContentPart[]; method: string } {
  const containerRe = /class=["'][^"']*se-main-container[^"']*["']/;
  const containerM = containerRe.exec(html);
  if (!containerM) return { parts: [], method: 'none' };

  const divStart = html.lastIndexOf('<div', containerM.index);
  const chunk = html.slice(divStart, divStart + 200000);

  interface Hit { index: number; part: ContentPart }
  const hits: Hit[] = [];
  let m: RegExpExecArray | null;

  // ── 이미지: data-lazy-src
  const imgRe = /data-lazy-src=["'](https?:\/\/(?:postfiles|blogfiles)\.pstatic\.net[^"']+)["']/g;
  while ((m = imgRe.exec(chunk)) !== null) {
    const src = fullDecode(m[1]);
    if (src.includes('_blur') || src.includes('type=s') || src.includes('type=f')) continue;
    hits.push({ index: m.index, part: { type: 'image', src } });
  }

  // ── 헤딩: se-heading 계열
  const headingRe = /class=["'][^"']*se-heading(\d)?[^"']*["'][^>]*>([\s\S]*?)<\/(?:h[1-6]|p|div|span)>/g;
  while ((m = headingRe.exec(chunk)) !== null) {
    const level = Math.min(3, Math.max(1, parseInt(m[1] ?? '2', 10))) as 1 | 2 | 3;
    const raw = m[2].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    const text = fullDecode(raw).replace(/\s{2,}/g, ' ').trim();
    if (text) hits.push({ index: m.index, part: { type: 'heading', value: text, level } });
  }

  // ── 텍스트: se-text-paragraph — <p> 태그 기준으로 매칭 (중첩 div 오동작 방지)
  const textRe = /(<p[^>]*class=["'][^"']*se-text-paragraph[^"']*["'][^>]*>)([\s\S]*?)<\/p>/g;
  while ((m = textRe.exec(chunk)) !== null) {
    const openTag = m[1];
    const inner = m[2];

    // text-align: 태그 자체 style 또는 class 이름(se-text-paragraph--align-center 등)
    const alignFromStyle = /text-align\s*:\s*(center|right|left)/i.exec(openTag);
    const alignFromClass = /--align-(center|right|left)/.exec(openTag);
    const align = (alignFromStyle?.[1] ?? alignFromClass?.[1]) || undefined;

    const { text, inlineStyleRanges } = parseInlineStyles(inner);
    if (text && !isBoilerplate(text)) hits.push({ index: m.index, part: { type: 'text', value: text, align, inlineStyleRanges } });
  }

  hits.sort((a, b) => a.index - b.index);

  const parts: ContentPart[] = [];
  for (const hit of hits) {
    const last = parts[parts.length - 1];
    if (hit.part.type === 'image' && last?.type === 'image' && last.src === hit.part.src) continue;
    parts.push(hit.part);
  }

  return { parts, method: parts.length > 0 ? 'structured' : 'none' };
}

const HEADING_TYPE: Record<number, string> = { 1: 'header-one', 2: 'header-two', 3: 'header-three' };

/** ContentPart[] → Draft.js raw JSON 문자열 */
function partsToDraftRaw(parts: ContentPart[]): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocks: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entityMap: Record<number, any> = {};
  let entityIdx = 0;

  for (const part of parts) {
    if (part.type === 'image') {
      const key = entityIdx++;
      entityMap[key] = { type: 'IMAGE', mutability: 'IMMUTABLE', data: { src: part.src } };
      blocks.push({
        key: Math.random().toString(36).slice(2, 9),
        text: ' ',
        type: 'atomic',
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [{ offset: 0, length: 1, key }],
        data: {},
      });
    } else if (part.type === 'heading') {
      blocks.push({
        key: Math.random().toString(36).slice(2, 9),
        text: part.value,
        type: HEADING_TYPE[part.level] ?? 'header-two',
        depth: 0,
        inlineStyleRanges: [],
        entityRanges: [],
        data: {},
      });
    } else {
      const hasAnyColor = part.inlineStyleRanges.some((r) => r.style.startsWith('COLOR_'));
      // COLOR 스타일은 제거 (blockquote 또는 orange heading으로 대체)
      const baseRanges = part.inlineStyleRanges.filter((r) => !r.style.startsWith('COLOR_'));

      if (isLocationIntro(part.value)) {
        // 현장 소개 문구 → header-two + 오렌지 컬러 (인천 디자인휀스 시공 스타일)
        const orangeRange: InlineRange = { offset: 0, length: part.value.length, style: 'COLOR_F97316' };
        blocks.push({
          key: Math.random().toString(36).slice(2, 9),
          text: part.value,
          type: 'header-two',
          depth: 0,
          inlineStyleRanges: [...baseRanges, orangeRange],
          entityRanges: [],
          data: { 'text-align': 'center' },
        });
      } else {
        // 색상이 있던 줄 → blockquote (오렌지 바)
        blocks.push({
          key: Math.random().toString(36).slice(2, 9),
          text: part.value,
          type: hasAnyColor ? 'blockquote' : 'unstyled',
          depth: 0,
          inlineStyleRanges: baseRanges,
          entityRanges: [],
          data: { 'text-align': 'center' },
        });
      }
    }
  }

  if (blocks.length === 0) {
    blocks.push({ key: 'empty', text: '', type: 'unstyled', depth: 0, inlineStyleRanges: [], entityRanges: [], data: {} });
  }

  return JSON.stringify({ blocks, entityMap });
}

// ── 제목 정리 ─────────────────────────────────────────────────────────────────

function cleanTitle(title: string): string {
  return title
    .replace(/^[\[<【〈\(]\s*시공\s*사례\s*[\]>】〉\)]\s*/i, '')
    .replace(/^\s*<시공사례>\s*/i, '')
    .trim();
}

// ── 현장 소개 문구 → blockquote 변환 패턴 ────────────────────────────────────

const LOCATION_INTRO_PATTERNS: RegExp[] = [
  /에\s*위치한/,          // "화성에 위치한 전원주택입니다."
  /시공\s*전\s*모습/,     // "시공 전 모습입니다."
  /시공\s*후\s*모습/,     // "시공 후 모습입니다."
  /현장\s*입니다/,        // "이번 현장입니다."
  /오늘\s*소개/,          // "오늘 소개드릴"
];

function isLocationIntro(text: string): boolean {
  return LOCATION_INTRO_PATTERNS.some((re) => re.test(text));
}

// ── 상투적 보일러플레이트 필터 ─────────────────────────────────────────────────

const BOILERPLATE_PATTERNS: RegExp[] = [
  // 인사 / 소개
  /안녕하세요/,
  /난간닥터\s*김사부["""]?\s*(입니다|대표)/,
  /휀스.*난간.*대문.*데크/,
  /금속구조물\s*전문/,
  /제작\s*[&＆]\s*시공/,
  /꼼꼼한\s*형제들/,
  /소개드릴\s*현장/,
  // 마무리 광고
  /고객만족을\s*위해/,
  /고객님의\s*공간을\s*안전/,
  /품격있게\s*만들어/,
  /만족스러운\s*결과를\s*원하신다면/,
  /언제나\s*어디서나\s*김사부/,
  /김사부를\s*찾아주세요/,
  /감사합니다\s*\^{1,2}/,
  /010[\s\-.]?\d{4}[\s\-.]?\d{4}/,  // 전화번호
  /태그\s*취소/,
  /공감\s*\d+/,
  /댓글\s*쓰기/,
  /이 글에\s*공감한/,
  /블로그\s*열고\s*닫기/,
];

function isBoilerplate(text: string): boolean {
  return BOILERPLATE_PATTERNS.some((re) => re.test(text));
}

async function fetchPostDetail(logNo: string): Promise<PostDetail> {
  const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const url = `https://blog.naver.com/PostView.naver?blogId=${BLOG_ID}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true`;

  const res = await fetch(url, {
    headers: { 'User-Agent': UA_DESKTOP, Referer: 'https://blog.naver.com/' },
    cache: 'no-store',
  });
  if (!res.ok) return { draftRaw: partsToDraftRaw([]), firstImageUrl: '', _debug: { htmlLen: 0, method: `http${res.status}` } };

  const html = await res.text();
  const { parts, method } = extractStructured(html);

  const firstImageUrl = (parts.find((p) => p.type === 'image') as { type: 'image'; src: string } | undefined)?.src ?? '';
  const draftRaw = partsToDraftRaw(parts);

  return { draftRaw, firstImageUrl, _debug: { htmlLen: html.length, method } };
}

// ── 이미지 → base64 ───────────────────────────────────────────────────────────

async function imageToBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { Referer: 'https://blog.naver.com/', 'User-Agent': UA_MOBILE },
    });
    if (!res.ok) return '';
    const buf = await res.arrayBuffer();
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return '';
  }
}

// ── POST 핸들러 ────────────────────────────────────────────────────────────────

export interface CrawlResult {
  title: string;
  success: boolean;
  error?: string;
  _debug?: { htmlLen: number; method: string };
}

export async function POST(req: NextRequest) {
  try {
    const { date } = (await req.json()) as { date: string };
    const [yyyy, mm, dd] = date.split('-').map(Number);
    if (!yyyy || !mm || !dd) {
      return NextResponse.json({ success: false, error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    // 1차: RSS
    let posts = await fetchFromRSS(yyyy, mm, dd);
    let source = 'rss';
    let scrapeDebug: ScrapeDebug | null = null;

    // 2차: 페이지 순회 (RSS에 없을 때)
    if (posts.length === 0) {
      const result = await fetchFromNaverBlogApi(yyyy, mm, dd);
      posts = result.items;
      scrapeDebug = result.debug;
      source = 'page';
    }

    if (posts.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        total: 0,
        results: [],
        source,
        message: `RSS 및 블로그 목록 페이지 탐색 결과 ${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')} 날짜의 포스트를 찾지 못했습니다.`,
        scrapeDebug,
      });
    }

    const results: CrawlResult[] = [];

    for (const item of posts) {
      try {
        const { data: existing } = await supabase
          .from('works')
          .select('id')
          .eq('title', item.title)
          .maybeSingle();

        if (existing) {
          results.push({ title: item.title, success: false, error: '이미 등록된 포스트' });
          continue;
        }

        const { draftRaw, firstImageUrl, _debug } = await fetchPostDetail(item.logNo);
        const thumbnail = firstImageUrl ? await imageToBase64(firstImageUrl) : '';
        const cleanedTitle = cleanTitle(item.title);
        const category = detectCategory(cleanedTitle);

        const { error } = await supabase.from('works').insert({
          id: uuidv4(),
          title: cleanedTitle,
          category,
          summary: '',
          content: draftRaw,
          thumbnail,
          created_at: item.pubDate,
          updated_at: item.pubDate,
        });

        if (error) throw new Error(error.message);
        results.push({ title: item.title, success: true, _debug });
      } catch (e) {
        results.push({ title: item.title, success: false, error: String(e) });
      }
    }

    revalidatePath('/api/works');
    revalidatePath('/works');
    revalidatePath('/');

    const imported = results.filter((r) => r.success).length;
    return NextResponse.json({ success: true, imported, total: posts.length, results, source });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
