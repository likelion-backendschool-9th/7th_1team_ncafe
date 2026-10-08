# BLUEPRINT — Frontend (경마장 컨셉 카페)

> 원본 요구사항: [frontend-지시서.md](frontend-지시서.md)
> 이 문서는 지시서를 **구현 가능한 설계도**로 옮긴 것이다. 구현 중 판단이 필요할 때 이 문서를 기준으로 삼고, 설계가 바뀌면 이 문서도 함께 고친다.
> 기존 `frontend/` 폴더는 참고하지 않는다. 새 `frontend/` 프로젝트를 처음부터 만든다는 전제다.

---

## 0. 한눈에 보기

| 항목 | 결정 |
|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript (strict) |
| 스타일 | CSS Modules + 전역 CSS 변수(디자인 토큰). 화이트 베이스 · 짙은 초록 포인트. 외부 UI 라이브러리 없음 |
| 폰트 | Pretendard(가변) 하나로 통일 — CDN 동적 서브셋 `<link>`. 세리프·전광판 전용 폰트 없음 |
| 상태 | React State + Context(쿠폰·내 정보처럼 페이지를 넘나드는 값만) |
| 폴더 구조 | 라우트 단위 Colocation (`app/<route>/_components·_hooks·_lib·_data·_types.ts`) |
| 데이터 | `_data/*.ts` Mock → `_lib/*Service.ts` → 컴포넌트 (API 교체 지점은 Service 파일 하나) |
| 애니메이션 | 레이스: `requestAnimationFrame` + `transform: translateX`. 나머지: CSS transition/keyframes |
| 백엔드 | 연결하지 않음 (추후 Spring Boot) |
| 핵심 페이지 | **`/race`**, **`/seat`** — 가장 높은 완성도 |
| 관리자 페이지 | `/admin/menus`(메뉴 관리), `/admin/categories`(카테고리 관리) — 인증 없이 Mock 으로 동작 |
| 구현 순서 | 기능 단위 15단계 TODO (12절) |

**컨셉 한 줄:** "빈티지 경마장을 테마로 한 감성 카페". 카지노·도박 사이트처럼 보이면 실패다.

---

## 1. 프로젝트 폴더 구조

**기능(라우트) 단위 Colocation 구조.** 한 페이지에서만 쓰는 컴포넌트·훅·로직·Mock Data·타입은 그 라우트 폴더 안에 `_` 접두사 폴더(Next.js 비공개 폴더 — 라우트로 잡히지 않음)로 둔다. 둘 이상의 페이지가 쓰는 것만 최상위 `components/`, `lib/`, `types/` 로 올린다.

```
frontend/
├─ app/
│  ├─ layout.tsx                  # 루트: <html>, 폰트, UserProvider (Header/Footer 없음)
│  ├─ globals.css                 # 디자인 토큰(CSS 변수) + 리셋 + 공통 유틸
│  ├─ not-found.tsx               # 404 "OFF TRACK"
│  │
│  ├─ (site)/                     # 사용자 사이트 route group — URL 에는 (site) 가 붙지 않는다
│  │  ├─ layout.tsx               # Header + Footer
│  │  ├─ page.tsx                 # /  메인 — Hero + MenuLineup 조립
│  │  ├─ _components/             # 메인(/) 전용
│  │  │  ├─ Hero.tsx              # 전폭 슬라이더 + 하단 탭 페이지네이션 (hero.module.css)
│  │  │  ├─ MenuLineup.tsx        # TODAY'S LINEUP 4열 메뉴 그리드, "use cache" (menuLineup.module.css)
│  │  │  └─ DashboardCard.tsx     # (14단계) 좌석/인기메뉴/쿠폰/다음경주 카드 (Link)
│  │  ├─ _lib/
│  │  │  └─ lineup.ts             # 라인업 선정 순수 함수 (WINNER → BEST → NEW, 품절은 뒤로)
│  │  ├─ _data/
│  │  │  └─ heroSlides.ts         # 히어로 슬라이드 문구·이미지 (값만)
│  │  ├─ _types.ts                # HeroSlide
│  │  │
│  │  ├─ race/                    # /race  ★ 핵심
│  │  │  ├─ page.tsx
│  │  │  ├─ _components/
│  │  │  │  ├─ HorseCard.tsx      # 출전표 카드
│  │  │  │  ├─ BetConfirmModal.tsx# "MOCHA에 쿠폰 1장을 사용하시겠습니까?"
│  │  │  │  ├─ HorseTrack.tsx     # 트랙 전체(레인 7개 + START/FINISH)
│  │  │  │  ├─ HorseRunner.tsx    # 레인 하나의 말
│  │  │  │  ├─ RaceCountdown.tsx
│  │  │  │  ├─ RaceEventMessage.tsx # 경기 중 이벤트 토스트
│  │  │  │  ├─ RaceResultModal.tsx
│  │  │  │  └─ RaceHistory.tsx    # RECENT RACES
│  │  │  ├─ _hooks/
│  │  │  │  └─ useRace.ts         # 레이스 진행 상태 머신 + rAF 루프
│  │  │  ├─ _lib/
│  │  │  │  ├─ simulation.ts      # 순수 함수: 속도·이벤트·순위 계산 (UI 의존 없음)
│  │  │  │  ├─ messages.ts        # 이벤트 메시지 템플릿
│  │  │  │  └─ raceService.ts     # 데이터 접근(getHorses, getRaceHistory, placeBet)
│  │  │  ├─ _data/
│  │  │  │  ├─ horses.ts
│  │  │  │  └─ raceHistory.ts
│  │  │  └─ _types.ts             # Horse, RaceResult, RaceEventMessage ...
│  │  │
│  │  ├─ seat/                    # /seat  ★ 핵심
│  │  │  ├─ page.tsx
│  │  │  ├─ _components/
│  │  │  │  ├─ Seat.tsx           # 좌석 하나(버튼)
│  │  │  │  ├─ SeatFilter.tsx
│  │  │  │  ├─ SeatSummary.tsx    # AVAILABLE SEATS 12 / 30 + 인원별 집계
│  │  │  │  ├─ SeatLegend.tsx     # 상태 범례(색 + 아이콘 + 텍스트)
│  │  │  │  ├─ RecommendedSeat.tsx
│  │  │  │  ├─ CafeFloorPlan.tsx  # 평면도 캔버스 + 고정 구조물(창문/카운터/출입구/화장실/통로)
│  │  │  │  ├─ SeatDetailPanel.tsx# 좌석 클릭 시 Side Panel(모바일은 Bottom Sheet)
│  │  │  │  └─ SeatStatusDevTool.tsx # 개발용 Mock 상태 변경(관리자 기능 미리보기)
│  │  │  ├─ _hooks/
│  │  │  │  └─ useSeatFilter.ts
│  │  │  ├─ _lib/
│  │  │  │  ├─ filter.ts          # 필터 매칭 순수 함수
│  │  │  │  ├─ recommend.ts       # 추천 점수 계산 순수 함수
│  │  │  │  ├─ labels.ts          # 구역·상태·특징 enum → 한글 라벨/아이콘
│  │  │  │  └─ seatService.ts     # 데이터 접근(getSeats, reserveSeat, updateSeatStatus ...)
│  │  │  ├─ _data/
│  │  │  │  ├─ seats.ts
│  │  │  │  └─ floorPlan.ts       # 창문·카운터·출입구 등 구조물 좌표
│  │  │  └─ _types.ts             # Seat, SeatStatus, SeatFeature, FloorFixture ...
│  │  │
│  │  ├─ menu/                    # /menu
│  │  │  ├─ page.tsx
│  │  │  ├─ _components/
│  │  │  │  ├─ MenuCategory.tsx   # 카테고리 탭
│  │  │  │  └─ MenuCard.tsx       # 티켓 스타일 메뉴 카드
│  │  │  ├─ _lib/
│  │  │  │  └─ menuService.ts     # 메뉴·카테고리 조회 + 관리자 CRUD (메뉴 도메인의 유일한 데이터 창구)
│  │  │  ├─ _data/
│  │  │  │  ├─ menus.ts           # 메뉴 + 관리자 폼용 이미지 목록(MENU_IMAGES)
│  │  │  │  └─ categories.ts
│  │  │  └─ _types.ts             # Menu, MenuStatus, MenuBadge, Category, MenuInput, CategoryInput
│  │  │
│  │  └─ event/                   # /event
│  │     ├─ page.tsx
│  │     ├─ _components/
│  │     │  ├─ CouponCard.tsx     # Race Ticket 스타일 쿠폰
│  │     │  └─ EventCard.tsx
│  │     ├─ _lib/
│  │     │  └─ eventService.ts    # getEvents
│  │     ├─ _data/
│  │     │  └─ events.ts
│  │     └─ _types.ts             # CafeEvent
│  │
│  └─ admin/                      # /admin  관리자 (사용자 Header/Footer 없음, 이번 단계는 로그인 없이 진입)
│     ├─ layout.tsx               # 관리자 전용 레이아웃(사이드 내비 + "MOCK ADMIN" 안내 띠)
│     ├─ page.tsx                 # /admin → /admin/menus 로 이동
│     ├─ _components/
│     │  ├─ AdminNav.tsx          # 메뉴 관리 · 카테고리 관리
│     │  ├─ ConfirmDialog.tsx     # 삭제 확인 등 관리자 공용 확인창(Modal 기반)
│     │  ├─ AdminToast.tsx        # 저장·삭제 결과 알림 + useToast()
│     │  └─ admin.module.css      # 관리자 화면 공용 스타일(표·폼·모바일 카드 목록)
│     ├─ menus/                   # /admin/menus  메뉴 관리
│     │  ├─ page.tsx
│     │  ├─ _components/
│     │  │  ├─ MenuAdminTable.tsx # 메뉴 목록 표(검색·카테고리·상태 필터) + 폼·확인창 조립
│     │  │  └─ MenuForm.tsx       # 등록/수정 폼(모달)
│     │  ├─ _hooks/
│     │  │  └─ useMenuAdmin.ts    # 목록 State + 등록/수정/삭제/상태 변경
│     │  └─ _lib/
│     │     └─ validateMenu.ts    # 폼 검증 순수 함수
│     └─ categories/              # /admin/categories  카테고리 관리
│        ├─ page.tsx
│        ├─ _components/
│        │  ├─ CategoryList.tsx   # 카테고리 목록(순서 이동·노출 토글·메뉴 수) + 폼·확인창 조립
│        │  └─ CategoryForm.tsx   # 추가/이름 수정 폼
│        ├─ _hooks/
│        │  └─ useCategoryAdmin.ts
│        └─ _lib/
│           └─ validateCategory.ts
│
├─ components/                    # 2개 이상 페이지가 쓰는 공용 컴포넌트
│  ├─ Header.tsx                  # 로고(LogoMark) + HOME/MENU/SEAT/RACE/EVENT + 내 쿠폰 수
│  ├─ Footer.tsx
│  ├─ Modal.tsx                   # 공용 모달(포커스 트랩, ESC 닫기, 배경 클릭 닫기, 모바일 Bottom Sheet)
│  ├─ TicketBadge.tsx             # BEST / WINNER / NEW / MY PICK 경마 티켓 배지
│  ├─ Scoreboard.tsx              # 전광판 스타일 숫자 박스(카운트다운·좌석 수 공용)
│  ├─ HorseAvatar.tsx             # 말 마스코트(SVG, 대표색 주입) — 메인 Hero · /race 공용
│  ├─ UserProvider.tsx            # 쿠폰 수 공유 Context + useUser() 훅
│  ├─ ComingSoon.tsx              # 아직 구현 전인 사용자 페이지의 임시 화면 (전 페이지 구현 후 삭제)
│  ├─ layout.module.css           # Header · Footer · 사이트 골격
│  └─ ui.module.css               # Modal · TicketBadge · Scoreboard · HorseAvatar
│
├─ lib/                           # 2개 이상 페이지가 쓰는 공용 로직
│  ├─ time.ts                     # RACE_TIMES, 다음 경주 시각 계산, 카운트다운 포맷
│  └─ useCountdown.ts             # 메인 Hero · /race 공용 카운트다운 훅
│
├─ types/
│  └─ common.ts                   # Coupon, UserState 등 공용 타입
│
└─ public/
   └─ images/
      ├─ hero/                    # 히어로 사진 (next-race.jpg) + CREDITS.md 출처·라이선스
      └─ menus/                   # 메뉴 일러스트 SVG 10종
```

