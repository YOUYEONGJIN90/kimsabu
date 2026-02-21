/**
 * 네이버 블로그 시공사례 콘텐츠(본문 글+이미지) 업데이트
 * 실행: node scripts/update-content.mjs
 * 테스트: node scripts/update-content.mjs --test (3개만)
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const BLOG_ID = 'k_sabu';
const SUPABASE_URL = 'https://ukdbqbenpajmywufodjf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JNyBHxUJ81gK1AR07jRDmQ_KZXxXjs4';
const IS_TEST = process.argv.includes('--test');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,*/*',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/** logNo → 결정론적 UUID (crawl 스크립트와 동일) */
function logNoToUuid(logNo) {
  const hash = createHash('sha1').update(`naver-blog-k_sabu-${logNo}`).digest('hex');
  return [
    hash.substring(0, 8),
    hash.substring(8, 12),
    '5' + hash.substring(13, 16),
    (parseInt(hash.substring(16, 17), 16) & 0x3 | 0x8).toString(16) + hash.substring(17, 20),
    hash.substring(20, 32),
  ].join('-');
}

/** HTML entity 디코딩 */
function decodeHtml(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .trim();
}

/** span 태그 내 텍스트 추출 */
function extractSpanText(html) {
  return decodeHtml(
    html
      .replace(/<[^>]+>/g, '') // 모든 태그 제거
      .replace(/\s+/g, ' ')
  ).trim();
}

/** 짧고 의미없는 텍스트 필터 (공백, 이모지 등) */
function isMeaningful(text) {
  const cleaned = text.replace(/[\s\u200b\u00a0​]+/g, '');
  return cleaned.length > 1;
}

/**
 * 블로그 포스트 HTML에서 Draft.js raw JSON 생성
 * - se-component se-text: 텍스트 블록
 * - se-component se-image: 이미지 블록 (URL 저장, base64 아님)
 */
function parseContentToDraftJs(html) {
  const blocks = [];
  const entityMap = {};
  let entityKey = 0;

  // se-main-container 영역만 추출
  const mainMatch = html.match(/se-main-container">([\s\S]*?)(?:<\/div>\s*<div[^>]*class="[^"]*se-doc-footer|$)/);
  const mainHtml = mainMatch ? mainMatch[1] : html;

  // se-component 블록들을 순서대로 찾기
  const componentPattern = /<div class="se-component (se-text|se-image)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<script[^>]*class="__se_module_data"/g;
  let match;

  while ((match = componentPattern.exec(mainHtml)) !== null) {
    const componentType = match[1]; // 'se-text' or 'se-image'
    const componentHtml = match[2];

    if (componentType === 'se-text') {
      // 텍스트 블록: se-text-paragraph 각각 추출
      const paraPattern = /<p class="se-text-paragraph[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
      let para;
      while ((para = paraPattern.exec(componentHtml)) !== null) {
        const text = extractSpanText(para[1]);
        if (isMeaningful(text)) {
          blocks.push({
            key: `blk${blocks.length}`,
            text,
            type: 'unstyled',
            depth: 0,
            inlineStyleRanges: [],
            entityRanges: [],
            data: {},
          });
        }
      }
    } else if (componentType === 'se-image') {
      // 이미지 블록: data-lazy-src 에서 URL 추출 (w966 크기)
      const lazySrc = componentHtml.match(/data-lazy-src="([^"]+)"/)?.[1];
      const imgSrc = componentHtml.match(/src="(https:\/\/postfiles[^"]+)"/)?.[1]?.split('?')[0];

      // w966 URL 우선, 없으면 기본 URL
      let finalSrc = '';
      if (lazySrc) {
        finalSrc = lazySrc.includes('type=w966') ? lazySrc : lazySrc.split('?')[0] + '?type=w966';
      } else if (imgSrc) {
        finalSrc = imgSrc + '?type=w966';
      }

      if (finalSrc) {
        const key = entityKey++;
        entityMap[key] = {
          type: 'IMAGE',
          mutability: 'IMMUTABLE',
          data: { src: finalSrc },
        };
        blocks.push({
          key: `blk${blocks.length}`,
          text: ' ',
          type: 'atomic',
          depth: 0,
          inlineStyleRanges: [],
          entityRanges: [{ key, offset: 0, length: 1 }],
          data: {},
        });
      }
    }
  }

  if (blocks.length === 0) return '';
  return JSON.stringify({ blocks, entityMap });
}

