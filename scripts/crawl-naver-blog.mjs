/**
 * 네이버 블로그 시공사례 크롤러
 * 블로그: https://blog.naver.com/k_sabu
 *
 * 실행: node scripts/crawl-naver-blog.mjs
 * 테스트: node scripts/crawl-naver-blog.mjs --test (3개만 처리)
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

/** logNo → 결정론적 UUID (재실행 시 중복 방지) */
function logNoToUuid(logNo) {
  const hash = createHash('sha1').update(`naver-blog-k_sabu-${logNo}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16), // version 5
    (parseInt(hash.substring(16, 17), 16) & 0x3 | 0x8).toString(16) + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

// ── 설정 ──────────────────────────────────────────────────────────────────────
const BLOG_ID = 'k_sabu';
const SUPABASE_URL = 'https://ukdbqbenpajmywufodjf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JNyBHxUJ81gK1AR07jRDmQ_KZXxXjs4';
const IS_TEST = process.argv.includes('--test');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── 카테고리 분류 키워드 ───────────────────────────────────────────────────────
const CATEGORY_KEYWORDS = {
  fence:   ['휀스', '펜스', 'fence', '울타리', '철망', '방음', '차단망', '그물망', '루버'],
  railing: ['난간', 'railing', '핸드레일', '계단난간', '발코니난간', '테라스난간', '옥상난간', '안전난간'],
  gate:    ['대문', '게이트', 'gate', '출입문', '현관문', '철문', '자동문', '셔터', '쪽문', '단조대문'],
  deck:    ['데크', 'deck', '목재', '합성목재', '루프탑', '테라스', '마루', 'wpc'],
  metal:   ['금속', '철재', '스테인리스', '알루미늄', '강철', '각관', '파이프', '구조물', '지붕', '계단', '보행교', '조형물', '캐노피', '차양'],
};

/** 제목 텍스트로 카테고리 추론 */
function guessCategory(title) {
  const text = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) return cat;
    }
  }
  // 기본값: metal
  return 'metal';
}

/** HTML entity 디코딩 */
function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

/** 제목 정제: <시공사례> 등 접두어 제거 */
function cleanTitle(title) {
  return title
    .replace(/^<[^>]+>\s*/g, '')   // <시공사례> 제거
    .replace(/^\[[^\]]+\]\s*/g, '') // [시공사례] 제거
    .replace(/^【[^】]+】\s*/g, '') // 【시공사례】 제거
    .trim();
}

// ── HTTP 유틸 ──────────────────────────────────────────────────────────────────
const COMMON_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
};

async function fetchHtml(url, extraHeaders = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          ...COMMON_HEADERS,
          'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
          ...extraHeaders,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(2000 * attempt);
    }
  }
}

/** 이미지 URL → base64 data URL */
async function imageToBase64(imgUrl, refererLogNo) {
  if (!imgUrl) return '';
  try {
    const res = await fetch(imgUrl, {
      headers: {
        ...COMMON_HEADERS,
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': `https://blog.naver.com/${BLOG_ID}/${refererLogNo}`,
      },
    });
    if (!res.ok) return '';
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 100) return ''; // 너무 작은 파일 무시
    const ct = res.headers.get('content-type') || 'image/jpeg';
    const mime = ct.split(';')[0].trim();
    return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
  } catch {
    return '';
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 네이버 블로그 크롤링 ────────────────────────────────────────────────────────

/** 포스트 목록 페이지에서 logNo 수집 */
async function collectLogNos() {
  const allLogNos = new Set();
  const seenOnLastPage = new Set(); // 마지막 페이지 반복 감지

  for (let page = 1; page <= 50; page++) {
    const url = `https://blog.naver.com/PostList.naver?blogId=${BLOG_ID}&currentPage=${page}&postListType=blogId&blogType=post&categoryNo=0`;
    process.stdout.write(`  페이지 ${page} 조회 중... `);

    let html;
    try {
      html = await fetchHtml(url, { 'Referer': 'https://blog.naver.com/' });
    } catch (e) {
      console.log(`오류: ${e.message}`);
      break;
    }

    // logNo 추출 (12자리 숫자)
    const pageLogNos = new Set([
      ...[...html.matchAll(/logNo[":\s]*["']?(\d{10,12})/g)].map(m => m[1]),
      ...[...html.matchAll(new RegExp(`/${BLOG_ID}/(\\d{10,12})`, 'g'))].map(m => m[1]),
    ]);

    console.log(`${pageLogNos.size}개 발견`);

    if (pageLogNos.size === 0) break;

    // 이전 마지막 페이지와 동일한지 확인 (페이지 끝 감지)
    if (page > 1) {
      const overlap = [...pageLogNos].filter(n => seenOnLastPage.has(n));
      if (overlap.length === pageLogNos.size) {
        console.log('  → 마지막 페이지 도달');
        break;
      }
    }

    pageLogNos.forEach(n => {
      allLogNos.add(n);
      seenOnLastPage.add(n);
    });
    if (page > 1) seenOnLastPage.clear();
    pageLogNos.forEach(n => seenOnLastPage.add(n));

    await sleep(800);
  }

  return [...allLogNos];
}

/** 개별 포스트 데이터 추출 */
async function fetchPostData(logNo) {
  const url = `https://blog.naver.com/PostView.naver?blogId=${BLOG_ID}&logNo=${logNo}&redirect=Dlog`;

  let html;
  try {
    html = await fetchHtml(url, { 'Referer': `https://blog.naver.com/${BLOG_ID}` });
  } catch (e) {
    return null;
  }

  // 제목
  const rawTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/)?.[1];
  if (!rawTitle) return null;
  const title = cleanTitle(decodeHtmlEntities(rawTitle));
  if (!title) return null;

  // 날짜
  let createdAt = new Date().toISOString();
  const dateMatch = html.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (dateMatch) {
    try {
      const [, y, m, d] = dateMatch;
      createdAt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00+09:00`).toISOString();
    } catch {}
  }

  // 이미지 URL 선택 (첫 번째 postfiles URL + ?type=w966)
  const postfilesUrls = [...new Set(
    [...html.matchAll(/https?:\/\/postfiles\.pstatic\.net\/[^"'\s<>)]+/g)]
      .map(m => m[0].split('?')[0]) // type 파라미터 제거
  )];
  const thumbnailUrl = postfilesUrls.length > 0
    ? `${postfilesUrls[0]}?type=w966`
    : html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)?.[1] ?? '';

  // 포스트 텍스트 내용 (요약)
  const rawDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/)?.[1] ?? '';
  const desc = decodeHtmlEntities(rawDesc);
  // og:description이 항상 같은 일반 문구면 비워둠
  const genericIntro = '안녕하세요';
  const summary = desc.startsWith(genericIntro) ? '' : desc.substring(0, 100);

  return { logNo, title, createdAt, thumbnailUrl, summary };
}

// ── Supabase 삽입 ──────────────────────────────────────────────────────────────
async function insertWork({ logNo, title, category, summary, thumbnail, createdAt }) {
  const { error } = await supabase.from('works').upsert({
    id: logNoToUuid(logNo),
    title,
    category,
    summary: summary || '',
    content: '',
    thumbnail: thumbnail || '',
    created_at: createdAt,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`    DB 삽입 오류:`, error.message);
    return false;
  }
  return true;
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
async function main() {
  const CATEGORY_KO = { fence: '휀스', railing: '난간', gate: '대문', deck: '데크', metal: '금속구조물' };

  console.log('='.repeat(60));
  console.log(` 네이버 블로그 크롤러${IS_TEST ? ' [테스트 모드]' : ''}`);
  console.log(` 대상: https://blog.naver.com/${BLOG_ID}`);
  console.log('='.repeat(60));

  // 1. 포스트 logNo 전체 수집
  console.log('\n[1단계] 포스트 목록 수집');
  let logNos = await collectLogNos();

  if (logNos.length === 0) {
    console.error('\n포스트를 찾을 수 없습니다.');
    process.exit(1);
  }

  console.log(`\n총 ${logNos.length}개 포스트 발견`);
  if (IS_TEST) {
    logNos = logNos.slice(0, 3);
    console.log(`테스트 모드: ${logNos.length}개만 처리`);
  }

  // 2. 각 포스트 상세 데이터 수집
  console.log('\n[2단계] 포스트 상세 정보 및 이미지 수집');
  const results = [];
  let skipCount = 0;

  for (let i = 0; i < logNos.length; i++) {
    const logNo = logNos[i];
    process.stdout.write(`\n  [${i + 1}/${logNos.length}] logNo=${logNo} `);

    const post = await fetchPostData(logNo);
    if (!post) {
      console.log('→ 제목 추출 실패, 건너뜀');
      skipCount++;
      await sleep(500);
      continue;
    }

    const category = guessCategory(post.title);
    process.stdout.write(`\n    제목: ${post.title}`);
    process.stdout.write(`\n    카테고리: ${CATEGORY_KO[category]}`);
    process.stdout.write(`\n    날짜: ${post.createdAt.substring(0, 10)}`);

    // 이미지 다운로드
    process.stdout.write(`\n    이미지 다운로드 중...`);
    const thumbnail = await imageToBase64(post.thumbnailUrl, logNo);
    const thumbSize = thumbnail ? Math.round(thumbnail.length / 1024) + 'KB' : '없음';
    process.stdout.write(` ${thumbSize}`);

    results.push({ ...post, category, thumbnail });
    await sleep(1200); // 요청 간격
  }

  console.log(`\n\n수집 완료: ${results.length}개 (건너뜀: ${skipCount}개)`);

  // 3. Supabase 삽입
  console.log('\n[3단계] Supabase DB 삽입');
  let okCount = 0;

  for (const post of results) {
    process.stdout.write(`\n  "${post.title}" → `);
    const ok = await insertWork(post);
    if (ok) {
      console.log(`✓ (${CATEGORY_KO[post.category]})`);
      okCount++;
    }
    await sleep(200);
  }

  // 4. 결과 요약
  console.log('\n' + '='.repeat(60));
  console.log(` 완료: ${okCount}/${results.length}개 삽입 성공`);
  console.log('='.repeat(60));

  const stats = {};
  for (const p of results) stats[p.category] = (stats[p.category] || 0) + 1;
  console.log('\n카테고리별 삽입 건수:');
  for (const [cat, count] of Object.entries(stats)) {
    console.log(`  ${CATEGORY_KO[cat] || cat}: ${count}개`);
  }
}

main().catch((e) => {
  console.error('\n치명적 오류:', e);
  process.exit(1);
});