> **route group 을 쓰는 이유**: 관리자 화면에는 사용자 사이트의 Header/Footer 가 붙으면 안 된다. 루트 `layout.tsx` 는 폰트와 Provider 만 두고, Header/Footer 는 `(site)/layout.tsx` 에만 둔다. 괄호 폴더는 URL 에 나타나지 않으므로 `/menu`, `/seat` 등의 주소는 그대로다.
> 다른 라우트에서 import 할 때는 `@/app/(site)/menu/_lib/menuService` 처럼 경로에 `(site)` 가 들어간다.

**원칙**
- **라우트 폴더 안 `_` 폴더의 역할**
  | 폴더 | 담는 것 |
  |---|---|
  | `_components/` | 그 페이지 전용 UI 컴포넌트 |
  | `_hooks/` | 그 페이지 전용 상태·효과 훅 |
  | `_lib/` | 순수 계산 로직 + 데이터 접근 함수(`*Service.ts`) |
  | `_data/` | Mock Data. 값만 두고 로직은 넣지 않는다 |
  | `_types.ts` | 그 도메인의 타입 |
- **공용으로 올리는 기준**: 두 개 이상의 라우트가 쓰기 시작하면 그때 `components/`·`lib/`·`types/` 로 옮긴다. 처음부터 공용으로 만들지 않는다.
- 페이지 파일(`page.tsx`)은 조립만 한다. 로직은 `_hooks/`·`_lib/`, 데이터는 `*Service.ts` 를 통해서만 가져온다.
- 컴포넌트는 `_data/` 를 직접 import 하지 않는다. 반드시 같은 라우트의 `*Service.ts` 를 거친다.
- **다른 라우트의 데이터가 필요할 때**(예: 메인 대시보드의 좌석 수·인기 메뉴)는 그 라우트의 `*Service.ts` 만 import 한다. 다른 라우트의 `_components/`·`_data/` 를 직접 가져오지 않는다.
  ```ts
  // app/(site)/page.tsx
  import { getSeatSummary } from "./seat/_lib/seatService";
  import { getTodayWinnerMenu } from "./menu/_lib/menuService";
  ```
- `_lib/` 의 계산 로직(`simulation.ts`, `filter.ts`, `recommend.ts`)은 React 와 무관한 순수 함수로 작성한다(테스트·재사용 용이).
- 너무 잘게 쪼개지 않는다. 한 파일이 한 화면 블록을 책임지는 정도가 기준이다.

---

## 2. 디자인 시스템

### 2.1 컬러 토큰 (`globals.css`)

> 2026-10-08 재구성. 참고: 언스페셜티·NC 의 "화이트 바탕 + 거의 검정 텍스트 + 포인트 컬러 하나" 톤.
> 이전 크림/브라운 토큰(`--cream-*`, `--brown-*`)은 관리자 화면 호환용 **별칭**으로만 남아 있고 새 코드에서는 쓰지 않는다.

```css
:root {
  /* Surface */
  --bg: #ffffff;          /* 페이지 배경 */
  --bg-subtle: #f7f7f8;   /* 카드·썸네일 배경, 호버 */
  --bg-muted: #f2f2f3;    /* 구분 영역 */

  /* Text */
  --text-strong: #0f1011; /* 제목 */
  --text-body:   #3d3d43; /* 본문 */
  --text-muted:  #62626a; /* 보조 */
  --text-faint:  #8e8e95; /* 캡션 */
  --text-on-dark: #ffffff;

  /* Brand — 짙은 초록은 "포인트"에만: 버튼, 배지, 현재 메뉴 밑줄, 푸터 블록 */
  --green-900: #0f2a1d;   /* 푸터, 전광판 칸, 강조 버튼 */
  --green-700: #1f4d36;   /* 기본 버튼, 밑줄, 아이콘 */
  --green-500: #2f6b4c;
  --green-300: #8cc4a6;   /* 어두운 배경 위 소제목·진행바 */
  --green-100: #e1efe6;   /* 선택 상태 배경 */

  /* Accent (조금만) */
  --gold-500: #c9a227;    /* WINNER 전용 */
  --red-600:  #c6382c;    /* BEST 배지, 품절, 위험 동작, LIVE */

  /* Border */
  --border: rgba(15, 16, 17, 0.08);
  --border-strong: rgba(15, 16, 17, 0.18);

  /* 좌석 상태 */
  --seat-available: #2f6b4c;
  --seat-using:     #8b5e3c;
  --seat-reserved:  #c9a227;
  --seat-repair:    #8a8a8a;

  /* Shape: --radius-sm 6px · --radius-md 10px · --radius-lg 16px · --radius-pill */
}
```

- 배경은 흰색, 텍스트는 거의 검정. 넓은 색면은 **푸터와 히어로(사진 위 어두운 그라데이션)** 두 곳뿐이다.
- 초록·금색·빨간색은 **포인트 전용**이다. 종이 질감, 이중 테두리, 네온, 검정+금 조합, 칩·룰렛·카드 이미지는 쓰지 않는다(카지노처럼 보이지 않게).

### 2.2 타이포그래피

| 용도 | 폰트 | 예 |
|---|---|---|
| 대제목(영문) | Pretendard 800, 자간 −0.02~−0.03em | `NEXT RACE`, `TODAY'S LINEUP` |
| 소제목(eyebrow) | Pretendard 700, 0.76rem, 자간 +0.18em, 대문자 | `DAILY CAFE RACE` |
| 전광판 숫자 | Pretendard 700 + `font-variant-numeric: tabular-nums` (`.font-board`) | `01 : 24 : 32` |
| 본문(한글) | Pretendard 400/500, 15px, 자간 −0.01em, `word-break: keep-all` | 설명문 |

- 폰트는 Pretendard 가변 하나다. `app/layout.tsx` 가 CDN 동적 서브셋 CSS 를 `<link>` 로 연결하고, 폰트 스택은 `--font-sans` 에 있다(`--font-body/display/board` 는 호환용 별칭).
- 영문 대제목 + 한글 부제 패턴을 전 페이지에서 쓴다 (`TRACKSIDE` / 창가 좌석). 경마장 느낌은 세리프 대신 **대문자 영문 제목 + 티켓·전광판 컴포넌트 + 카피**로 낸다.

### 2.3 시그니처 UI 요소

| 요소 | 쓰는 곳 | 표현 |
|---|---|---|
| **경마 티켓** | 메뉴 카드, 쿠폰, 배지 | 크림 종이 + 점선 절취선 + 양옆 반원 펀치(`radial-gradient` 마스크) + 일련번호 |
| **전광판** | Hero, 카운트다운, 좌석 요약 | 짙은 초록 배경, 금색 얇은 테두리, 칸막이 숫자 |
| **출전표** | 말 선택 카드 | 번호 큰 원형 배지(대표색), 이름, 성적표 행 |
| **트랙** | 레이스, 장식 구분선 | 초록 잔디 + 흰 레인선 + 체크무늬 FINISH 라인 |
| **좌석 안내도** | 좌석 페이지 | 경기장 좌석 안내도처럼 구역명 라벨 + 구역 색 테두리 |

공통: 모서리 6–16px, 1px 연한 테두리(`--border`), 질감·이중 테두리 없음, 그림자는 모달 정도에만. 전광판은 짙은 초록 칸 + 흰 숫자로 단순화.

### 2.4 말 마스코트

- 사실적인 말 금지. **둥글고 귀여운 2–3등신 마스코트**를 인라인 SVG 한 장으로 만들고 `color` prop 으로 몸통/갈기 색을 바꾼다 (`HorseAvatar`).
- 각 말에 번호 조끼(saddle cloth) + 카페 소품(컵, 쿠키 등) 하나씩으로 개성을 준다.
- 트랙 위에서는 작은 사이즈 + 달리는 bobbing 애니메이션(`translateY` keyframes).

### 2.5 접근성·인터랙션 기본값

- 상태 표현은 **색 + 아이콘 + 텍스트** 3중 표기 (색만으로 구분 금지).
- 모든 클릭 요소는 `<button>`/`<Link>`, 키보드 포커스 링 표시.
- 모달: ESC 닫기, 포커스 트랩, `aria-modal`.
- `prefers-reduced-motion` 이면 장식 애니메이션 끔(레이스 자체는 유지하되 bobbing 제거).

---

## 3. 공통 레이아웃

참고 구성: 카페게이트(로고 좌측 · 내비 중앙 · 전폭 히어로 · 가운데 정렬 다크 푸터).