/** 블로그 포스트 목록에서 logNo 수집 */
async function collectLogNos() {
  const allLogNos = new Set();
  let prevPageLogNos = new Set();

  for (let page = 1; page <= 50; page++) {
    const url = `https://blog.naver.com/PostList.naver?blogId=${BLOG_ID}&currentPage=${page}&postListType=blogId&blogType=post&categoryNo=0`;
    const html = await fetch(url, { headers: HEADERS }).then(r => r.text());
    const logNos = new Set([
      ...[...html.matchAll(/logNo[":\s]*["']?(\d{10,12})/g)].map(m => m[1]),
      ...[...html.matchAll(new RegExp(`/${BLOG_ID}/(\\d{10,12})`, 'g'))].map(m => m[1]),
    ]);
    if (logNos.size === 0) break;
    const overlap = [...logNos].filter(n => prevPageLogNos.has(n));
    if (page > 1 && overlap.length === logNos.size) break;
    logNos.forEach(n => allLogNos.add(n));
    prevPageLogNos = logNos;
    await sleep(700);
  }

  return [...allLogNos];
}

async function main() {
  console.log('='.repeat(60));
  console.log(` 콘텐츠 업데이트${IS_TEST ? ' [테스트 3개]' : ''}`);
  console.log('='.repeat(60));

  // 1. logNo 목록 수집
  console.log('\n[1단계] 포스트 목록 수집...');
  let logNos = await collectLogNos();
  console.log(`총 ${logNos.length}개 포스트 발견`);

  if (IS_TEST) logNos = logNos.slice(0, 3);

  // 2. 각 포스트 콘텐츠 파싱 + DB 업데이트
  console.log('\n[2단계] 콘텐츠 파싱 및 DB 업데이트');
  let okCount = 0;
  let skipCount = 0;

  for (let i = 0; i < logNos.length; i++) {
    const logNo = logNos[i];
    const id = logNoToUuid(logNo);

    process.stdout.write(`\n  [${i + 1}/${logNos.length}] ${logNo} `);

    // HTML 가져오기
    let html;
    try {
      html = await fetch(
        `https://blog.naver.com/PostView.naver?blogId=${BLOG_ID}&logNo=${logNo}&redirect=Dlog`,
        { headers: { ...HEADERS, Referer: `https://blog.naver.com/${BLOG_ID}` } }
      ).then(r => r.text());
    } catch (e) {
      console.log(`→ fetch 실패: ${e.message}`);
      skipCount++;
      continue;
    }

    // Draft.js JSON 생성
    const content = parseContentToDraftJs(html);
    if (!content) {
      console.log('→ 콘텐츠 없음, 건너뜀');
      skipCount++;
      await sleep(800);
      continue;
    }

    // 블록 수 카운트
    const parsed = JSON.parse(content);
    const textCount = parsed.blocks.filter(b => b.type !== 'atomic').length;
    const imgCount = parsed.blocks.filter(b => b.type === 'atomic').length;

    // DB 업데이트
    const { error } = await supabase
      .from('works')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.log(`→ DB 오류: ${error.message}`);
      skipCount++;
    } else {
      console.log(`→ ✓ (텍스트 ${textCount}개, 이미지 ${imgCount}개)`);
      okCount++;
    }

    await sleep(1000);
  }

  // 3. 결과
  console.log('\n\n' + '='.repeat(60));
  console.log(` 완료: ${okCount}개 성공 / ${skipCount}개 건너뜀`);
  console.log('='.repeat(60));

  // revalidate
  try {
    await fetch('http://localhost:3000/api/revalidate', { method: 'POST' });
    console.log('캐시 갱신 완료');
  } catch {}
}

main().catch(e => { console.error(e); process.exit(1); });
