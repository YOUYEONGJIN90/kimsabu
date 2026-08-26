# 김사부 (k-sabu.com)

난간·휀스·대문·데크·금속구조물 제작/시공 업체 **난간닥터 김사부**의 홈페이지입니다.
시공사례 게시판, 문의 폼, 관리자 화면으로 구성되며 네이버 블로그의 시공사례 글을 매일 자동으로 가져옵니다.

- 운영 URL: https://k-sabu.com
- 네이버 블로그: https://blog.naver.com/k_sabu

## 기술 스택

- Next.js 16 (App Router) / React 18 / TypeScript
- Tailwind CSS 3
- Supabase (PostgreSQL) — `works`, `inquiries` 테이블
- Draft.js — 시공사례 본문 에디터 (본문은 Draft.js raw JSON으로 저장)
- Vercel — 호스팅 + Cron

## 시작하기

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run start
```

`.env.local` 에 아래 환경변수가 필요합니다.

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `CRON_SECRET` | Vercel Cron 요청 검증용 시크릿. **Vercel 환경변수에도 반드시 설정**해야 함 (미설정 시 크론이 항상 401로 거부됨) |
| `NEXT_PUBLIC_BASE_URL` | (선택) 크론이 내부 API를 호출할 때 쓰는 베이스 URL. 미설정 시 요청 호스트 사용 |

> `package.json`의 `works:*` 스크립트(`scripts/*.mjs`)는 과거 데이터 마이그레이션용이며 현재 저장소에는 파일이 없습니다.

## 디렉터리 구조

```
app/
  page.tsx                    메인
  works/                      시공사례 목록 / 상세
  contact/                    문의 폼
  admin/                      관리자 (시공사례 관리, 등록/수정, 블로그 불러오기, 문의 확인)
  api/
    works/                    시공사례 CRUD
    contact/                  문의 저장 (inquiries)
    blog-crawl/               네이버 블로그 → 시공사례 가져오기 (POST { date })
    cron/blog-crawl/          Vercel Cron 진입점 (GET, CRON_SECRET 필요)
    thumbnails/[id]/          base64 썸네일 → 이미지 응답
    img-proxy/                네이버 이미지 프록시 (pstatic.net 도메인만 허용)
    revalidate/               ISR 캐시 무효화
  sitemap.ts
components/
  DraftEditor.tsx             Draft.js 기반 에디터
  Navbar / Footer / WorkCard
lib/
  supabase.ts                 Supabase 클라이언트
  types.ts                    WorkPost, WorkCategory, 카테고리 라벨
  storage.ts
vercel.json                   Cron 스케줄
```

## 네이버 블로그 자동 수집 (Cron)

### 동작 흐름

1. `vercel.json` 의 스케줄 `0 16 * * *` (UTC) = **매일 01:00 KST** 에 Vercel이 `GET /api/cron/blog-crawl` 호출
2. 크론 라우트가 `Authorization: Bearer <CRON_SECRET>` 을 검증한 뒤, **전날(D-1, KST) 날짜**로 `POST /api/blog-crawl` 호출
3. `blog-crawl` 이 해당 날짜에 올라온 블로그 글을 찾아 `works` 테이블에 등록

### 글 찾는 방법 (`app/api/blog-crawl/route.ts`)

| 순서 | 소스 | 비고 |
|---|---|---|
| 1차 | RSS `https://rss.blog.naver.com/k_sabu.xml` | 정확한 발행 시각(`pubDate`) 사용. 링크는 `…/k_sabu/{logNo}?fromRss=true…` 형식이라 쿼리스트링을 허용해 logNo 추출 |
| 2차 | `PostTitleListAsync.naver` 페이지 API | RSS에서 못 찾을 때 폴백. **24시간 이내 글은 `addDate`가 `"8시간 전"` 같은 상대 시간으로 오므로** `normalizeNaverAddDate()` 가 현재 시각 기준으로 역산 |

### 등록 규칙

- **제목에 `시공사례` 가 포함된 글만 등록** (`isWorkCasePost`). 정보성/홍보 글은 결과에 `"시공사례 글이 아님 (건너뜀)"` 으로 표시되고 저장되지 않음
- 제목 앞의 `<시공사례>` / `[시공사례]` 접두어는 `cleanTitle()` 로 제거 후 저장
- 중복 여부는 **정리된 제목**으로 `works.title` 을 조회해 판단
- 카테고리는 제목 키워드로 자동 감지 (`detectCategory`: 난간→railing, 대문→gate, 데크→deck, 휀스/펜스→fence, 금속/철제/구조물/스틸/알루미늄→metal, 기본 fence)
- 본문은 `se-main-container` 에서 헤딩/문단/이미지를 순서대로 추출해 Draft.js raw JSON으로 변환. 인사말·전화번호 등 상투 문구는 `BOILERPLATE_PATTERNS` 로 제거
- 첫 번째 이미지를 base64 로 인코딩해 썸네일로 저장

### 수동 실행 / 문제 확인

- 관리자 화면(`/admin`) → "블로그 불러오기" 에서 날짜를 지정해 수동 실행할 수 있습니다. 응답의 `message`, `results[].error`, `scrapeDebug` 로 원인을 확인할 수 있습니다.
- 크론 라우트를 직접 호출해 보려면:
  ```bash
  curl -H "Authorization: Bearer $CRON_SECRET" https://k-sabu.com/api/cron/blog-crawl
  ```
  (응답 `401` 이면 Vercel 의 `CRON_SECRET` 미설정 또는 불일치)
- 응답의 `source` 가 `rss` 면 1차 경로, `page` 면 폴백 경로로 찾은 것입니다.

### 알려진 제약

- 네이버가 RSS 링크 형식이나 `addDate` 형식을 바꾸면 수집이 멈출 수 있습니다. 위 "수동 실행"으로 `scrapeDebug.posts[].kstDate` 가 `(파싱 실패)` 인지 확인하세요.
- Vercel Hobby 플랜은 크론이 하루 1회, 예정 시각에서 다소 지연되어 실행될 수 있습니다.