### Header
- 화이트(반투명 + blur) sticky, 하단 1px 테두리. 높이 72px(모바일 60px)
- 좌: 로고(짙은 초록 원 + 흰 말발굽·컵 `LogoMark`) + `NCAFE` / `RACECOURSE` 워드마크
- 중: `HOME · MENU · SEAT · RACE · EVENT` — 회색 → 현재 경로는 검정 + 초록 2px 밑줄. 한글 부제는 PC 에서 스크린리더용, 모바일 메뉴에서 표시
- 우: 티켓 아이콘 + `5장` 내 쿠폰 칩(UserContext 구독) — 클릭 시 `/event`
- 모바일(≤860px): 햄버거 → 전체 화면 흰 메뉴
- RACE 메뉴 옆에 경주가 임박하면 작은 빨간 `LIVE` 점(선택)

### Footer
- 짙은 초록(`--green-900`) 블록, 가운데 정렬: 워드마크 + 태그라인 → OPEN / ADDRESS / DAILY RACE → 메뉴 링크 줄
- 하단 고지: **"본 이벤트는 카페 내부 이벤트 쿠폰으로 진행되는 미니게임이며, 현금·실제 금전 거래와 무관합니다."** + 저작권 줄

---

## 4. 타입 정의

타입은 도메인별로 각 라우트의 `_types.ts` 에 두고, 여러 페이지가 쓰는 것만 `types/common.ts` 에 둔다.

| 파일 | 타입 |
|---|---|
| `app/(site)/race/_types.ts` | `HorseTrait`, `Horse`, `RacePhase`, `RaceResult`, `RaceEventMessage` |
| `app/(site)/seat/_types.ts` | `SeatSection`, `SeatType`, `SeatStatus`, `SeatFeature`, `Seat`, `FloorFixture` |
| `app/(site)/menu/_types.ts` | `Category`, `MenuStatus`, `MenuBadge`, `Menu`, `MenuInput`, `CategoryInput` |
| `app/(site)/event/_types.ts` | `CafeEvent` |
| `types/common.ts` | `Coupon`, `UserState` (Header·메인·/race·/event 공용) |

```ts
// ===== app/(site)/race/_types.ts =====
// ---- Horse ----
export type HorseTrait = "FAST_START" | "STEADY" | "LATE_SPURT" | "WILDCARD" | "BALANCED";

export interface Horse {
  id: number;              // 1~7 (= 게이트 번호)
  name: string;            // "Thunder"
  color: string;           // 대표 컬러 hex
  personality: string;     // "성격 급한 에너자이저"
  trait: HorseTrait;       // 시뮬레이션에 쓰이는 주행 성향
  description: string;     // "초반 스타트가 빠른 말"
  recentResults: number[]; // [2, 1, 4] 최근 순위, 최신이 앞
}

// ---- Race ----
export type RacePhase = "BETTING" | "READY" | "RUNNING" | "FINISHED";

export interface RaceResult {
  raceNo: number;
  date: string;            // ISO
  ranking: number[];       // horseId 순서대로 1위~7위
}

export interface RaceEventMessage {
  id: string;
  horseId: number;
  type: "BOOST" | "SLOW" | "SPURT" | "OVERTAKE" | "STUMBLE" | "LEAD_BATTLE";
  text: string;            // "🔥 MOCHA가 속도를 올립니다!"
}

// ===== app/(site)/seat/_types.ts =====
export type SeatSection = "TRACKSIDE" | "GRANDSTAND" | "PADDOCK" | "LOUNGE";
export type SeatType = "TABLE" | "BAR";
export type SeatStatus = "AVAILABLE" | "USING" | "RESERVED" | "REPAIR";
export type SeatFeature = "WINDOW" | "OUTLET" | "QUIET" | "GROUP" | "NEAR_COUNTER" | "BAR";

export interface Seat {
  id: string;              // "T03"
  section: SeatSection;
  type: SeatType;
  capacity: number;
  status: SeatStatus;
  x: number;               // 평면도 기준 % (0~100, 좌석 중심)
  y: number;               // 평면도 기준 % (0~100)
  w?: number;              // 폭 % (없으면 type/capacity 기본값)
  h?: number;              // 높이 %
  features: SeatFeature[];
}

export interface FloorFixture {   // 창문·카운터·출입구 등 고정 구조물
  id: string;
  kind: "WINDOW" | "COUNTER" | "ENTRANCE" | "RESTROOM" | "AISLE" | "WALL";
  label: string;
  x: number; y: number; w: number; h: number; // %
}

// ===== app/(site)/menu/_types.ts =====
// 카테고리는 관리자가 추가·수정하므로 enum 이 아니라 데이터로 관리한다.
export interface Category {
  id: number;
  name: string;            // "커피"
  engName: string;         // "Coffee"
  order: number;           // 탭 노출 순서 (작을수록 앞)
  visible: boolean;        // false 면 /menu 탭에서 숨김
}

export type MenuStatus = "ON_SALE" | "SOLD_OUT" | "HIDDEN";
export type MenuBadge = "BEST" | "WINNER" | "NEW";

export interface Menu {
  id: number;
  categoryId: number;
  name: string;            // 한글명
  engName: string;
  price: number;
  description: string;
  image: string;           // /images/menus/xxx.svg
  badge?: MenuBadge;
  status: MenuStatus;      // HIDDEN 은 /menu 에 안 보임, SOLD_OUT 은 "품절" 표시
}

export type MenuInput = Omit<Menu, "id">;           // 등록·수정 폼 값
export type CategoryInput = Pick<Category, "name" | "engName" | "visible">;

// ===== app/(site)/event/_types.ts =====
export interface CafeEvent {
  id: number;
  title: string;           // "DAILY RACE"
  time?: string;           // "18:00"
  description: string;
  ctaLabel?: string;       // "Race 참여하기"
  ctaHref?: string;        // "/race"
}

// ===== types/common.ts =====
export interface Coupon {
  id: string;
  kind: "RACE_TICKET" | "FREE_AMERICANO";
  label: string;
  issuedAt: string;
  used: boolean;
}

export interface UserState {
  coupons: number;
  rewards: Coupon[];
  spendCoupon: () => boolean;
  addReward: (c: Coupon) => void;
}
```

> 백엔드가 붙으면 이 타입이 Spring Boot DTO 와 1:1 이 되도록 맞춘다. 필드명을 바꿀 일이 생기면 여기서 먼저 바꾼다.

---

## 5. Mock Data (각 라우트의 `_data/`)

| 파일 | 내용 |
|---|---|
| `app/(site)/race/_data/horses.ts` | 말 7마리 |
| `app/(site)/race/_data/raceHistory.ts` | 과거 경주 결과 |
| `app/(site)/seat/_data/seats.ts` | 좌석 30석 |
| `app/(site)/seat/_data/floorPlan.ts` | 평면도 구조물 |
| `app/(site)/menu/_data/menus.ts` | 메뉴 |
| `app/(site)/menu/_data/categories.ts` | 카테고리 (커피 · 논커피 · 티 · 디저트) |
| `app/(site)/event/_data/events.ts` | 이벤트 |
| `lib/time.ts` | `RACE_TIMES` (메인·/race·/event 공용이라 최상위) |
| `components/UserProvider.tsx` | 쿠폰 초기값 `INITIAL_COUPONS = 5` |

### 5.1 horses.ts — 7마리

| No | 이름 | 대표색 | trait | 설명 | recentResults |
|---|---|---|---|---|---|
| 1 | Thunder | `#3b5ba5` 블루 | FAST_START | 초반 스타트가 빠른 말 | [3, 1, 5] |
| 2 | Latte | `#d9b48f` 라떼 | STEADY | 안정적으로 달리는 말 | [2, 2, 3] |
| 3 | Mocha | `#6b4226` 모카 | LATE_SPURT | 막판 스퍼트가 강한 말 | [2, 1, 4] |
| 4 | Espresso | `#2b1d12` 다크 | FAST_START | 짧고 강하게, 지구력은 약함 | [5, 4, 1] |
| 5 | Caramel | `#c98a3a` 캐러멜 | BALANCED | 무난한 올라운더 | [4, 3, 2] |
| 6 | Vanilla | `#efe3c2` 바닐라 | STEADY | 느긋하지만 꾸준한 말 | [6, 5, 3] |
| 7 | Cookie | `#a0522d` 쿠키 | WILDCARD | 변수가 많은 말 | [1, 7, 6] |

이름·설정 수정은 이 파일만 고치면 되도록 한다.

### 5.2 seats.ts — 총 30석 (지시서의 "12 / 30" 과 맞춤)

| 구역 | 한글 | 좌석 | 비고 |
|---|---|---|---|
| TRACKSIDE | 창가 좌석 | T01(2) T02(2) T03(4) T04(2) T05(2) T06(4) | WINDOW, 일부 OUTLET |
| GRANDSTAND | 일반 좌석 | T07(4) T08(2) T09(2) T10(4) T11(2) T12(2) T13(4) T14(2) | 일부 QUIET / NEAR_COUNTER |
| LOUNGE | 단체 좌석 | T15(6) T16(6) T17(8) | GROUP |
| PADDOCK BAR | 바 좌석 | B01 ~ B13 (각 1인) | BAR, 전부 OUTLET |

- 초기 상태는 AVAILABLE 12석이 되도록 분배하고, USING/RESERVED/REPAIR 를 골고루 섞는다.
- `x, y` 는 평면도 컨테이너 기준 **퍼센트**. 위치 변경은 이 값만 고친다.

### 5.3 floorPlan.ts — 구조물

WINDOW(상단 벽 전체), COUNTER(우측 중단), ENTRANCE(좌하단), RESTROOM(우하단), AISLE(중앙 세로·하단 가로 통로), 벽체. 좌석과 마찬가지로 % 좌표.

### 5.4 menus.ts

카테고리 4개 × 3~4개. 인기 메뉴에 `badge: "BEST"`, 오늘의 1위 메뉴에 `"WINNER"`.
"오늘의 인기 메뉴"(메인 대시보드)는 `badge === "WINNER"` 인 메뉴로 정한다.
관리자 화면 확인용으로 `SOLD_OUT` 1개, `HIDDEN` 1개를 섞어 둔다.

categories.ts: `{ id: 1, name: "커피", engName: "Coffee", order: 1, visible: true }` … 4개.

### 5.5 raceHistory.ts

Race #8 ~ #12 정도의 과거 결과 (`ranking` 7개 전체 저장, UI 는 1~3위만 노출).

### 5.6 events.ts · 공용 값

- events: `DAILY RACE 18:00`, `WINNER 메뉴 10% 할인`, `첫 방문 쿠폰` 등 2~4개.
- 쿠폰 초기값: `UserProvider` 의 `INITIAL_COUPONS = 5`.
- 레이스 시각: `RACE_TIMES = ["12:30", "18:00"]` 처럼 배열로 두고 `lib/time.ts` 가 "지금 이후 가장 가까운 시각"을 계산한다(오늘 다 지났으면 내일 첫 경주).

---

## 6. 데이터 계층 (각 라우트의 `_lib/*Service.ts`)

```ts
// app/(site)/seat/_lib/seatService.ts — 현재(Mock)
import { SEATS } from "../_data/seats";
import type { Seat } from "../_types";

export async function getSeats(): Promise<Seat[]> {
  return structuredClone(SEATS);
}
export async function reserveSeat(id: string): Promise<{ ok: true }> {
  return { ok: true };   // 실제 요청 없음
}

// 추후(API) — 컴포넌트 변경 없이 이 파일만 교체
// export async function getSeats() {
//   const res = await fetch(`${API_BASE}/api/seats`);
//   return res.json() as Promise<Seat[]>;
// }
```

- 모든 service 함수는 **`async` + `Promise` 반환**으로 통일한다. Mock 일 때도 비동기로 두어야 API 교체 시 호출부가 바뀌지 않는다.
- 쓰기 동작(예약, 쿠폰 사용)도 service 함수로 둔다. 지금은 성공만 돌려주고, 상태 반영은 호출한 쪽의 React State 가 한다.

| 파일 | 함수 | 추후 API (예상) |
|---|---|---|
| `app/(site)/race/_lib/raceService.ts` | `getHorses()`, `getRaceHistory()`, `placeBet(horseId)` | GET /api/horses, GET /api/races/history, POST /api/races/{id}/bets |
| `app/(site)/seat/_lib/seatService.ts` | `getSeats()`, `getSeatSummary()`, `getFloorFixtures()`, `reserveSeat(id)`, `updateSeatStatus(id, status)` | GET /api/seats, POST /api/seats/{id}/reservations, PATCH /api/admin/seats/{id} |
| `app/(site)/menu/_lib/menuService.ts` | `getMenus(categoryId?)`, `getTodayWinnerMenu()`, `getCategories()`, `getMenuImageOptions()` | GET /api/menus, GET /api/categories, (이미지 업로드 API 생기면 교체) |
| 〃 (관리자) | `createMenu(input)`, `updateMenu(id, input)`, `deleteMenu(id)`, `updateMenuStatus(id, status)` | POST /api/admin/menus, PUT·DELETE /api/admin/menus/{id}, PATCH /api/admin/menus/{id}/status |
| 〃 (관리자) | `createCategory(input, order)`, `updateCategory(id, input, order)`, `deleteCategory(id)`, `reorderCategories(ids)` | POST /api/admin/categories, PUT·DELETE /api/admin/categories/{id}, PUT /api/admin/categories/order |
| `app/(site)/event/_lib/eventService.ts` | `getEvents()` | GET /api/events |
| `lib/time.ts` | `getNextRaceTime()` | GET /api/races/next |

- 메인(`/`)의 `_data/` 에는 히어로 슬라이드 문구(`heroSlides.ts`)만 둔다. 좌석 수·인기 메뉴 같은 대시보드 값은 위 Service 들을 import 해서 모은다.
- 관리자 페이지(`/admin/*`)도 자기 `_data/` 가 없다. 메뉴·카테고리는 `app/(site)/menu/_lib/menuService.ts` 하나로만 읽고 쓴다.
- **Mock 단계의 한계**: 관리자 쓰기 함수는 성공만 돌려주고, 변경은 관리자 화면의 React State 에만 반영된다. 새로고침하면 초기화되고 `/menu` 에는 반영되지 않는다. API 를 연결하면 두 화면이 같은 데이터를 보게 된다.
- 내 쿠폰(`GET /api/my/coupons`)은 `UserProvider` 가 초기화할 때 불러오는 구조로 확장한다.

---

## 7. 전역 상태 (`components/UserProvider.tsx`)

페이지를 넘나드는 값만 Context 로 둔다. 나머지는 페이지 로컬 State.
`UserProvider` 는 `app/layout.tsx` 에서 전체를 감싸고, 값은 `useUser()` 훅으로 꺼낸다. 타입 `UserState` 는 `types/common.ts`.

```ts
interface UserState {
  coupons: number;                       // 레이스 참가권 (초기 5)
  rewards: Coupon[];                     // 레이스 우승 보상(무료 아메리카노 등)
  spendCoupon: () => boolean;            // 0장이면 false
  addReward: (c: Coupon) => void;
}
```

- Header(쿠폰 수), 메인 대시보드, `/race`, `/event` 가 같은 값을 본다.
- 새로고침 시 초기화되어도 무방(프로토타입). 원하면 `localStorage` 동기화를 옵션으로.
- 좌석 상태는 `/seat` 페이지 State 로 충분하다(다른 페이지는 요약 숫자만 service 에서 읽는다).

---

## 8. 페이지별 설계

### 8.1 `/` 메인 — 히어로 슬라이더 + 오늘의 라인업

참고: 히어로는 넥슨 `.promotionBanner`(전폭 배너 + 하단 겹침 탭 페이지네이션), 라인업은 언스페셜티 `.prdList.grid4`(4열 정사각 썸네일).

```
┌──────────────────── HERO (전폭, 사진 + 어두운 그라데이션) ───────────────────┐
│  DAILY CAFE RACE                                                           │
│  NEXT RACE                                           [ 경주마 사진 ]        │
│  첫 번째 레이스를 준비하고 있어요                                              │
│  출전표와 카운트다운이 곧 공개됩니다 …                                          │
│  [ RACE 페이지 보기 ]  ( COMING SOON )                                       │
│ ┌ DAILY RACE ─────────┐┌ (WINNER 메뉴) ┐┌ (이용 가능 좌석) ┐┌ (내 쿠폰·이벤트) ┐│  ← 탭 페이지네이션
│ │ NEXT RACE 준비 중 ▬▬▬││              ││               ││                ││     (지금은 1탭)
└─┴─────────────────────┴┴──────────────┴┴───────────────┴┴────────────────┴┘
  TODAY'S LINEUP                                              전체 메뉴 보기 ›
  오늘의 출전 메뉴 — 가장 많은 선택을 받은 메뉴들
  ┌ WINNER ┐ ┌ BEST ┐ ┌ BEST ┐ ┌ BEST ┐
  │  썸네일  │ │      │ │      │ │      │    ← 4열(태블릿 3열 · 모바일 2열) × 2줄 = 8개
  │ 카테고리 │ │      │ │      │ │      │       썸네일 좌상단 TicketBadge, 품절은 흐리게 + SOLD OUT
  │ 이름/영문│ │      │ │      │ │      │       카드 클릭 → /menu
  │ 가격    │ │      │ │      │ │      │
  └────────┘ └──────┘ └──────┘ └──────┘
```

**Hero (`_components/Hero.tsx`, client)**
- 슬라이드 데이터는 `HeroSlide[]` prop. 지금은 `_data/heroSlides.ts` 의 NEXT RACE 1장(준비 중 문구 + 경주마 사진). 구조는 4슬라이드(NEXT RACE · 오늘의 WINNER 메뉴 · 이용 가능 좌석 · 내 쿠폰/이벤트)를 전제로 하며, 추가 슬라이드는 14단계에서 각 Service 값으로 page 가 만들어 넘긴다.
- 높이 `clamp(460px, 34vw, 560px)`, 사진은 `next/image fill` + 좌→우·하→상 그라데이션. 활성 슬라이드는 느린 줌(7s)과 텍스트 페이드업.
- 하단 탭: 소제목 + 굵은 제목, 활성 탭은 밝은 배경 + 좌측 초록 바 + 진행바(5초, `--autoplay`). 슬라이드가 2장 이상일 때만 자동 전환·이전/다음 버튼·진행바가 동작하고, 호버·포커스 중에는 멈춘다. `prefers-reduced-motion` 이면 전환 효과 없음.
- 카운트다운은 6단계에서 NEXT RACE 슬라이드에 연결한다(`lib/useCountdown.ts`, 클라이언트 마운트 후 표시).

**MenuLineup (`_components/MenuLineup.tsx`, server)**
- `getMenus()` + `getCategories()` → `_lib/lineup.ts` 의 `pickLineup(menus, 8)`: HIDDEN 제외, WINNER → BEST → NEW → 배지 없음 순(같은 등급은 원래 순서), 품절은 뒤로.
- 컴포넌트 본문에 `"use cache"` + `cacheLife("hours")` 를 둔다. 모두에게 같은 내용이라 빌드 때 정적 셸에 포함되고, API 연결 뒤에는 관리자 저장 시 `revalidateTag` 로 갱신한다. **Suspense 로 감싸지 않는다** — 감싸면 내용이 숨김 영역에 들어가 하이드레이션 전까지 fallback 이 보인다. (Cache Components 규칙: 캐시되지 않은 비동기·요청 시점 데이터만 Suspense 경계 안에서 읽는다.)
- 대시보드 카드 4개(좌석/인기메뉴/쿠폰/다음경주)는 14단계에서 히어로 슬라이드로 흡수할지 별도 섹션으로 둘지 정한다.

### 8.2 `/race` — 핵심 ①

#### 상태 머신 (`app/(site)/race/_hooks/useRace.ts`)

```
BETTING ──(말 선택 + 모달 확인 + 쿠폰 차감)──▶ READY
READY   ──(START 버튼 / 3·2·1 카운트)────────▶ RUNNING
RUNNING ──(7마리 모두 결승 통과)───────────────▶ FINISHED  → Result Modal
FINISHED ──(다시 하기)────────────────────────▶ BETTING
```

> 프로토타입이므로 실제 18:00 를 기다리지 않는다. READY 에서 **"경주 시작" 버튼**(데모용)으로 즉시 출발할 수 있게 한다. 상단 카운트다운은 실제 다음 경주 시각을 계속 보여준다.

#### 화면 구성 (위→아래)

1. **헤더 전광판**: `DAILY CAFE RACE` · 다음 경기 18:00 · 카운트다운 · 내 쿠폰 N장
2. **출전표 (BETTING)**: `HorseCard` 7장 그리드(PC 4열 / 태블릿 2열 / 모바일 1열)
   ```
   ┌ No.3 ───────────────── MOCHA ┐
   │ [마스코트]   ● 대표색 모카       │
   │ 성격: 느긋하다 마지막에 폭발      │
   │ 최근 성적  2위 / 1위 / 4위       │
   │ "막판 스퍼트가 강한 말"           │
   │        [ 이 말 선택하기 ]         │
   └───────────────────────────────┘
   ```
   - 최근 성적 1위는 금색, 숫자는 전광판 폰트.
   - 쿠폰 0장이면 버튼 비활성 + "쿠폰이 부족합니다" 안내.
3. **BetConfirmModal**: "MOCHA에 쿠폰 1장을 사용하시겠습니까?" [취소] [사용하기] → `spendCoupon()` 후 READY. 선택한 말 카드에 `MY PICK` 티켓 배지.
4. **HorseTrack (READY/RUNNING)**
   ```
   START │                                                │ FINISH
     1 ▕🐎─────────────────────────────────────────────── ▏▒
     2 ▕   🐎──────────────────────────────────────────── ▏▒
     ...                                                     ▒ 체크무늬
     7 ▕ 🐎────────────────────────────────────────────── ▏▒
   ```
   - 레인마다 번호·이름, 내 말 레인은 금색 테두리 하이라이트.
   - 우측 상단에 실시간 순위 미니 전광판(1~3위).
   - `RaceEventMessage`: 트랙 상단 중앙에 1.5초 표시 후 fade-out. 동시에 여러 개 오면 큐로 순차 표시(최대 1개 노출).
5. **RaceResultModal (FINISHED)**
   ```
   RACE RESULT
   🥇 3번 MOCHA   🥈 7번 COOKIE   🥉 1번 THUNDER
   ─────────────
   YOUR HORSE  3번 MOCHA   WIN!
   축하합니다! 무료 아메리카노 쿠폰을 획득했습니다.   (1위일 때)
   ── or ──
   YOUR HORSE  5번 CARAMEL  (4위)  NEXT TIME!
   [다시 하기] [이벤트/쿠폰 보기]
   ```
   - 1위면 `addReward(FREE_AMERICANO)`, 가벼운 confetti(CSS) 연출.
   - 결과는 `raceHistory` State 맨 앞에 `Race #(마지막+1)` 로 추가.
6. **RaceHistory**: `RECENT RACES` — 최근 5경기 카드, 1~3위 표시.

#### 레이스 시뮬레이션 (`app/(site)/race/_lib/simulation.ts`)

순수 함수로 작성하고 `useRace` 가 rAF 루프에서 호출한다.

```ts
interface RunnerState {
  horseId: number;
  progress: number;        // 0 ~ 1 (1 = 결승)
  baseSpeed: number;       // 출발 시 랜덤 결정
  modifier: number;        // 일시적 속도 배율 (1 = 정상)
  modifierUntil: number;   // ms timestamp, 지나면 modifier → 1
  finishedAt?: number;
}

function step(runners: RunnerState[], dtMs: number, now: number): {
  runners: RunnerState[];
  events: RaceEventMessage[];   // 이번 프레임에 발생한 이벤트
};
```

**튜닝 목표: 전체 경주 10~15초.**

1. **기본 속도**: `baseSpeed = 1 / 12500ms × random(0.9, 1.1)` → 평균 약 12.5초 완주.
2. **trait 보정** (구간별 배율):
   | trait | 0~30% | 30~70% | 70~100% |
   |---|---|---|---|
   | FAST_START | ×1.15 | ×1.0 | ×0.92 |
   | STEADY | ×1.0 | ×1.0 | ×1.0 (이벤트 확률 ↓) |
   | LATE_SPURT | ×0.92 | ×1.0 | ×1.15 |
   | WILDCARD | ×1.0 | ×1.0 | ×1.0 (이벤트 확률 ↑↑, 변동폭 ↑) |
   | BALANCED | ×1.02 | ×1.02 | ×1.02 |
3. **랜덤 이벤트**: 약 300ms 마다 말별로 확률 체크(기본 4%, STEADY 2%, WILDCARD 9%).
   - BOOST(순간 가속 ×1.35, 1s) / SLOW(잠깐 감속 ×0.7, 0.8s) / STUMBLE(주춤 ×0.4, 0.5s)
   - SPURT: progress > 0.75 이고 LATE_SPURT 또는 확률 당첨 시 ×1.4, 1.5s
   - OVERTAKE: 이번 프레임에 순위가 오른 말이 있으면 메시지만 생성 (쿨다운 2s)
   - LEAD_BATTLE: 1·2위 차이 < 0.02 가 1초 이상 지속되면 메시지
4. **메시지 스로틀**: 화면 메시지는 전체 기준 최소 1.2초 간격. 너무 많으면 재미가 떨어진다.
5. **순위 기록**: `progress >= 1` 이 되는 프레임에 `finishedAt` 기록 → 도착 순서대로 `ranking` push. 7마리 모두 도착하면 FINISHED.
6. **안전장치**: 18초가 지나도 도착하지 못한 말은 남은 진행도 순으로 강제 마감.

**렌더링**
- rAF 콜백에서 `setRunners` 로 State 갱신(지시서: 위치는 React State 관리). 7개 요소뿐이라 매 프레임 setState 로 충분하다.
- 말 위치는 `transform: translateX(calc(progress × 트랙길이))` — `left` 사용 금지(리플로우).
- 언마운트 / 페이지 이탈 시 `cancelAnimationFrame` 필수.
- 탭이 백그라운드로 가면 `dt` 가 커지므로 `dt` 최대 50ms 로 clamp.

`app/(site)/race/_lib/messages.ts` 예:
```ts
BOOST:       (n) => `🔥 ${n}가 속도를 올립니다!`
SPURT:       (n) => `⚡ ${n}의 막판 스퍼트!`
STUMBLE:     (n) => `😵 ${n}가 잠시 주춤합니다!`
OVERTAKE:    (n) => `🏇 ${n}가 선두를 추격합니다!`
LEAD_BATTLE: (a, b) => `🏁 ${a}와 ${b}의 치열한 선두 경쟁!`
```
(조사 "가/이" 는 이름이 영문 대문자라 "가" 고정으로 충분. 필요 시 헬퍼 추가.)

### 8.3 `/seat` — 핵심 ②

목표: "12자리 남았구나"가 아니라 **"창가 T03이 비어 있네", "콘센트 자리는 B04", "4명이면 T07"** 을 판단할 수 있게 한다.

#### 레이아웃 (PC)

```
┌───────────────────────── SeatSummary (전광판) ─────────────────────────┐
│ AVAILABLE SEATS  12 / 30   · 2인석 4 · 4인석 2 · 6인석 1 · 바 5     최종 업데이트 17:32 │
└─────────────────────────────────────────────────────────────────────────┘
 SeatLegend:  ✓ 이용 가능  ● 사용 중  🔒 예약  🔧 수리 중

┌── SeatFilter (좌, 260px) ──┐ ┌──────── CafeFloorPlan (중앙) ────────┐ ┌ SeatDetailPanel (우) ┐
│ [전체] [이용 가능만]        │ │  ═════════ WINDOW ═════════           │ │ T03                  │
│ 인원 [1~2명 ▼]             │ │  TRACKSIDE 창가 좌석                  │ │ 4인 테이블            │
│ □ 콘센트  □ 창가            │ │  [T01] [T02] [T03] [T04] [T05] [T06]  │ │ 현재 상태 ✓ AVAILABLE │
│ □ 조용한 자리  □ 단체석      │ │  GRANDSTAND 일반 좌석                 │ │ 위치  창가            │
│ [초기화]                    │ │  [T07] [T08] ...        ┌─COUNTER─┐   │ │ 👥 최대 4명           │
│                            │ │                          │ ☕ 주문 │   │ │ 🔌 콘센트 있음         │
│ RecommendedSeat            │ │  LOUNGE 단체 좌석        └─────────┘   │ │ 🪟 창가 자리           │
│ ★ T03                       │ │  [T15] [T16] [T17]                    │ │ ☕ 카운터와 가까움      │
│ 창가 · 콘센트 · 2인 이용 가능 │ │  PADDOCK BAR 바 좌석 🔌               │ │ [이 좌석 예약하기]     │
└────────────────────────────┘ │  [B01][B02]...[B13]                   │ └──────────────────────┘
                               │  ENTRANCE ▸            RESTROOM 🚻    │
                               └───────────────────────────────────────┘
 (개발용) SeatStatusDevTool — 접이식 패널
```

- 태블릿: 필터를 평면도 위 가로 바로, 상세는 모달.
- 모바일: 필터는 접이식, 평면도는 가로 스크롤(최소 폭 720px 유지), 상세는 Bottom Sheet.

#### CafeFloorPlan 구현

- 컨테이너: `position: relative; aspect-ratio: 16 / 10; min-width: 720px;`
- 구조물(`FloorFixture`)과 좌석(`Seat`)을 모두 `position: absolute; left: x%; top: y%; width: w%; height: h%; transform: translate(-50%, -50%)` 로 배치. **좌표만 바꾸면 위치가 바뀐다.**
- 구역(Section)은 반투명 배경 영역 + 좌상단 라벨 `TRACKSIDE / 창가 좌석` (경기장 좌석 안내도 느낌).
- 바닥: 크림 바탕, 통로는 점선, 창문은 상단 하늘색 얇은 띠 + `WINDOW` 라벨, 출입구는 벽 끊김 + 화살표.
- 테이블 모양: 2인 정사각, 4인 직사각, 6~8인 큰 직사각/원형, 바 좌석은 작은 원(스툴) + 길쭉한 바 테이블 구조물.
- **HTML `<table>` 사용 금지.**

#### Seat 컴포넌트

| status | 배경/테두리 | 아이콘 | 텍스트 | 클릭 |
|---|---|---|---|---|
| AVAILABLE | 초록 테두리, 크림 배경 | ✓ | 이용 가능 | 가능 |
| USING | 브라운 채움 | ● (사람 아이콘) | 사용 중 | 상세만 |
| RESERVED | 금색 빗금 패턴 | 🔒 | 예약 | 상세만 |
| REPAIR | 회색 + 대각 스트라이프 | 🔧 | 수리 중 | 상세만 |

- 좌석 안에 `T03` + 상태 아이콘 + 인원(`4`)을 표시.
- 필터 불일치: `opacity: 0.3` (숨기지 않음).
- 추천 좌석: 금색 glow + 별 배지 + 은은한 pulse.
- 선택된 좌석: 두꺼운 짙은 초록 외곽선.
- 최소 터치 영역 44×44px (바 좌석 포함). 작으면 `::before` 로 히트 영역 확장.
- `<button aria-label="T03, 4인 테이블, 이용 가능, 창가·콘센트">`.

#### 필터 (`app/(site)/seat/_lib/filter.ts`, `_hooks/useSeatFilter.ts`)

```ts
interface SeatFilterState {
  onlyAvailable: boolean;
  people: "ANY" | "1-2" | "3-4" | "5+";
  features: SeatFeature[];   // OUTLET, WINDOW, QUIET, GROUP
}
matchesFilter(seat, filter): boolean
// - onlyAvailable → status === "AVAILABLE"
// - people → 인원 수를 수용 가능한 좌석 (1-2명: capacity >= 1, 3-4명: >= 3, 5+: >= 5)
//   단 너무 큰 자리는 감점이 아니라 추천 점수에서 처리
// - features → 선택한 특징을 모두 포함(AND)
```

#### 추천 (`app/(site)/seat/_lib/recommend.ts`)

```ts
recommendSeats(seats, filter): { seat: Seat; reasons: string[] }[]   // 상위 3개
```
- 대상: AVAILABLE 만.
- 점수: 선택 특징 일치 +3씩 / 인원 정확히 맞음 +2, 1~2명 여유 +1, 과하게 큼(예: 2명에 8인석) −2 / QUIET 보너스 +0.5(동점 정리용).
- 결과 문구: `창가 · 콘센트 · 2인 이용 가능` (`app/(site)/seat/_lib/labels.ts` 의 한글 라벨 조합).
- 조건을 하나도 안 골랐으면 "인원을 선택하면 맞춤 좌석을 추천해 드려요" 안내.
- 추천 0개면 "조건에 맞는 빈 좌석이 없어요. 조건을 줄여 보세요" + 가장 가까운 대안 1개.

#### 좌석 상세 & 예약

- `SeatDetailPanel`: 지시서 17절 항목 그대로(ID, 타입·인원, 상태, 위치(구역 한글), 특징 아이콘 목록).
- 위치 설명은 section + features 에서 파생(예: TRACKSIDE → "창가", NEAR_COUNTER → "카운터와 가까움").
- [이 좌석 예약하기] → `seatService.reserveSeat()` → 로컬 State 에서 status 를 `RESERVED` 로 변경 → "예약되었습니다." 확인 UI(티켓 스탬프 연출). 요약·추천도 즉시 재계산.
- AVAILABLE 이 아니면 버튼 대신 상태 안내.

#### 관리자 대비 구조 & 개발용 상태 변경

- 좌석 상태의 **단일 소스**는 `/seat` 의 `seats` State. Summary·Legend·FloorPlan·추천은 모두 여기서 파생(별도 카운트 State 금지).
- `SeatStatusDevTool`: 좌석 선택 → 라디오(이용 가능 / 사용 중 / 예약 / 수리 중) → `updateSeatStatus` → 즉시 반영. `process.env.NODE_ENV !== "production"` 일 때만 렌더.
- 추후 관리자 페이지는 같은 `updateSeatStatus` service 를 호출하면 된다.
- "마지막 업데이트" 시각은 State 가 바뀔 때마다 갱신.

### 8.4 `/menu` — 경마 티켓 스타일 메뉴판

- 상단: `MENU BOARD` / 오늘의 라인업. 클래식 카페 메뉴판 느낌(세리프 제목, 점선 리더 `아메리카노 ........ 4,500`).
- `MenuCategory` 탭: `getCategories()` 결과 중 `visible` 인 것만 `order` 순으로 (전체 탭 포함). 기본 데이터는 Coffee / Non Coffee / Tea / Dessert. URL 쿼리 `?category=` 동기화(선택).
- `status: "HIDDEN"` 메뉴는 보이지 않고, `"SOLD_OUT"` 은 카드에 "품절" 스탬프 + 흐리게.
- `MenuCard` = 티켓: 좌측 이미지, 우측 이름(한/영)·가격·설명, 절취선 너머 작은 "STUB" 에 일련번호. 인기 메뉴는 `BEST`, 1위 메뉴는 금색 `WINNER` 배지(TicketBadge).
- 그리드: PC 3열 / 태블릿 2열 / 모바일 1열.

### 8.5 `/event` — Race Event & Race Ticket

- `MY COUPONS` 전광판: 레이스 참가권 N장 + 획득한 보상 쿠폰 목록(`CouponCard` = Race Ticket 디자인, 사용 여부 스탬프).
- `EventCard` 목록: `DAILY RACE 18:00 — 오늘의 Race에 참가하고 쿠폰 보상을 받아보세요. [Race 참여하기 → /race]` 등.
- 쿠폰이 0장일 때 빈 상태 일러스트(빈 마구간 + "다음 이벤트에서 만나요").

### 8.6 `/admin` — 관리자 공통

- 사용자 사이트와 분리된 관리자 레이아웃: 왼쪽 사이드 내비(메뉴 관리 · 카테고리 관리) + 상단 "MOCK ADMIN — 변경 내용은 새로고침 시 초기화됩니다" 띠.
- 컨셉 톤은 유지하되(짙은 초록·크림) 장식은 줄이고 표·폼 중심의 업무 화면으로 만든다. 마스코트·전광판 장식은 쓰지 않는다.
- 이번 단계는 로그인이 없으므로 `/admin` 은 누구나 들어갈 수 있다. 사용자 Header 에는 링크를 두지 않는다(주소로 직접 진입).
- 삭제처럼 되돌릴 수 없는 동작은 `ConfirmDialog` 로 한 번 더 묻는다.
- 저장·삭제 후에는 화면 하단에 짧은 결과 알림("저장되었습니다")을 띄운다.

### 8.7 `/admin/menus` — 메뉴 관리

```
┌ 메뉴 관리 ───────────────────────────────────── [+ 메뉴 등록] ┐
│ 검색 [이름/영문명____]  카테고리 [전체 ▼]  상태 [전체 ▼]          │
├────┬──────────────┬────────┬────────┬────────┬──────┬─────────┤
│ 이미지│ 이름 / 영문명    │ 카테고리 │ 가격    │ 배지    │ 상태   │ 관리      │
│ ☕  │ 아이스 아메리카노 │ 커피     │ 4,500  │ WINNER │ 판매중▼│ 수정 삭제 │
└────┴──────────────┴────────┴────────┴────────┴──────┴─────────┘
```

- 목록: 검색(이름·영문명), 카테고리 필터, 상태 필터. 결과 0건이면 빈 상태 문구.
- 상태(판매중 / 품절 / 숨김)는 목록에서 바로 바꿀 수 있다(`updateMenuStatus`).
- 등록/수정 폼(모달): 카테고리(select, `getCategories()`), 이름, 영문명, 가격, 설명, 이미지 경로, 배지(없음/BEST/WINNER/NEW), 상태.
- 검증(`validateMenu`): 이름·영문명 필수, 가격은 0 이상 정수(100원 단위), 설명 100자 이내, WINNER 배지는 하나의 메뉴에만 둘 수 있다(다른 메뉴에 이미 있으면 안내).
- 삭제: ConfirmDialog → `deleteMenu` → 목록에서 제거.
- 모바일: 표는 가로 스크롤 대신 카드 목록으로 바꿔 보여 준다.

### 8.8 `/admin/categories` — 카테고리 관리

```
┌ 카테고리 관리 ─────────────────────────── [+ 카테고리 추가] ┐
│ 순서  이름(영문)          메뉴 수   노출     관리              │
│ ▲▼ 1  커피 (Coffee)       5       [ON]    수정 삭제          │
│ ▲▼ 2  논커피 (Non Coffee)  3       [ON]    수정 삭제          │
└─────────────────────────────────────────────────────────────┘
```

- 목록: `order` 순, 각 카테고리에 속한 메뉴 수 표시(`getMenus()` 결과에서 계산).
- 순서 변경: ▲▼ 버튼(키보드로도 조작 가능) → `reorderCategories(ids)`. 드래그 앤 드롭은 이번 단계에서 하지 않는다.
- 노출 토글: OFF 면 `/menu` 탭에서 숨겨진다.
- 추가/수정 폼: 이름·영문명 필수, 이름 중복 금지(`validateCategory`).
- 삭제: 메뉴가 1개 이상 속해 있으면 삭제 버튼 대신 "메뉴를 먼저 옮기거나 삭제해 주세요" 안내. 0개면 ConfirmDialog 후 삭제.

---

## 9. 반응형 기준

| 구간 | 폭 | 주요 변화 |
|---|---|---|
| Desktop (기준) | ≥ 1200px | 최대 폭 1200px 중앙 정렬, `/seat` 3단 |
| Tablet | 768–1199px | 카드 2열, `/seat` 필터 상단 + 상세 모달 |
| Mobile | < 768px | 1열, 햄버거 내비, Bottom Sheet |

- **경마 트랙**: `min-width: 640px` + 가로 스크롤 컨테이너. 레인 높이 최소 40px.
- **좌석 배치도**: `min-width: 720px` + 가로 스크롤. 스크롤 가능함을 알리는 그라데이션 힌트.
- 좌석·버튼 터치 영역 최소 44px.

---

## 10. 이번 단계에서 하지 않는 것

DB 연결 · Spring Boot API 연결 · 로그인/회원가입 · 실제 결제 · 실제 쿠폰 발급 · 실제 좌석 예약 API · WebSocket 실시간 통신.
→ 모두 Mock Data + React State 로 "동작하는 것처럼" 보여준다. 현금·실제 금전 배팅은 어떤 형태로도 구현하지 않는다.
→ 관리자 페이지도 인증 없이 열린다. 접근 제어는 로그인 기능을 붙일 때 함께 넣는다.

---

## 11. 추후 백엔드 연결 경로

```
현재:  _data/*.ts (Mock) ─▶ _lib/*Service.ts ─▶ _hooks / page ─▶ _components
추후:  Spring Boot API   ─▶ _lib/*Service.ts ─▶ _hooks / page ─▶ _components
                          (이 파일만 교체)
```

- `lib/` 에 `API_BASE = process.env.NEXT_PUBLIC_API_BASE` 와 공용 fetch 헬퍼(`lib/api.ts`)를 추가하고, 각 라우트의 `*Service.ts` 가 그것을 쓰도록 교체한다. 교체가 끝나면 `_data/` 폴더는 지운다.
- 좌석 실시간 반영은 처음엔 polling(`setInterval` 로 `getSeats()` 재호출) → 이후 WebSocket/SSE 로 확장. 컴포넌트는 `seats` 배열만 받으므로 바뀌지 않는다.
- 레이스 결과는 최종적으로 서버가 결정해야 한다(클라이언트 랜덤은 데모용). 그때는 서버가 `ranking` + 이벤트 타임라인을 내려주고, 프론트는 그것을 **재생**만 하도록 `simulation.ts` 를 "결과 지정 모드"로 확장한다. 지금부터 `useRace` 가 시뮬레이터를 주입받는 구조로 만들어 두면 교체가 쉽다.

---

## 12. 구현 단계 (기능 단위 TODO)

화면 단위가 아니라 **기능 단위**로 나눈다. 각 단계는 타입 → Mock Data → Service → 로직(_lib/_hooks) → UI 순으로 만들고, **완료 확인**을 모두 체크해야 다음 단계로 넘어간다.
같은 도메인의 데이터·Service 는 처음 필요한 단계에서 만들고, 뒤 단계는 그것을 이어서 쓴다.

| 단계 | 기능 | 선행 단계 |
|---|---|---|
| 1 | 디자인 시스템 & 공통 레이아웃 | — |
| 2 | (관리자) 메뉴 관리 | 1 |
| 3 | (관리자) 카테고리 관리 | 2 |
| 4 | 메뉴 조회 | 2, 3 |
| 5 | 쿠폰 지갑 & 이벤트 | 1 |
| 6 | 경주 일정 & 카운트다운 | 1 |
| 7 | 말 출전표 & 쿠폰 사용 | 5, 6 |
| 8 | 경주 시뮬레이션 & 애니메이션 | 7 |
| 9 | 경주 결과 · 보상 · 기록 | 8 |
| 10 | 좌석 현황 & 배치도 | 1 |
| 11 | 좌석 상세 & 예약 | 10 |
| 12 | 좌석 필터 & 추천 | 10 |
| 13 | 좌석 상태 관리 (개발용) | 10 |
| 14 | 메인 대시보드 | 4, 5, 6, 10 |
| 15 | 반응형 · 접근성 · 컨셉 QA | 전체 |

---

### 1단계 — 디자인 시스템 & 공통 레이아웃

모든 기능이 올라갈 바탕. 이후 단계는 여기서 만든 토큰과 공용 컴포넌트만 쓴다.

**구현**
- [x] Next.js + TypeScript(strict) 프로젝트 생성, 템플릿 파일 정리
- [x] `globals.css` — 컬러 토큰(2.1), 리셋, 공통 유틸(`.container`, `.btn`, `.section-head`, `.scroll-x` 등)
- [x] `layout.tsx` — `next/font` 로 Playfair Display · Oswald · Noto Sans KR 연결 (한글은 Noto Sans KR 로 대체되도록 글꼴 순서 지정)
- [x] `(site)/layout.tsx` — 사용자 사이트 route group 에 Header/Footer (관리자 화면과 분리)
- [x] `components/ComingSoon.tsx` — 아직 구현 전인 /, /menu, /seat, /race, /event 의 임시 화면
- [x] `components/Header.tsx` — HOME/MENU/SEAT/RACE/EVENT, 현재 경로 강조, 모바일 햄버거
- [x] `components/Footer.tsx` — 영업 정보, 레이스 시각, 비현금 이벤트 고지 문구
- [x] `components/Modal.tsx` — ESC 닫기, 포커스 트랩, 배경 클릭 닫기, 모바일 Bottom Sheet 변형
- [x] `components/TicketBadge.tsx` — BEST / WINNER / NEW / MY PICK
- [x] `components/Scoreboard.tsx` — 전광판 숫자 칸
- [x] `components/HorseAvatar.tsx` — 말 마스코트 SVG (대표색 주입, 달리기 애니메이션)
- [x] `components/UserProvider.tsx` + `types/common.ts` — 쿠폰 Context 뼈대
- [x] `app/not-found.tsx` — 경마장 컨셉의 404
- [x] (2026-10-08 재구성) 화이트 베이스 · Pretendard · 초록 포인트로 토큰·헤더(쿠폰 칩 포함)·푸터·버튼·모달·배지·전광판 재정비. 메인에 `Hero`(슬라이더 골격) + `MenuLineup` 선반영 — 8.1 참고
**완료 확인**
- [x] 5개 메뉴 링크가 모두 동작하고(빈 페이지라도) 현재 경로가 강조된다
- [x] 860px 이하에서 햄버거 메뉴가 열리고 닫힌다
- [x] 흰 배경 · 흰 헤더 · 짙은 초록 푸터 · Pretendard 제목이 적용되고, 경마장 느낌은 티켓 배지·전광판·카피로 드러난다
- [x] `npm run build`, `npm run lint` 통과

---

### 2단계 — (관리자) 메뉴 관리

메뉴 데이터의 구조와 CRUD 를 먼저 확정한다. 4단계(메뉴 조회)와 14단계(대시보드)가 이 데이터를 쓴다. 설계: 8.6, 8.7.

**구현**
- [x] `app/(site)/menu/_types.ts` — `Menu`, `MenuStatus`, `MenuInput`, `Category`
- [x] `app/(site)/menu/_data/menus.ts`, `categories.ts` — Mock Data (SOLD_OUT·HIDDEN 각 1개 포함)
- [x] `public/images/menus/` — 메뉴 일러스트 SVG
- [x] `menuService.ts` — `getMenus`, `getCategories`, `createMenu`, `updateMenu`, `deleteMenu`, `updateMenuStatus`
- [x] `app/admin/layout.tsx` + `AdminNav` — 관리자 레이아웃, MOCK ADMIN 안내 띠
- [x] `app/admin/page.tsx` — `/admin/menus` 로 이동
- [x] `admin/_components/ConfirmDialog.tsx` — 삭제 확인창
- [x] `admin/_components/AdminToast.tsx` — 결과 알림 + `useToast()`
- [x] `admin/menus/_lib/validateMenu.ts` — 필수값 · 가격 · 설명 길이 · WINNER 중복 검증
- [x] `admin/menus/_hooks/useMenuAdmin.ts` — 목록 State, 검색·필터, 등록/수정/삭제/상태 변경
- [x] `MenuAdminTable.tsx` — 목록 표 + 검색 · 카테고리 · 상태 필터, 상태 즉시 변경
- [x] `MenuForm.tsx` — 등록/수정 모달 폼, 필드별 오류 메시지
- [x] 저장·삭제 결과 알림

**완료 확인**
- [x] 메뉴를 등록하면 목록에 바로 나타난다
- [x] 수정하면 목록 값이 바뀌고, 취소하면 바뀌지 않는다
- [x] 삭제는 확인창을 거쳐야만 실행된다
- [x] 이름 누락 · 음수 가격 · WINNER 중복 시 저장되지 않고 이유가 표시된다
- [x] 검색어 · 카테고리 · 상태 필터가 함께 적용된다
- [x] 목록에서 판매중/품절/숨김을 바로 바꿀 수 있다

---

### 3단계 — (관리자) 카테고리 관리

카테고리를 enum 이 아닌 데이터로 운영한다. 설계: 8.8.

**구현**
- [x] `menuService.ts` — `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories`
- [x] `admin/categories/_lib/validateCategory.ts` — 필수값 · 이름 중복 검증
- [x] `admin/categories/_hooks/useCategoryAdmin.ts` — 목록 State, 추가/수정/삭제/순서/노출
- [x] `CategoryList.tsx` — 순서(▲▼), 이름, 메뉴 수, 노출 토글, 수정/삭제
- [x] `CategoryForm.tsx` — 추가/수정 폼
- [x] `AdminNav` 에 카테고리 관리 연결
- [x] 메뉴 관리 폼의 카테고리 선택이 `getCategories()` 를 쓰는지 확인

**완료 확인**
- [x] 카테고리를 추가·이름 수정할 수 있고, 중복 이름은 막힌다
- [x] ▲▼ 로 순서를 바꾸면 목록 순서가 즉시 바뀐다 (키보드로도 가능)
- [x] 메뉴가 있는 카테고리는 삭제할 수 없고 안내가 나온다
- [x] 메뉴 0개 카테고리는 확인창을 거쳐 삭제된다
- [x] 각 카테고리의 메뉴 수가 실제 메뉴 데이터와 맞다

---

### 4단계 — 메뉴 조회 (`/menu`)

손님용 메뉴판. 2·3단계의 데이터를 경마 티켓 스타일로 보여 준다. 설계: 8.4.

**구현**
- [ ] `menuService.ts` — `getTodayWinnerMenu`
- [ ] `MenuCategory.tsx` — 노출 카테고리 탭(`order` 순) + 전체 탭
- [ ] `MenuCard.tsx` — 티켓 카드(이미지 · 한/영 이름 · 가격 점선 리더 · 설명 · STUB 일련번호)
- [ ] BEST / WINNER 배지, 품절 스탬프
- [ ] `app/(site)/menu/page.tsx` 조립

**완료 확인**
- [ ] 탭을 바꾸면 해당 카테고리 메뉴만 보인다
- [ ] 숨김 카테고리 · HIDDEN 메뉴는 보이지 않는다
- [ ] 품절 메뉴는 "품절"로 구분된다
- [ ] PC 3열 / 태블릿 2열 / 모바일 1열

---

### 5단계 — 쿠폰 지갑 & 이벤트 (`/event`)

레이스 참가권과 보상 쿠폰의 단일 소스(UserProvider)를 완성한다. 설계: 7, 8.5.

**구현**
- [ ] `UserProvider` — `coupons`, `rewards`, `spendCoupon()`, `addReward()` 완성 (`INITIAL_COUPONS = 5`)
- [x] Header 쿠폰 칩이 Context 값을 표시 (1단계 재구성 때 선반영)
- [ ] `app/(site)/event/_types.ts`, `_data/events.ts`, `_lib/eventService.ts`
- [ ] `CouponCard.tsx` — Race Ticket 디자인, 사용 여부 스탬프
- [ ] `EventCard.tsx` — 이벤트 소개 + `/race` 이동 버튼
- [ ] 쿠폰 0장 빈 상태

**완료 확인**
- [ ] 쿠폰 수가 Header 와 `/event` 에서 같다
- [ ] `spendCoupon()` 은 0장일 때 false 를 돌려주고 수가 음수가 되지 않는다
- [ ] Race 참여하기 버튼이 `/race` 로 이동한다

---

### 6단계 — 경주 일정 & 카운트다운

메인 · `/race` · Header 가 함께 쓰는 시간 기능.

**구현**
- [ ] `lib/time.ts` — `RACE_TIMES`, `getNextRaceTime`, `getLiveRaceTime`, 시각 포맷
- [ ] `lib/useCountdown.ts` — 1초 시계, 하이드레이션 전 `--:--:--`
- [ ] `RaceCountdown.tsx` — `/race` 헤더 전광판(다음 경기 · 남은 시간 · 내 쿠폰)
- [ ] Header RACE 메뉴의 LIVE 표시(경주 시작 후 10분)

**완료 확인**
- [ ] 카운트다운이 1초마다 줄어든다
- [ ] 경주 시각이 지나면 다음 경주로 넘어가고, 마지막 경주 뒤에는 내일 첫 경주를 가리킨다
- [ ] 새로고침 시 하이드레이션 경고가 없다

---

### 7단계 — 말 출전표 & 쿠폰 사용 (`/race` BETTING)

설계: 8.2 화면 구성 1~3.

**구현**
- [ ] `app/(site)/race/_types.ts`, `_data/horses.ts`, `_lib/raceService.ts` (`getHorses`, `placeBet`)
- [ ] `HorseCard.tsx` — 번호 · 이름 · 마스코트 · 대표색 · 성격 · 최근 성적 · 설명 · 선택 버튼
- [ ] `BetConfirmModal.tsx` — "OOO에 쿠폰 1장을 사용하시겠습니까?"
- [ ] `useRace` — BETTING → READY 전환, 쿠폰 차감
- [ ] 쿠폰 0장이면 선택 버튼 비활성 + 안내

**완료 확인**
- [ ] 출전표 7장이 보이고 최근 성적 1위가 금색으로 강조된다
- [ ] 확인 → 쿠폰 1장 감소(Header 에도 반영), 취소 → 변화 없음
- [ ] 0장일 때 선택할 수 없다

---

### 8단계 — 경주 시뮬레이션 & 애니메이션 (`/race` READY → RUNNING)

설계: 8.2 상태 머신 · 레이스 시뮬레이션.

**구현**
- [ ] `_lib/simulation.ts` — `createRace`, `step` (기본 속도 · trait 구간 배율 · 랜덤 이벤트 · 도착 순위 · 18초 안전장치)
- [ ] `_lib/messages.ts` — 이벤트 메시지 템플릿
- [ ] `useRace` — 3·2·1 카운트, rAF 루프(effect 안), dt clamp, 메시지 큐(1.5초씩)
- [ ] `HorseTrack.tsx` · `HorseRunner.tsx` — 가로 트랙 7레인, START/FINISH, 내 말 레인 강조, 실시간 1~3위
- [ ] `RaceEventMessage.tsx` — 트랙 상단 토스트

**완료 확인**
- [ ] 시뮬레이션을 여러 번 돌려 경주 시간이 10~15초 안에 들어오는지 확인
- [ ] 말마다 우승 확률이 한쪽으로 크게 쏠리지 않는다
- [ ] 경주 중 추월이 눈에 보이고 이벤트 메시지가 1~2초 보였다 사라진다
- [ ] 다른 페이지에 갔다 돌아와도 경주가 이어진다

---

### 9단계 — 경주 결과 · 보상 · 기록 (`/race` FINISHED)

설계: 8.2 화면 구성 5~6.

**구현**
- [ ] `_data/raceHistory.ts`, `raceService.getRaceHistory`
- [ ] `RaceResultModal.tsx` — 1~3위, YOUR HORSE, WIN! / NEXT TIME!
- [ ] 우승 시 `addReward(FREE_AMERICANO)` + confetti
- [ ] `RaceHistory.tsx` — RECENT RACES 최근 5경기, 방금 경주를 맨 앞에 추가
- [ ] 다시 하기 → BETTING 초기화

**완료 확인**
- [ ] 결과 모달의 순위가 트랙 도착 순서와 같다
- [ ] 1위를 맞히면 `/event` 에 무료 아메리카노 쿠폰이 생긴다
- [ ] 다시 하기 후 새 경주의 번호가 1 늘어난다

---

### 10단계 — 좌석 현황 & 배치도 (`/seat`)

설계: 8.3 레이아웃 · CafeFloorPlan · Seat 컴포넌트.

**구현**
- [ ] `app/(site)/seat/_types.ts`, `_data/seats.ts`(30석), `_data/floorPlan.ts`(구조물 · 구역)
- [ ] `_lib/seatService.ts` — `getSeats`, `getFloorPlan`, `getSeatSummary`
- [ ] `_lib/labels.ts`, `_lib/summary.ts`
- [ ] `SeatSummary.tsx` — AVAILABLE SEATS 전광판 + 인원별 집계 + 마지막 업데이트
- [ ] `SeatLegend.tsx` — 색 + 아이콘 + 텍스트 범례
- [ ] `CafeFloorPlan.tsx` — 창문 · 카운터 · 출입구 · 화장실 · 통로 · 구역 라벨
- [ ] `Seat.tsx` — 상태별 디자인, 테이블/바 모양, 44px 터치 영역

**완료 확인**
- [ ] 요약 숫자(12/30 등)가 seats 데이터에서 계산된 값과 같다
- [ ] `seats.ts` 의 x, y 만 바꿔도 배치도 위치가 바뀐다
- [ ] HTML `<table>` 없이 평면도로 그려진다
- [ ] 상태를 색 없이도(아이콘·텍스트로) 구분할 수 있다

---

### 11단계 — 좌석 상세 & 예약

설계: 8.3 좌석 상세 & 예약.

**구현**
- [ ] 좌석 클릭 → 선택 상태
- [ ] `SeatDetailPanel.tsx` — ID · 타입 · 상태 · 위치 · 특징 목록, PC 사이드 패널 / 모바일 Bottom Sheet
- [ ] `seatService.reserveSeat` → 상태 RESERVED, "예약되었습니다." 스탬프
- [ ] AVAILABLE 이 아니면 예약 버튼 대신 상태 안내

**완료 확인**
- [ ] 예약하면 배치도 · 요약 숫자가 즉시 바뀐다
- [ ] 사용 중 · 예약 · 수리 중 좌석은 예약할 수 없다
- [ ] 모바일에서 시트가 열리고 ESC · 배경 탭으로 닫힌다

---

### 12단계 — 좌석 필터 & 추천

설계: 8.3 필터 · 추천.

**구현**
- [ ] `_lib/filter.ts` — `matchesFilter` (이용 가능만 · 인원 · 특징 AND)
- [ ] `_lib/recommend.ts` — 점수 계산, 상위 3개, 추천 사유 문구
- [ ] `_hooks/useSeatFilter.ts`
- [ ] `SeatFilter.tsx` — 전체/이용 가능만, 인원 select, 특징 체크박스, 초기화
- [ ] `RecommendedSeat.tsx` — 추천 목록, 조건 미선택 안내, 결과 없음 + 대안 1개
- [ ] 배치도: 불일치 좌석 반투명, 추천 좌석 금색 강조 + ★

**완료 확인**
- [ ] "이용 가능만 + 콘센트 + 1~2명"에서 맞는 좌석만 선명하게 보인다
- [ ] 맞지 않는 좌석도 사라지지 않고 흐리게 남는다
- [ ] 추천 항목을 누르면 해당 좌석의 상세가 열린다
- [ ] "4명" 조건에서 4인석이 6·8인석보다 먼저 추천된다

---

### 13단계 — 좌석 상태 관리 (개발용)

추후 관리자 좌석 관리의 미리보기. 설계: 8.3 관리자 대비 구조.

**구현**
- [ ] `seatService.updateSeatStatus`
- [ ] `SeatStatusDevTool.tsx` — 좌석 선택 + 상태 라디오, 개발 모드에서만 렌더

**완료 확인**
- [ ] 상태를 바꾸면 요약 · 배치도 · 추천 · 상세가 모두 즉시 바뀐다
- [ ] production 빌드에서는 보이지 않는다

---

### 14단계 — 메인 대시보드 (`/`)

앞 단계의 Service 들을 모아 보여 주는 화면. 설계: 8.1.

**구현**
- [x] `Hero.tsx` — 전폭 슬라이더 골격(탭 페이지네이션 · 자동 전환 · 진행바). 현재 NEXT RACE 1장(준비 중 문구 + 사진)
- [x] `MenuLineup.tsx` + `_lib/lineup.ts` — TODAY'S LINEUP 배지 메뉴 8개 그리드
- [ ] NEXT RACE 슬라이드에 카운트다운 연결(6단계 뒤)
- [ ] 히어로 슬라이드 추가 — 오늘의 WINNER 메뉴 · 이용 가능 좌석 · 내 쿠폰/이벤트 (각 Service 값으로 page 가 조립)
- [ ] `DashboardCard.tsx` — 이용 가능 좌석 · 오늘의 인기 메뉴 · 내 쿠폰 · 다음 경주 (슬라이드로 흡수할지 별도 섹션으로 둘지 결정)
- [ ] `app/(site)/page.tsx` — `getSeatSummary`, `getTodayWinnerMenu` 를 각 라우트 Service 에서 가져와 조립

**완료 확인**
- [ ] 카드 4개가 각각 `/seat`, `/menu`, `/event`, `/race` 로 이동한다
- [ ] 쿠폰 수가 Header · `/event` 와 같다
- [ ] 다른 라우트의 `_components/`·`_data/` 를 직접 import 하지 않는다

---

### 15단계 — 반응형 · 접근성 · 컨셉 QA

**구현 / 점검**
- [ ] 360px · 768px · 1280px 에서 모든 페이지 확인
- [ ] 트랙(min 640px) · 배치도는 가로 스크롤, 스크롤 힌트 표시
- [ ] 좌석 · 버튼 터치 영역 44px 이상
- [ ] 키보드만으로 메뉴 이동 · 말 선택 · 좌석 선택 · 모달 닫기 가능
- [ ] `prefers-reduced-motion` 에서 장식 애니메이션 꺼짐
- [ ] 관리자 표가 모바일에서 카드 목록으로 바뀜

**완료 확인**
- [ ] 아래 "컨셉 일관성" 표의 6개 항목을 모두 만족한다
- [ ] `npm run build`, `npm run lint` 경고 · 오류 없음

**최종 체크 — 컨셉 일관성**

| 영역 | 보여야 하는 느낌 |
|---|---|
| 메인 | 레이스 안내 배너(전광판 탭) + 출전 메뉴 라인업 |
| 말 | 카페 마스코트 |
| 메뉴 | 경마 티켓 |
| 좌석 | 경기장 좌석 안내도 |
| 이벤트 | Race Event |
| 쿠폰 | Race Ticket |

사이트에 처음 들어온 사람이 "아, 경마장 테마 카페구나"라고 바로 느끼면 성공이고, "도박 사이트인가?"라는 생각이 들면 실패다.
