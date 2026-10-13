# BLUEPRINT — Frontend (경마장 컨셉 카페)

> 원본 요구사항: [frontend-지시서.md](frontend-지시서.md)
> 이 문서는 지시서를 **구현 가능한 설계도**로 옮긴 것이다. 구현 중 판단이 필요할 때 이 문서를 기준으로 삼고, 설계가 바뀌면 이 문서도 함께 고친다.
> 기존 `frontend/` 폴더는 참고하지 않는다. 새 `frontend/` 프로젝트를 처음부터 만든다는 전제다.

---

## 0. 한눈에 보기

| 항목 | 결정 |
|---|---|
| 프레임워크 | Next.js (App Router) + TypeScript (strict) |
| 스타일 | CSS Modules + 전역 CSS 변수(디자인 토큰). 화이트 베이스 · 그레이스케일 포인트. 외부 UI 라이브러리 없음(렌더링 엔진 `pixi.js` 는 `/race` 경기 화면 전용 · 동적 import) |
| 브랜드 | `manhattaN cafe` (표기 그대로 — 대문자 N) · 워드마크 `components/BrandLogo.tsx` |
| 폰트 | Pretendard(가변) 하나로 통일 — CDN 동적 서브셋 `<link>`. 세리프·전광판 전용 폰트 없음 |
| 상태 | React State + Context(쿠폰·내 정보처럼 페이지를 넘나드는 값만) |
| 폴더 구조 | 라우트 단위 Colocation (`app/<route>/_components·_hooks·_lib·_data·_types.ts`) |
| 데이터 | `_data/*.ts` Mock → `_lib/*Service.ts` → 컴포넌트 (API 교체 지점은 Service 파일 하나) |
| 애니메이션 | 레이스 경기 화면: **PixiJS v8(WebGL) 캔버스** + `requestAnimationFrame`(사용자 결정 2026-10-13). 나머지: CSS transition/keyframes |
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
│  ├─ layout.tsx                  # 루트: <html>, 폰트, UserProvider · CartProvider (Header/Footer 없음)
│  ├─ globals.css                 # 디자인 토큰(CSS 변수) + 리셋 + 공통 유틸
│  ├─ not-found.tsx               # 404 "OFF TRACK"
│  │
│  ├─ (site)/                     # 사용자 사이트 route group — URL 에는 (site) 가 붙지 않는다
│  │  ├─ layout.tsx               # Header + Footer
│  │  ├─ page.tsx                 # /  메인 — Hero + MenuLineup 조립
│  │  ├─ _components/             # 메인(/) 전용
│  │  │  ├─ Hero.tsx              # 전폭 슬라이더 + 하단 탭 페이지네이션 (hero.module.css)
│  │  │  ├─ HeroRaceClock.tsx     # NEXT RACE 슬라이드의 다음 경주 시각 · 카운트다운 · SOON/LIVE + 탭 제목
│  │  │  ├─ MenuLineup.tsx        # TODAY'S LINEUP 4열 메뉴 그리드, "use cache" (menuLineup.module.css)
│  │  │  └─ DashboardCard.tsx     # (14단계) 좌석/인기메뉴/쿠폰/다음경주 카드 (Link)
│  │  ├─ _lib/
│  │  │  └─ lineup.ts             # 라인업 선정 순수 함수 (WINNER → BEST → NEW, 품절은 뒤로)
│  │  ├─ _data/
│  │  │  └─ heroSlides.ts         # 히어로 슬라이드 문구·이미지 (값만)
│  │  ├─ _types.ts                # HeroSlide
│  │  │
│  │  ├─ race/                    # /race  ★ 핵심
│  │  │  ├─ page.tsx              # "use cache" — 제목 → RaceCountdown → RaceBoard(출전마 · 지난 기록을 Service 에서)
│  │  │  ├─ _components/
│  │  │  │  ├─ RaceBoard.tsx      # 출전표 + 보상 안내 + 트랙 무대(READY 이후) + 확인창 조립 (client, useRace)
│  │  │  │  ├─ HorseCard.tsx      # 출전표 카드(게이트 번호 · 이름 · 말 이미지 · 성향 · 최근 성적 · 선택 버튼)
│  │  │  │  ├─ GateBadge.tsx      # 게이트 번호 원(대표색 = 조끼 색, 글자색은 대비 계산)
│  │  │  │  ├─ PayoutGuide.tsx    # "쿠폰 1장으로 참여 · [1위 4장] [2위 3장] [3위 2장] 돌려받기"
│  │  │  │  ├─ BetConfirmModal.tsx# "MOCHA에 쿠폰 1장을 사용하시겠습니까?"
│  │  │  │  ├─ HorseTrack.tsx     # 트랙 무대 — 머리띠(READY · [경주 시작] · LIVE · FINISH) + 경기 화면(PixiJS 캔버스, _lib/trackScene) + HUD(순위 · 남은 거리) + 카운트다운 · 토스트(DOM)
│  │  │  │  ├─ RaceCountdown.tsx  # 상단 전광판(다음 경기 · 남은 시간 · 내 쿠폰)
│  │  │  │  ├─ RaceEventMessage.tsx # 경기 중 이벤트 토스트(캔버스 위 DOM, 1.5초)
│  │  │  │  ├─ RaceResult.tsx     # 경주 결과 — 최근 경주 1~7위(트랙 무대와 출전표 사이), 내 말 MY PICK · WIN/PLACE/SHOW
│  │  │  │  ├─ RaceResultModal.tsx
│  │  │  │  ├─ RaceHistory.tsx    # RECENT RACES
│  │  │  │  └─ race.module.css    # /race 스타일(전광판부터 7~9단계에서 이어 붙임)
│  │  │  ├─ _hooks/
│  │  │  │  └─ useRace.ts         # useRace(기록 합치기 · 경주 번호 · 쿠폰 걸기 · 출발) + useRaceRun(rAF 루프 — 캔버스 매 프레임 · DOM 10Hz · 토스트 큐)
│  │  │  ├─ _lib/
│  │  │  │  ├─ simulation.ts      # 순수 함수: createRace · step · advanceTo(속도 · 성향 · 이벤트 · 순위 · 18초 안전장치) — UI 의존 없음
│  │  │  │  ├─ messages.ts        # 이벤트 메시지 템플릿
│  │  │  │  ├─ trackScene.ts      # PixiJS 장면(잔디 · 울타리 · 말 · 결승선 · 먼지) + 카메라(cameraFor) — React 와 무관
│  │  │  │  ├─ payout.ts          # RACE_ENTRY_COUPONS · RACE_PAYOUT · payoutFor · payoutTable · payoutSummary
│  │  │  │  ├─ records.ts         # 순수 함수: nextRaceNo · recentRanks · backfillHistory(지나간 경주 결정적 보충) · mergeHistory · formatRaceDate · rankLabel · TRAIT_LABEL · textOn
│  │  │  │  └─ raceService.ts     # 데이터 접근(getHorses, getRaceHistory, placeBet)
│  │  │  ├─ _data/
│  │  │  │  ├─ horses.ts          # 7마리(이미지 · 조끼 색)
│  │  │  │  └─ raceHistory.ts     # Race #8~#12, 경주마다 7마리 전체 순위
│  │  │  ├─ _types.ts             # Horse, RaceStage, RaceResult, RaceBet, RaceEventMessage, RunnerState, RaceRun ...
│  │  │  └─ lab/                  # /race/lab 개발용 실험실(시드 · 배속 · 되감기 · 이벤트 강제) — 쿠폰 · 단계와 무관, noindex
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
│  │  │  ├─ [id]/                 # /menu/[id] 메뉴 상세
│  │  │  │  ├─ page.tsx           # generateStaticParams(메뉴판에 보이는 메뉴) + 상세 조립
│  │  │  │  └─ not-found.tsx      # HIDDEN · 숨김 카테고리 · 없는 id → "SCRATCHED"
│  │  │  ├─ _components/
│  │  │  │  ├─ MenuBoard.tsx      # 검색창 + 탭 + 티켓 그리드 (client, 검색어·탭 State)
│  │  │  │  ├─ MenuSearch.tsx     # 검색창(Esc · × 로 지우기)
│  │  │  │  ├─ MenuCategory.tsx   # 카테고리 탭
│  │  │  │  ├─ MenuCard.tsx       # 티켓 스타일 메뉴 카드 (누르면 상세) — 가격은 STUB 안(음료 S·M·L·XL, 디저트 ONE SIZE)
│  │  │  │  ├─ MenuDetail.tsx     # 상세 — 크게 펼친 티켓 + 같은 카테고리 메뉴
│  │  │  │  ├─ FavoriteButton.tsx # 상세 전용 ♡ 찜하기 토글(client, useUser · aria-pressed)
│  │  │  │  └─ AddToCart.tsx      # 상세의 주문 영역(client) — 사이즈(가격 포함) · 수량 · 합계 · 장바구니 담기
│  │  │  ├─ _lib/
│  │  │  │  ├─ menuBoard.ts       # 순수 함수: 메뉴판 선정(selectBoard) · 상세 선정(selectDetail) · 일련번호
│  │  │  │  ├─ menuSearch.ts      # 순수 함수: 검색 매칭(부분 일치 + 한글 초성)
│  │  │  │  ├─ menuSize.ts        # MENU_SIZES(S·M·L·XL 순서) · priceOf(menu, size)
│  │  │  │  └─ menuService.ts     # 메뉴·카테고리 조회 + 관리자 CRUD (메뉴 도메인의 유일한 데이터 창구)
│  │  │  ├─ _data/
│  │  │  │  ├─ menus.ts           # 메뉴(음료는 sizePrices) + 관리자 폼용 이미지 목록(MENU_IMAGES)
│  │  │  │  └─ categories.ts
│  │  │  └─ _types.ts             # Menu, MenuStatus, MenuBadge, MenuSize, SizePrices, Category, MenuInput, CategoryInput
│  │  │
│  │  ├─ cart/                    # /cart 장바구니 (Header 아이콘에서 진입)
│  │  │  ├─ page.tsx
│  │  │  ├─ _components/
│  │  │  │  ├─ CartView.tsx       # 담은 메뉴 목록(사이즈별 줄 · 수량 · 삭제) + 주문 요약 · 주문하기(목업) (client, useCart)
│  │  │  │  └─ cart.module.css
│  │  │  └─ _lib/
│  │  │     └─ orderService.ts    # placeOrder(lines) → Order(장바구니 사본 · 합계 · 적립 쿠폰) — 목업 주문
│  │  │
│  │  ├─ event/                   # /event  진행 중인 이벤트 (내 쿠폰은 /my)
│  │  │  ├─ page.tsx              # "use cache" — 모두에게 같은 내용
│  │  │  ├─ _components/
│  │  │  │  ├─ EventCard.tsx      # 가로 경마 티켓(STUB: 일련번호 · 기간 · 시각 | 이름 · 설명 · 버튼)
│  │  │  │  └─ event.module.css
│  │  │  ├─ _lib/
│  │  │  │  └─ eventService.ts    # getEvents
│  │  │  ├─ _data/
│  │  │  │  └─ events.ts
│  │  │  └─ _types.ts             # CafeEvent
│  │  │
│  │  └─ my/                      # /my  마이페이지 (로그인 없이 Mock 사용자 1명)
│  │     ├─ page.tsx              # "use cache" — 프로필 + 찜 후보 메뉴(메뉴 Service) 조립, 섹션 세로 나열
│  │     ├─ _components/
│  │     │  ├─ MyOverview.tsx     # 내 정보(Mock 프로필) + 요약 전광판(쿠폰 · 찜 · 주문 수 → #앵커)
│  │     │  ├─ OrderHistory.tsx   # 주문 내역 — 영수증 카드, 최근 3건 + 전체 보기
│  │     │  ├─ FavoriteMenus.tsx  # 찜한 메뉴 — 정사각 썸네일 카드, 최근 4개 + 전체 보기
│  │     │  ├─ MyCoupons.tsx      # 쿠폰 — 얻는 법 · 교환 준비 중 안내 + CouponHistory
│  │     │  ├─ CouponHistory.tsx  # 쿠폰 적립·사용 내역 — Race Ticket 스타일 줄, 최근 5건 + 전체 보기
│  │     │  ├─ PlannedSection.tsx # 준비 중 섹션 자리(내 레이스 기록 · 좌석 예약 내역)
│  │     │  ├─ MySection.tsx      # SectionHead · SectionEmpty · ShowMoreButton
│  │     │  └─ my.module.css
│  │     ├─ _hooks/
│  │     │  └─ useShowMore.ts     # 처음 N개 → 전체 보기 / 접기
│  │     ├─ _lib/
│  │     │  ├─ myService.ts       # getProfile
│  │     │  └─ format.ts          # 날짜 · 일련번호 · 금액 표시
│  │     ├─ _data/
│  │     │  └─ profile.ts         # MOCK_PROFILE
│  │     └─ _types.ts             # UserProfile
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
│  ├─ BrandLogo.tsx               # manhattaN cafe 워드마크(인라인 SVG, currentColor) — 한 줄형 / 적층형, slashOpacity
│  ├─ Header.tsx                  # 로고(BrandLogo) + HOME/MENU/SEAT/RACE/EVENT/MY + 내 쿠폰 수(→ /my#coupons) + 장바구니(수량)
│  ├─ Footer.tsx
│  ├─ Modal.tsx                   # 공용 모달(포커스 트랩, ESC 닫기, 배경 클릭 닫기, 모바일 Bottom Sheet)
│  ├─ TicketBadge.tsx             # BEST / WINNER / NEW / MY PICK 경마 티켓 배지
│  ├─ Scoreboard.tsx              # 전광판 스타일 숫자 박스(카운트다운·좌석 수 공용, 어두운 배경용 onDark)
│  ├─ RacePhaseBadge.tsx          # SOON(테두리) · LIVE(빨강 + 깜빡이는 점) 배지 — 메인 히어로 · /race 공용
│  ├─ HorseAvatar.tsx             # 말 마스코트(SVG, 대표색 주입) — 메인 Hero · /race 공용
│  ├─ UserProvider.tsx            # "내 것" Context(쿠폰 · 쿠폰 내역 · 찜 · 주문 내역) + useUser() 훅
│  ├─ CartProvider.tsx            # 장바구니 Context + useCart() 훅 (Header · /menu/[id] · /cart)
│  ├─ RaceProvider.tsx            # 레이스 진행 Context(단계 · 내가 건 말 · 진행 중 시뮬레이션 ref · 도착 순서 · 이 세션의 경주 결과) + useRaceSession() 훅
│  ├─ QuantityStepper.tsx         # 수량 − / + (/menu/[id] 담기 · /cart 공용)
│  ├─ ComingSoon.tsx              # 아직 구현 전인 사용자 페이지의 임시 화면 (전 페이지 구현 후 삭제)
│  ├─ layout.module.css           # Header · Footer · 사이트 골격
│  └─ ui.module.css               # Modal · TicketBadge · Scoreboard · HorseAvatar · QuantityStepper
│
├─ lib/                           # 2개 이상 페이지가 쓰는 공용 로직
│  ├─ cart.ts                     # 장바구니 순수 함수(담기 합치기 · 수량 1~20 · 총 수량 · 합계)
│  ├─ time.ts                     # 순수 함수: RACE_TIMES(KST) · 다음/진행 중 경주 · SOON/LIVE 단계 · 카운트다운 포맷
│  └─ useCountdown.ts             # 공용 1초 시계(useSyncExternalStore) — useNow · useRaceCountdown · useRacePhase
│
├─ types/
│  └─ common.ts                   # CouponReason, CouponLog, Order, UserState, CartLine, CartItem, CartState 등 공용 타입
│
├─ scripts/
│  └─ split-horses.mjs            # 말에셋 시트 → public/images/horses/*.png (개발용, Next 의 sharp 사용)
│
├─ assets/
│  └─ horse-sheet.png             # 말에셋.png 원본(1536×1024, 4열 × 3줄, 조끼 번호 1~12) — 배포되지 않음
│
└─ public/
   └─ images/
      ├─ hero/                    # 히어로 사진 (next-race.jpg) + CREDITS.md 출처·라이선스
      ├─ horses/                  # 출전마 7장(thunder · latte · mocha · espresso · caramel · vanilla · cookie), 420×300 투명 PNG
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
> 같은 날 manhattaN cafe 로고 도입에 맞춰 포인트 컬러를 짙은 초록 → **그레이스케일**로 바꾸고 토큰 이름도 `--green-*` → `--brand-*` 로 바꿨다(관리자·좌석 상태색 포함 사이트 전체).
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

  /* Brand — 그레이스케일, "포인트"에만: 버튼, 배지, 현재 메뉴 밑줄, 전광판 */
  --brand-900: #141416;   /* 히어로 바탕, 전광판 칸, 강조 버튼, 관리자 사이드바 */
  --brand-800: #232326;
  --brand-700: #333338;   /* 기본 버튼, 밑줄, 아이콘 */
  --brand-600: #47474d;   /* eyebrow */
  --brand-500: #5e5e65;
  --brand-400: #85858c;
  --brand-300: #c2c2c7;   /* 어두운 배경 위 소제목·진행바 */
  --brand-100: #e8e8ea;   /* 선택 상태 배경 */
  --brand-50:  #f4f4f5;

  /* Accent (조금만) */
  --gold-500: #c9a227;    /* WINNER 전용 */
  --red-600:  #c6382c;    /* BEST 배지, 품절, 위험 동작, LIVE */

  /* Border */
  --border: rgba(15, 16, 17, 0.08);
  --border-strong: rgba(15, 16, 17, 0.18);

  /* 좌석 상태 */
  --seat-available: #333338; /* 짙은 회색 — 수리 중(#8a8a8a)과 명도로 구분 */
  --seat-using:     #8b5e3c;
  --seat-reserved:  #c9a227;
  --seat-repair:    #8a8a8a;

  /* Shape: --radius-sm 6px · --radius-md 10px · --radius-lg 16px · --radius-pill */
}
```

- 배경은 흰색, 텍스트는 거의 검정. 넓은 어두운 색면은 **히어로(이미지 위 어두운 그라데이션)** 한 곳뿐이고, 푸터는 옅은 회색(`--bg-muted`) 블록이다.
- 회색 포인트(`--brand-*`)·금색·빨간색은 **포인트 전용**이다. 유채색은 금색(WINNER)과 빨간색(BEST·품절·위험) 둘뿐이다. 종이 질감, 이중 테두리, 네온, 검정+금 조합, 칩·룰렛·카드 이미지는 쓰지 않는다(카지노처럼 보이지 않게).

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
| **전광판** | Hero, 카운트다운, 좌석 요약 | 짙은 회색(`--brand-900`) 배경, 금색 얇은 테두리, 칸막이 숫자 |
| **출전표** | 말 선택 카드 | 번호 큰 원형 배지(대표색), 이름, 성적표 행 |
| **트랙** | 레이스, 장식 구분선 | 초록 잔디 + 흰 레인선 + 체크무늬 FINISH 라인 |
| **좌석 안내도** | 좌석 페이지 | 경기장 좌석 안내도처럼 구역명 라벨 + 구역 색 테두리 |

공통: 모서리 6–16px, 1px 연한 테두리(`--border`), 질감·이중 테두리 없음, 그림자는 모달 정도에만. 전광판은 짙은 회색 칸 + 흰 숫자로 단순화.

### 2.4 말 마스코트

- 사실적인 말 금지. **둥글고 귀여운 2–3등신 마스코트**를 인라인 SVG 한 장으로 만들고 `color` prop 으로 몸통/갈기 색을 바꾼다 (`HorseAvatar`).
- 각 말에 번호 조끼(saddle cloth) + 카페 소품(컵, 쿠키 등) 하나씩으로 개성을 준다.
- 트랙 위에서는 캔버스 스프라이트로 작게 + 상하 들썩임 · 먼지(8단계, PixiJS ticker — `prefers-reduced-motion` 이면 끔).
- **출전마 7마리는 SVG 대신 이미지 에셋을 쓴다(2026-10-13 사용자 결정)**: `말에셋.png`(달리는 자세의 귀여운 말 12마리, 조끼 번호 1~12)를 `scripts/split-horses.mjs` 로 잘라 `public/images/horses/` 에 둔다. 이름에 어울리는 털색의 말을 골랐으므로 **이미지 조끼 숫자와 게이트 번호가 다를 수 있다**(사용자 결정). 대표색은 그 조끼 색. 자를 때 배경 잔여물(옅은 픽셀 · 40px 미만 점)을 지우고, 7장을 같은 420×300 캔버스에 가운데 · 바닥 맞춤으로 놓아 크기가 일정하다. `HorseAvatar`(SVG)는 마이페이지 프로필 · 준비 중 화면에만 남는다.

### 2.5 접근성·인터랙션 기본값

- 상태 표현은 **색 + 아이콘 + 텍스트** 3중 표기 (색만으로 구분 금지).
- 모든 클릭 요소는 `<button>`/`<Link>`, 키보드 포커스 링 표시.
- 모달: ESC 닫기, 포커스 트랩, `aria-modal`.
- `prefers-reduced-motion` 이면 장식 애니메이션 끔(레이스 자체는 유지하되 bobbing 제거).

---

## 3. 공통 레이아웃

참고 구성: 카페게이트(로고 좌측 · 내비 중앙 · 전폭 히어로 · 가운데 정렬 푸터).

### Header
- 화이트(반투명 + blur) sticky, 하단 1px 테두리. 높이 72px(PC·모바일 동일). 반투명 · blur 배경은 `.header::before` 에 둔다 — `.header` 에 `backdrop-filter` 를 직접 걸면 그 안의 `position: fixed` 모바일 메뉴의 기준이 헤더가 되어 메뉴가 보이지 않는다(2026-10-13 수정).
- 좌: `manhattaN cafe` 워드마크(`BrandLogo`, 링크 라벨 "manhattaN cafe 홈"). 로고가 작아 보이지 않게 크기를 고정한다.
  - PC(861px 이상): 한 줄형(원본 파일명 `manhattan_cafe_logo_vertical.svg`, viewBox 108×18) — 폭 `clamp(168px, 15vw, 216px)`
  - 모바일(860px 이하): 3줄 적층형(`manhattan_cafe_logo.svg`, viewBox 50×40) — 높이 56px
  - 가운데 사선은 `slashOpacity` 로 투명도를 정한다. 기본 0.2(원본), 어두운 관리자 사이드바만 0.3
- 중: `HOME · MENU · SEAT · RACE · EVENT · MY` — 회색 → 현재 경로는 검정 + 짙은 회색 2px 밑줄. 한글 부제(MY = 마이페이지)는 PC 에서 스크린리더용, 모바일 메뉴에서 표시
- 우: 티켓 아이콘 + `5장` 내 쿠폰 칩(UserContext 구독) — 클릭 시 마이페이지 쿠폰 섹션(`/my#coupons`)
- 우: 쇼핑백 아이콘 장바구니(CartContext 구독) — 담은 **총 수량**을 아이콘 오른쪽 위 숫자로(0 이면 숨김, 100 이상은 `99+`), 클릭 시 `/cart`. 라벨은 "장바구니 N개"
- 모바일(≤860px): 햄버거 → 전체 화면 흰 메뉴
- RACE 메뉴의 경주 신호(사용자 결정 2026-10-13): 시작 10분 전부터 **SOON**(테두리만 있는 점), 시작 후 10분은 **LIVE**(빨간 점, 깜빡임). PC 는 글자 오른쪽 위의 작은 점이고 글자는 스크린리더용("LIVE — 경주 진행 중"), 모바일 메뉴는 `RACE [LIVE]` 글자 배지. `useRacePhase()` 로 단계가 바뀔 때만 다시 그린다.

### Footer
- 옅은 회색(`--bg-muted`) 블록 + 상단 1px 테두리, 어두운 텍스트, 가운데 정렬: `manhattaN cafe` + 태그라인 → OPEN / ADDRESS / DAILY RACE → 메뉴 링크 줄
- 하단 고지: **"본 이벤트는 카페 내부 이벤트 쿠폰으로 진행되는 미니게임이며, 현금·실제 금전 거래와 무관합니다."** + 저작권 줄(`© 2026 manhattaN cafe.`)

---

## 4. 타입 정의

타입은 도메인별로 각 라우트의 `_types.ts` 에 두고, 여러 페이지가 쓰는 것만 `types/common.ts` 에 둔다.

| 파일 | 타입 |
|---|---|
| `app/(site)/race/_types.ts` | `HorseTrait`, `Horse`, `RaceStage`(`RaceStageKind`), `RaceResult`, `RaceBet`, `RaceEventMessage`, `RunnerState`, `RaceRun` |
| `app/(site)/seat/_types.ts` | `SeatSection`, `SeatType`, `SeatStatus`, `SeatFeature`, `Seat`, `FloorFixture` |
| `app/(site)/menu/_types.ts` | `Category`, `MenuStatus`, `MenuBadge`, `MenuSize`, `SizePrices`, `Menu`, `MenuInput`, `CategoryInput` |
| `app/(site)/event/_types.ts` | `CafeEvent` |
| `app/(site)/my/_types.ts` | `UserProfile` |
| `types/common.ts` | `CouponReason`, `CouponLog`, `Order`, `UserState` (Header·메인·/race·/menu/[id]·/cart·/my 공용), `CartLine`, `CartItem`, `CartState` (Header·/menu/[id]·/cart 공용) |

```ts
// ===== app/(site)/race/_types.ts =====
// ---- Horse ----
export type HorseTrait = "FAST_START" | "STEADY" | "LATE_SPURT" | "WILDCARD" | "BALANCED";

export interface Horse {
  id: number;              // 1~7 — 지금은 게이트 번호와 같다(게이트 번호는 지난 경주 도착 순서로 매기기로 협의, 8.2 "게이트 번호 규칙")
  name: string;            // "Thunder" — 화면에는 대문자
  nameKo: string;          // "썬더"
  color: string;           // 대표색 hex = 이미지의 번호 조끼 색 — 번호 배지 · 내 말 레인 강조
  colorName: string;       // "파랑"
  image: string;           // "/images/horses/thunder.png"
  personality: string;     // "성격 급한 에너자이저"
  trait: HorseTrait;       // 시뮬레이션에 쓰이는 주행 성향
  description: string;     // "초반 스타트가 빠른 말"
}
// 최근 성적은 말 데이터에 두지 않고 경주 기록에서 계산한다(_lib/records.ts 의 recentRanks — 사용자 결정 2026-10-13).
// 기록과 카드가 늘 맞고, 9단계에서 경주가 끝나면 성적도 바로 바뀐다.

// ---- Race ----
// 단계는 사용자의 버튼이 아니라 경주 시각 + 시계로 정해진다(사용자 결정 2026-10-13). useRace 가 매초 계산한다.
export type RaceStageKind = "WAIT" | "RUNNING" | "FINISHED";
export interface RaceStage {
  kind: RaceStageKind;
  raceNo: number;
  startedAt: number;       // 출발 시각(epoch ms) — 시뮬레이션 시드 · 경과 시간의 기준
  bet: RaceBet | null;     // 이 경주에 내가 건 말(없으면 관람)
  result: RaceResult | null; // FINISHED 일 때 그 경주의 결과
  gateClosed: boolean;     // 출발 10초 전부터 true — 더는 걸 수 없다
}

export interface RaceResult {
  raceNo: number;
  date: string;            // ISO — 출발 시각(RACE_TIMES 의 한 칸). 시드의 재료
  ranking: number[];       // horseId 순서대로 1위~7위
}

export interface RaceBet {       // 내가 건 경주 — 쿠폰 1장을 이미 낸 상태
  raceNo: number;
  horseId: number;
  placedAt: string;        // ISO
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
export type MenuSize = "S" | "M" | "L" | "XL";   // 순서는 _lib/menuSize.ts 의 MENU_SIZES
export type SizePrices = Record<MenuSize, number>;

export interface Menu {
  id: number;
  categoryId: number;
  name: string;            // 한글명
  engName: string;
  price: number;           // 대표 가격 — 사이즈가 없으면 그 가격, 있으면 S 가격과 같다(시작가)
  sizePrices: SizePrices | null; // 사이즈별 가격(음료, 메뉴마다 직접 입력). null 이면 단일 가격(디저트)
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
  period: string;          // "매일" · "상시" · "첫 방문"
  time?: string;           // "12:30 · 18:00"
  description: string;
  ctaLabel?: string;       // "Race 참여하기"
  ctaHref?: string;        // "/race"
}

// ===== app/(site)/my/_types.ts =====
export interface UserProfile {   // 내 정보 — 로그인이 없으므로 Mock 사용자 1명
  nickname: string;        // "럭키 포니"
  memberNo: number;        // 7 → "MEMBER No.0007"
  joinedAt: string;        // "2026-10-01"
}

// ===== types/common.ts =====
// 쿠폰은 한 종류다 — 레이스 참가권이자, 모으면 메뉴로 바꾸는 적립 단위. 수량(coupons)과 증감 내역(couponHistory)만 둔다.
export type CouponReason = "ORDER" | "RACE_BET" | "RACE_PAYOUT";   // 메뉴 교환이 생기면 "EXCHANGE" 추가

export interface CouponLog {
  id: string;
  reason: CouponReason;
  delta: number;           // +1(주문), −1(레이스 참가), +4/+3/+2(레이스 1~3위)
  label: string;           // "주문 적립" · "Race #13 · 3번 MOCHA 참가" · "Race #13 · 1위 (원금 1 + 추가 3)"
  at: string;              // ISO
}

export interface Order {         // 주문 한 건 — 주문하는 순간의 장바구니 사본(가격이 바뀌어도 내역은 그대로)
  orderNo: number;
  orderedAt: string;       // ISO
  lines: CartLine[];
  count: number;           // 총 수량
  total: number;           // 합계 금액
  summary: string;         // "아메리카노 외 2건"
  couponReward: number;    // 이 주문으로 적립된 쿠폰 수
}

export interface UserState {     // "내 것" — 마이페이지에 모인다
  coupons: number;                                                   // 보유 쿠폰
  couponHistory: CouponLog[];                                        // 쿠폰 증감 내역, 최신순
  spendCoupon: (reason: CouponReason, label: string) => boolean;     // 1장 차감 + 내역 기록, 0장이면 false
  earnCoupons: (amount: number, reason: CouponReason, label: string) => void; // amount 장 적립 + 내역 기록
  favorites: number[];                                               // 찜한 메뉴 id, 최근 찜한 순
  toggleFavorite: (menuId: number) => void;
  orders: Order[];                                                   // 주문 내역, 최신순
  addOrder: (order: Order) => void;
}

export interface CartLine {      // 같은 메뉴·같은 사이즈는 한 줄
  key: string;                   // "1:M", 사이즈 없는 메뉴는 "13:-" (lib/cart.ts 의 lineKey)
  menuId: number;
  size: MenuSize | null;         // null = 사이즈 없는 메뉴
  name: string;
  engName: string;
  image: string;
  unitPrice: number;             // 담을 때의 그 사이즈 가격 — 주문 API 가 생기면 서버가 다시 계산
  quantity: number;              // 1 ~ CART_MAX_QUANTITY(20)
}
export type CartItem = Omit<CartLine, "key" | "quantity">;

export interface CartState {
  lines: CartLine[];
  count: number;                 // 총 수량(Header 숫자)
  total: number;                 // 합계 금액
  add: (item: CartItem, quantity: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
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
| `app/(site)/my/_data/profile.ts` | 내 정보 Mock(`MOCK_PROFILE` — 럭키 포니 · No.0007 · 2026-10-01 가입) |
| `lib/time.ts` | `RACE_TIMES` (메인·/race·/event 공용이라 최상위) |
| `components/UserProvider.tsx` | 쿠폰 초기값 `INITIAL_COUPONS = 5` |

### 5.1 horses.ts — 7마리

| No | 이름 | 이미지(시트 조끼 번호 · 털색) | 대표색(조끼) | trait | 성격 | 최근 성적(계산값) |
|---|---|---|---|---|---|---|
| 1 | Thunder 썬더 | 3번 · 흑마 | `#245296` 파랑 | FAST_START(선행형) | 성격 급한 에너자이저 | 3 · 1 · 5 |
| 2 | Latte 라떼 | 7번 · 크림 | `#359b9d` 청록 | STEADY(안정형) | 차분한 모범생 | 2 · 3 · 4 |
| 3 | Mocha 모카 | 1번 · 갈색 | `#22633c` 초록 | LATE_SPURT(추입형) | 느긋하다 마지막에 폭발 | 4 · 2 · 3 |
| 4 | Espresso 에스프레소 | 8번 · 짙은 갈색 | `#de550b` 주황 | FAST_START(선행형) | 짧고 굵은 승부사 | 6 · 7 · 1 |
| 5 | Caramel 캐러멜 | 4번 · 금색 | `#f0b22d` 노랑 | BALANCED(균형형) | 뭐든 무난한 올라운더 | 5 · 4 · 2 |
| 6 | Vanilla 바닐라 | 2번 · 흰색 | `#eb526e` 분홍 | STEADY(안정형) | 느긋한 산책가 | 7 · 5 · 6 |
| 7 | Cookie 쿠키 | 5번 · 밤색 | `#e4362f` 빨강 | WILDCARD(변수형) | 기분파 장난꾸러기 | 1 · 6 · 7 |

이름·설정 수정은 이 파일만 고치면 되도록 한다. 표의 No 는 지금 코드의 고정 번호(`Horse.id`)다 — 게이트 번호는 지난 경주 도착 순서대로 매기기로 협의했다(8.2 "게이트 번호 규칙", 미구현). 대표색은 이미지에서 잰 조끼 색이고, 번호 배지 글자는 흰 글자 대비가 3:1 미만이면(노랑) 짙은 색이다(`textOn`). 이미지를 바꾸려면 `scripts/split-horses.mjs` 의 `PICKS` 를 고치고 다시 실행한다.

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
음료(커피·논커피·티)는 `sizePrices: { S, M, L, XL }` 를 메뉴마다 직접 적고 `price` 는 S 가격과 같게 둔다. 디저트는 `sizePrices: null`(단일 가격).

categories.ts: `{ id: 1, name: "커피", engName: "Coffee", order: 1, visible: true }` … 4개.

### 5.5 raceHistory.ts

Race #8 ~ #12 의 과거 결과(최신이 앞, `ranking` 7개 전체 저장, RECENT RACES UI 는 1~3위만 노출). 출전표의 최근 성적 · 다음 경주 번호(#13)가 모두 이 기록에서 계산된다.

### 5.6 events.ts · 공용 값

- events: `DAILY RACE`(매일 12:30 · 18:00 → /race), `ORDER STAMP`(상시, 주문 1회 쿠폰 1장 → /menu), `WELCOME TICKET`(첫 방문 쿠폰 5장 → /my). 화면에서 실제로 동작하지 않는 혜택(메뉴 할인 등)은 넣지 않는다.
- 쿠폰 초기값: `UserProvider` 의 `INITIAL_COUPONS = 5`. 주문 적립은 `ORDER_COUPON_REWARD = 1`(`orderService.ts`), 레이스 보상은 `RACE_PAYOUT`(`race/_lib/payout.ts`) — 수량 조율은 이 상수들만 고친다.
- 레이스 시각: `RACE_TIMES = ["12:30", "18:00"]` 처럼 배열로 두고 `lib/time.ts` 가 "지금 이후 가장 가까운 시각"을 계산한다(오늘 다 지났으면 내일 첫 경주). 카페가 서울에 있으므로 브라우저 시간대와 상관없이 **KST(UTC+9)** 기준이다. 메인 히어로 · Footer · `/event` 의 시각 문구도 모두 `formatRaceTimes()` 로 이 배열에서 만든다.
  - 테스트 · 발표 때는 빌드 환경변수 `NEXT_PUBLIC_RACE_TIMES="12:30,18:00,15:20"` 로 바꾼다(형식이 틀리면 기본값). 경주는 이 시각에 **모든 사용자가 동시에** 출발하므로 실행 중에 사용자마다 바꾸는 기능은 두지 않는다(사용자 결정 2026-10-13).
  - 출발 10초 전(`RACE_GATE_CLOSE_MS`)부터 마감 — 그 뒤 들어온 사람은 관람만 한다.
- 경주 단계: 시작 10분 전(`RACE_SOON_MS`)부터 `SOON`, 시작 후 10분(`RACE_LIVE_MS`)은 `LIVE`, 나머지는 `UPCOMING`. LIVE 동안의 "다음 경주"는 그다음 경주(18:00 LIVE 면 내일 12:30).

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
- 쓰기 동작(예약, 쿠폰 걸기, 주문)도 service 함수로 둔다. 지금은 결과만 돌려주고, 상태 반영은 호출한 쪽의 React State 가 한다(쿠폰 증감은 `useUser()` 의 `spendCoupon` · `earnCoupons`, 주문 내역은 `addOrder`, 찜은 `toggleFavorite`).

| 파일 | 함수 | 추후 API (예상) |
|---|---|---|
| `app/(site)/race/_lib/raceService.ts` | `getHorses()`, `getRaceHistory()`, `placeBet(raceNo, horseId)` → `RaceBet` | GET /api/horses, GET /api/races/history, POST /api/races/{raceNo}/bets |
| `app/(site)/seat/_lib/seatService.ts` | `getSeats()`, `getSeatSummary()`, `getFloorFixtures()`, `reserveSeat(id)`, `updateSeatStatus(id, status)` | GET /api/seats, POST /api/seats/{id}/reservations, PATCH /api/admin/seats/{id} |
| `app/(site)/menu/_lib/menuService.ts` | `getMenus(categoryId?)`, `getTodayWinnerMenu()`, `getCategories()`, `getMenuImageOptions()` | GET /api/menus, GET /api/categories, (이미지 업로드 API 생기면 교체) |
| 〃 (관리자) | `createMenu(input)`, `updateMenu(id, input)`, `deleteMenu(id)`, `updateMenuStatus(id, status)` | POST /api/admin/menus, PUT·DELETE /api/admin/menus/{id}, PATCH /api/admin/menus/{id}/status |
| 〃 (관리자) | `createCategory(input, order)`, `updateCategory(id, input, order)`, `deleteCategory(id)`, `reorderCategories(ids)` | POST /api/admin/categories, PUT·DELETE /api/admin/categories/{id}, PUT /api/admin/categories/order |
| `app/(site)/cart/_lib/orderService.ts` | `placeOrder(lines)` → `Order` | POST /api/orders (주문 내역 저장 · 쿠폰 적립은 서버가 처리) |
| `app/(site)/event/_lib/eventService.ts` | `getEvents()` | GET /api/events |
| `app/(site)/my/_lib/myService.ts` | `getProfile()` | GET /api/my/profile |
| `lib/time.ts` | `getRaceSchedule(now)` · `getNextRaceTime(now)` · `getLiveRaceTime(now)` · `getRaceStartsBetween(after, until)` (순수 함수, 입력은 `RACE_TIMES`) | GET /api/races/next (응답의 경주 시각을 `RACE_TIMES` 대신 넣는다) |

- 메인(`/`)의 `_data/` 에는 히어로 슬라이드 문구(`heroSlides.ts`)만 둔다. 좌석 수·인기 메뉴 같은 대시보드 값은 위 Service 들을 import 해서 모은다.
- 관리자 페이지(`/admin/*`)도 자기 `_data/` 가 없다. 메뉴·카테고리는 `app/(site)/menu/_lib/menuService.ts` 하나로만 읽고 쓴다.
- **Mock 단계의 한계**: 관리자 쓰기 함수는 성공만 돌려주고, 변경은 관리자 화면의 React State 에만 반영된다. 새로고침하면 초기화되고 `/menu` 에는 반영되지 않는다. API 를 연결하면 두 화면이 같은 데이터를 보게 된다.
- 내 쿠폰 수와 증감 내역(`GET /api/my/coupons`, `GET /api/my/coupons/history`), 찜(`GET /api/my/favorites`, 토글은 `PUT·DELETE /api/my/favorites/{menuId}`), 주문 내역(`GET /api/my/orders`)은 `UserProvider` 가 초기화할 때 불러오는 구조로 확장한다.

---

## 7. 전역 상태 (`components/UserProvider.tsx`)

페이지를 넘나드는 값만 Context 로 둔다. 나머지는 페이지 로컬 State.
`UserProvider` 는 `app/layout.tsx` 에서 전체를 감싸고, 값은 `useUser()` 훅으로 꺼낸다. 타입 `UserState` 는 `types/common.ts`.

```ts
interface UserState {
  coupons: number;                       // 보유 쿠폰 (초기 5)
  couponHistory: CouponLog[];            // 쿠폰 증감 내역, 최신순
  spendCoupon: (reason, label) => boolean;          // 1장 차감, 0장이면 false
  earnCoupons: (amount, reason, label) => void;     // amount 장 적립
  favorites: number[];                   // 찜한 메뉴 id, 최근 찜한 순
  toggleFavorite: (menuId) => void;
  orders: Order[];                       // 주문 내역, 최신순
  addOrder: (order) => void;
}
```

- "내 것"(쿠폰 · 찜 · 주문 내역)을 한 Context 에 둔다. 모두 마이페이지에 모이고, 로그인이 붙으면 같은 사용자 단위로 서버에서 불러오기 때문이다.
- Header(쿠폰 수), 메인 대시보드, `/race`, `/menu/[id]`(찜), `/cart`(주문 적립 · 내역 기록), `/my` 가 같은 값을 본다.
- 쿠폰 수가 바뀌는 곳은 `spendCoupon` · `earnCoupons` 두 함수뿐이고, 둘 다 `couponHistory` 맨 앞에 내역을 한 줄 남긴다.
- 새로고침 시 초기화되어도 무방(프로토타입). 원하면 `localStorage` 동기화를 옵션으로.

#### 쿠폰 규칙 (2026-10-13 결정)

> 지시서·이전 설계의 "레이스 참가권 + 1위 보상 무료 아메리카노 쿠폰" 두 종류 구조를 버리고, README 컨셉에 맞춰 **쿠폰 한 종류**로 합쳤다.

- **쿠폰 = 레이스 참가권 = 적립 단위.** 특정 메뉴 쿠폰이 아니다. 몇 장을 모으면 메뉴로 바꾸는 방식이다(교환 규칙·화면은 추후 — 10절).
- **얻는 방법**
  - 처음 5장(`INITIAL_COUPONS`)
  - 주문 1회당 1장 — `/cart` 의 목업 "주문하기"(8.9). 담은 수량과 무관하게 주문 한 번에 1장
  - 레이스 1~3위 (아래 표)
- **레이스에 거는 방법**: 한 경주에 **1장 고정**, 보유량 상한 없음. 거는 순간 바로 1장 차감(`spendCoupon("RACE_BET", …)`), 결과가 나오면 돌려준다(`earnCoupons(n, "RACE_PAYOUT", …)`).

  | 내 말 순위 | 결과 때 돌려받음 | 순증감 |
  |---|---|---|
  | 1위 | 원금 1 + 추가 3 = **4장** | +3 |
  | 2위 | 원금 1 + 추가 2 = **3장** | +2 |
  | 3위 | 원금 1 + 추가 1 = **2장** | +1 |
  | 4~7위 | 0장 (원금만 잃음) | −1 |

- 수량은 **우선값**이다. 게임을 구현해 본 뒤 조율하므로 `race/_lib/payout.ts` 의 `RACE_PAYOUT = { 1: 4, 2: 3, 3: 2 }`(원금 포함) 한 곳에서만 바꾼다. 참고로 지금 값은 무작위로 골라도 경주당 평균 +2/7 ≈ +0.29장이라 반복할수록 쌓인다.
- 데모는 참여 횟수 제한 없음("다시 하기"로 바로 다음 경주). 경주 시각당 1회 같은 제한은 위 조율 때 함께 정한다.
- 좌석 상태는 `/seat` 페이지 State 로 충분하다(다른 페이지는 요약 숫자만 service 에서 읽는다).

**레이스 진행 — `components/RaceProvider.tsx`(7단계, 사용자 결정 · 8단계에서 시간 기반으로 재구성)**: `CartProvider` 안쪽을 감싸고 `useRaceSession()` 으로 꺼낸다. 값은 `bets`(경주 번호 → 내가 건 `RaceBet`) · `results`(이 세션에서 끝까지 본 경주, 최신순) · `runRef`(진행 중 시뮬레이션 `RaceRun`, ref) · `placeBet(bet)`(그 경주에 아직 안 걸었으면 기록) · `recordResult(result)`(같은 번호가 없으면 맨 앞에 추가). 둘 다 ref 로 확인해 같은 틱에 두 번 불려도 한 번만 반영된다.
- **단계는 Provider 에 없다.** WAIT · RUNNING · FINISHED 는 경주 시각(`lib/time`)과 1초 시계로 `useRace` 가 매초 계산한다(8.2 상태 머신). 그래서 모든 사용자가 같은 시각에 같은 단계가 된다.
- 왜 루트인가: `/race` 는 Activity 로 최근 3개 경로까지만 State 가 남는다. 페이지 State 에 두면 쿠폰을 건 뒤 다른 페이지를 3곳 이상 다녀왔을 때 **쿠폰만 빠지고 내 선택이 사라진다**. 루트에 두면 어느 페이지를 다녀와도 남는다(새로고침하면 초기화 — 쿠폰과 같은 수준).
- 쿠폰 차감 · 서비스 호출은 `race/_hooks/useRace.ts` 가 하고, Provider 는 값 보관만 맡는다. 9단계의 정산 여부도 여기에 둔다.
- 진행 중 시뮬레이션(`RaceRun` — 출발 시각 · 난수 상태 · 말마다 진행도)은 매 프레임 바뀌므로 State 가 아니라 **ref**(`runRef`)에 둔다. Context 소비자를 매 프레임 다시 그리지 않고, 페이지가 숨겨졌다 돌아오거나 다시 마운트돼도 여기서 이어 간다(경주가 바뀌면 새로 만든다). 그리기용 스냅샷은 `useRaceRun` 의 로컬 State.

**장바구니 — `components/CartProvider.tsx`**: `app/layout.tsx` 에서 `UserProvider` 안쪽을 감싸고 `useCart()` 로 꺼낸다(타입 `CartState`).
- Header(총 수량), `/menu/[id]`(담기), `/cart`(목록·수량·삭제·합계)가 같은 값을 본다.
- 계산은 `lib/cart.ts` 순수 함수로만 한다 — 같은 메뉴·사이즈는 한 줄로 합치고, 한 줄 수량은 1~20.
- React State 에만 둔다(사용자 결정): 사이트 안에서 이동해도 남지만 새로고침하면 비워진다. `/cart` 의 정적 셸에는 빈 장바구니가 들어간다.

---

## 8. 페이지별 설계

### 8.1 `/` 메인 — 히어로 슬라이더 + 오늘의 라인업

참고: 히어로는 넥슨 `.promotionBanner`(전폭 배너 + 하단 겹침 탭 페이지네이션), 라인업은 언스페셜티 `.prdList.grid4`(4열 정사각 썸네일).

```
┌──────────────────── HERO (전폭, 사진 + 어두운 그라데이션) ───────────────────┐
│  DAILY CAFE RACE                                                           │
│  NEXT RACE                                           [ 경주마 사진 ]        │
│  오늘 18:00 출발 (SOON)                         ← LIVE 면 [● LIVE] NOW RACING │
│  RACE STARTS IN [0][1]:[2][4]:[3][2]                                        │
│  쿠폰 한 장으로 7마리 말 중 하나를 응원하고 …                                     │
│  [ RACE 페이지 보기 ]                                                        │
│ ┌ DAILY RACE ─────────┐┌ (WINNER 메뉴) ┐┌ (이용 가능 좌석) ┐┌ (내 쿠폰·이벤트) ┐│  ← 탭 페이지네이션
│ │ NEXT RACE 18:00 ▬▬▬▬││              ││               ││                ││     (지금은 1탭)
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
- 슬라이드 데이터는 `HeroSlide[]` prop. 지금은 `_data/heroSlides.ts` 의 NEXT RACE 1장(준비 중 문구 + 커피 컵 경주 트랙 일러스트 `public/images/hero/next-race.jpg`). 구조는 4슬라이드(NEXT RACE · 오늘의 WINNER 메뉴 · 이용 가능 좌석 · 내 쿠폰/이벤트)를 전제로 하며, 추가 슬라이드는 14단계에서 각 Service 값으로 page 가 만들어 넘긴다.
- 높이 `clamp(460px, 34vw, 560px)`, 사진은 `next/image fill` + 좌→우·하→상 그라데이션. 활성 슬라이드는 느린 줌(7s)과 텍스트 페이드업.
- 하단 탭: 소제목 + 굵은 제목, 활성 탭은 밝은 배경 + 좌측 밝은 회색(`--brand-300`) 바 + 진행바(5초, `--autoplay`). 슬라이드가 2장 이상일 때만 자동 전환·이전/다음 버튼·진행바가 동작하고, 호버·포커스 중에는 멈춘다. `prefers-reduced-motion` 이면 전환 효과 없음.
- **NEXT RACE 카운트다운(6단계, `HeroRaceClock`)**: 슬라이드 데이터의 `raceClock: true` 면 headline 자리에 `오늘 18:00 출발 [SOON]` + `RACE STARTS IN [0][1]:[2][4]:[3][2]`(밝은 반투명 칸 `Scoreboard onDark`), LIVE 면 `[● LIVE] NOW RACING 18:00` + "지금 트랙에서 경주가 진행 중이에요 · 다음 경주 내일 12:30". 하단 탭 제목도 `NEXT RACE 18:00` / `LIVE 18:00`. 시계를 읽기 전(정적 셸 · 하이드레이션 전)에는 headline("매일 12:30 · 18:00 출발")과 `--:--:--`. 스크린리더는 전광판을 "출발까지 1시간 24분 32초"로 읽는다. "COMING SOON" 배지와 "카운트다운이 곧 공개됩니다" 문구는 뺐다.
- **시각 읽기 규칙**: Cache Components 는 클라이언트 컴포넌트도 빌드 때 미리 렌더하므로, 렌더 중에 `Date.now()`/`new Date()` 를 부르면 빌드 오류(blocking-prerender-current-time)가 난다. 현재 시각은 `lib/useCountdown.ts` 의 공용 시계만 읽는다 — `useSyncExternalStore` 의 서버 값은 `null`, 구독(브라우저 마운트) 때 처음 시각을 읽고 매 초 경계에 갱신한다. 타이머는 하나를 모두가 같이 쓰고, Activity 로 숨은 페이지는 구독을 푼다.

**MenuLineup (`_components/MenuLineup.tsx`, server)**
- `getMenus()` + `getCategories()` → `_lib/lineup.ts` 의 `pickLineup(menus, 8)`: HIDDEN 제외, WINNER → BEST → NEW → 배지 없음 순(같은 등급은 원래 순서), 품절은 뒤로.
- 컴포넌트 본문에 `"use cache"` + `cacheLife("hours")` 를 둔다. 모두에게 같은 내용이라 빌드 때 정적 셸에 포함되고, API 연결 뒤에는 관리자 저장 시 `revalidateTag` 로 갱신한다. **Suspense 로 감싸지 않는다** — 감싸면 내용이 숨김 영역에 들어가 하이드레이션 전까지 fallback 이 보인다. (Cache Components 규칙: 캐시되지 않은 비동기·요청 시점 데이터만 Suspense 경계 안에서 읽는다.)
- 대시보드 카드 4개(좌석/인기메뉴/쿠폰/다음경주)는 14단계에서 히어로 슬라이드로 흡수할지 별도 섹션으로 둘지 정한다.

### 8.2 `/race` — 핵심 ①

#### 상태 머신 (값: `components/RaceProvider.tsx` · 단계 계산: `app/(site)/race/_hooks/useRace.ts`)

> **사용자 결정 2026-10-13**: 경주는 사용자가 버튼을 눌러 시작하는 것이 아니라 **경주 시각(`RACE_TIMES`)에 모든 사용자가 동시에 출발하고 동시에 끝난다.** 참여하지 못한 사람은 관람만 한다. 그래서 단계는 "내가 무엇을 했나"가 아니라 "지금이 몇 시인가 + 이 경주에 걸었나"로 정해진다. 7단계의 BETTING → READY → RUNNING → FINISHED 버튼 흐름과 [경주 시작] 버튼은 없앴다.

```
시각(KST)            T−10분       T−10초        T(출발)  T+3초 … 전원 도착 +1.5초        T+10분
                      SOON         마감(gate)     3·2·1 → 경주                            LIVE 끝
무대(stage)   없음 ─▶ WAIT ──────▶ WAIT(gateClosed) ─▶ RUNNING ─────▶ FINISHED(결과 기록) ─▶ 없음
출전표        다음 경주 #N 에 걸 수 있음 ─────▶ 걸 수 없음(관람) ──────────────▶ 다음 경주 #N+1 에 걸 수 있음
```

- **무대(`RaceStage`)**: LIVE 창(출발 뒤 10분)이고 그 경주 결과가 아직 없으면 RUNNING, 있으면 FINISHED. 그 밖에는 다음 경주를 기다리는 WAIT — 내가 걸었거나(READY 표시) SOON 이면 무대를 보여 주고, 아니면 무대 없이 출전표만. 쿠폰을 건 사람은 "응원", 안 건 사람은 "관람"으로 같은 화면을 본다.
- **기록**: 이 세션에서 끝까지 본 경주(`results`) + **지나간 경주 자동 보충**(`backfillHistory` — Mock 기록의 마지막 경주 뒤부터 확실히 끝난(출발 + 19.5초) 출발 시각마다 결정적 시뮬레이션, 사용자 결정) + Mock 기록. 다음 경주 번호는 그 다음 번호라 누가 언제 들어와도 같다. 백엔드가 붙으면 서버 기록이 이 자리를 맡는다.
- **같은 경주**: 시뮬레이션이 경주 번호 + 출발 시각으로 시드되고 20ms 고정 간격으로만 진행하므로(8.2 레이스 시뮬레이션) 어느 기기에서든 같은 순위 · 같은 시각에 끝난다. 늦게 들어오거나 탭이 뒤에 있다 돌아와도 그 시각까지 따라잡는다.
- 쿠폰은 7절 "쿠폰 규칙"을 따른다. 차감은 걸 때(마감 전까지, 경주당 한 번), 정산은 FINISHED 때 **경주당 한 번만**(9단계 — `raceNo` 로 이미 정산했는지 확인). 건 뒤에는 취소가 없다(건 쿠폰은 결과로만 돌아온다).
- 3 · 2 · 1 카운트다운은 출발 3초 전(RACE_COUNTDOWN_MS)부터, 7마리가 모두 들어오고 1.5초(FINISH_HOLD_MS) 뒤에 결과를 기록한다(FINISHED).
- 실제 12:30 · 18:00 을 기다리지 않고 보려면 `NEXT_PUBLIC_RACE_TIMES` 로 시각을 바꿔 빌드한다(5.6). 개발 중 시뮬레이션 · 화면만 보려면 `/race/lab`.

#### 화면 구성 (위→아래)

1. **헤더 전광판(`RaceCountdown`, 6단계에 만듦)**: `NEXT RACE 오늘 18:00 [SOON]` ┊ `RACE STARTS IN [01]:[24]:[32]` ┊ `MY COUPONS [05]장` 세 칸(모바일은 위아래). LIVE 면 `NOW RACING 18:00 [● LIVE]` ┊ `다음 경주 내일 12:30` ┊ 내 쿠폰 — 카운트다운은 쉰다. 실제 경주는 시각과 상관없이 출전표에서 시작하므로 이 전광판은 실제 일정만 알려 준다.
2. **출전표 (BETTING, `RaceBoard` · `HorseCard`)**: 머리 `TODAY'S RUNNERS / 출전표 Race #13` + 오른쪽 보상 안내 `쿠폰 1장으로 참여 [1위 4장] [2위 3장] [3위 2장] 돌려받기 (원금 포함)`(`PayoutGuide`, 숫자는 `RACE_PAYOUT`). 그 아래 카드 7장 그리드(PC 4열 / 태블릿 2열 / 모바일 1열), 게이트 번호 순
   - **게이트 번호 규칙(팀 협의 2026-10-13 · 아직 구현 안 됨)**: 1번~7번 게이트 번호는 **지난 경주에서 들어온 순서대로** 매긴다 — 지난 경주 1위가 1번, 2위가 2번 … 7위가 7번. 아래 "게이트 번호 규칙" 참고. 지금 코드는 말마다 고정 번호(`Horse.id`)를 쓴다.
   ```
   ┌───────────────────────────────┐
   │ (3) MOCHA            [MY PICK]│  ← 게이트 번호 원(대표색 = 조끼 색) · 이름 · "모카 · 초록 조끼"
   │     모카 · 초록 조끼            │
   │ ┌───────────────────────────┐ │
   │ │      [말 이미지(달리는 자세)]  │ │  ← public/images/horses/mocha.png
   │ └───────────────────────────┘ │
   │ 성향      [추입형] 느긋하다 마지막에 폭발 │
   │ 최근 성적  [4위][2위][3위]         │  ← 기록에서 계산, 최근 경기부터 · 전광판 칸 · 1위는 금색
   │ "뒤에서 기다리다 … 막판 스퍼트가 강한 말" │
   │ [ 이 말 선택하기 ]                 │  ← READY 이후: 버튼 없음, 내 말은 [출발 대기 중]
   └───────────────────────────────┘
   ```
   - 최근 성적은 스크린리더용으로 "최근 경기부터 4위, 2위, 3위" 를 함께 둔다. 선택 버튼 이름은 "이 말 선택하기 — 3번 MOCHA".
   - 쿠폰 0장이면 버튼 7개 모두 비활성 + 출전표 위에 "쿠폰이 부족합니다 — 메뉴를 주문하면 1장 적립돼요 [메뉴 보러 가기 ›]".
   - **마감(사용자 결정 2026-10-13)**: 출발 10초 전(`RACE_GATE_CLOSE_MS`)부터 경주가 끝날 때까지 버튼 7개 비활성 + "마감 — 출발 10초 전부터 경주가 끝날 때까지는 걸 수 없어요. 트랙에서 관람해 주세요." 끝나면 다음 경주(번호 +1) 출전표가 바로 열리고, 카드의 MY PICK 은 다음 경주에 건 말을 뜻한다. 걸고 나면 그 경주 카드는 버튼 없이 "출발 대기 중"(경주 중에는 "경주 중").
   - 모바일(1열)은 이미지 최대 폭 260px 로 카드 높이를 줄인다.
3. **BetConfirmModal**: `RACE #13 · MY PICK` · 말 이미지 · `(3) 3번 MOCHA` · "MOCHA에 쿠폰 1장을 사용하시겠습니까?" + 보상 안내 + "4위 이하면 쿠폰은 돌아오지 않아요 · 보유 5장 → 4장" [취소] [사용하기](모바일 Bottom Sheet). [사용하기] → `placeBet(raceNo, horseId)` → `spendCoupon("RACE_BET", "Race #13 · 3번 MOCHA 참가")` → `enterGate(bet)` 로 READY. 처리 중에는 버튼 · 배경 닫기를 막고, ref 로 같은 틱의 두 번째 클릭도 막는다(쿠폰 1장만). 취소하면 아무것도 바뀌지 않는다. 다른 페이지로 가면(Activity) 열려 있던 확인창은 닫는다.
3-1. **트랙 무대 머리띠 (`HorseTrack` 상단)**: 출전표 위 짙은 무대의 첫 줄 — 단계 × 참여 여부로 문구가 다르다. 버튼은 없다(출발은 시각이 정한다).
   | 단계 | 걸었을 때 | 안 걸었을 때(관람) |
   |---|---|---|
   | WAIT | `READY · 게이트 입장 완료 [SOON]` · "Race #14 · 1번 THUNDER에 쿠폰 1장을 걸었어요" · "출발까지 00:00:25 · 1위 4장 …" | `SPECTATOR · 관람 대기 [SOON]` · "Race #14 · 출발까지 00:00:28" · "지금 말을 고르면 참여할 수 있어요 — 출발 10초 전 마감." / 마감 뒤: `SPECTATOR · 마감` · "곧 출발합니다" · "이번 경주는 관람만 할 수 있어요…" |
   | RUNNING | `NOW RACING [● LIVE]` · "1번 THUNDER 응원 중" · "현재 N위" | `NOW RACING [● LIVE]` · "Race #14 · 관람 중" · "선두 5번 CARAMEL" |
   | FINISHED | `FINISH · 경주 종료` · "1번 THUNDER 5위로 들어왔어요" · "아래에서 순위를 확인하세요." | `FINISH · 경주 종료` · "Race #14 · 1위 5번 CARAMEL" · "다음 경주 출전표가 열렸어요." |
   걸고 나면 포커스를 이 제목으로 옮긴다(누른 카드 버튼이 사라지므로). 취소 버튼은 없다. (7단계의 ReadyPanel → 8단계 트랙 + [경주 시작] → 같은 날 시간 기반으로 바뀌며 버튼 제거.)
4. **HorseTrack 경기 화면 (READY/RUNNING/FINISHED) — 사용자 결정 2026-10-13(아케이드 경마 레퍼런스 2장)**
   - **PixiJS v8(WebGL) 캔버스**(`_lib/trackScene.ts`)로 그린다. 머리띠 · HUD · 카운트다운 · 토스트는 DOM(접근성 · 디자인 토큰 · 반응형 유지). 렌더러 선택지(PixiJS · Three.js · 순수 WebGL) 중 2D 스프라이트에 코드가 가장 적은 PixiJS. `/race` 에서만 동적 import 하므로 다른 페이지 번들에는 들어가지 않는다. WebGL 을 만들 수 없으면 캔버스 자리에 안내 문구, 순위는 HUD 로 계속 본다.
   - **선두 추적 카메라**: 트랙 전체 길이는 화면 폭의 260%(`COURSE`). 선두는 화면의 66% 지점에 고정되고(출발 직후 24% → 66% 로 옮겨 가며 카메라가 붙는다) 나머지는 그 뒤에서 엎치락뒤치락. 잔디 · 울타리가 뒤로 흐르고(먼 울타리 0.75배 · 생울타리 0.5배 · 가까운 울타리 1.25배 시차) 막판에 결승선(체크무늬 띠 + FINISH 표지)이 오른쪽에서 들어온다. 선두가 결승을 지나면 카메라가 결승선에 멈추고 나머지가 들어온다. 통과한 말은 화면 밖까지 더 달려 나간다. 값은 시뮬레이션의 선두 ↔ 꼴찌 간격(p90 ≈ 0.21)이 화면 안에 들어오도록 잡았다.
   - **원근 잔디, 레인선 없음**: 7마리를 게이트 번호 순으로 7줄(높이 32% → 89%)에 놓고 뒤쪽 줄은 0.66배까지 작게. 위에 생울타리 + 흰 울타리, 아래 흰 울타리. 말은 출전표와 같은 이미지(코끝 · 발 기준으로 배치) + 상하 들썩임 + 먼지 파티클. 말마다 게이트 번호 배지(대표색 원, 줄 배율과 무관하게 같은 크기, 모바일 0.78배), 내 말은 금색 MY 표식.
   - **HUD(무대 아래, DOM)**: `RACE #13` ┊ 현재 순위 — 게이트 번호 배지를 순위 순으로(1~3위 흰 숫자 · 1위 금색, 내 말은 금색 테두리; 레퍼런스 2 의 하단 순위 바) ┊ `REMAINING [0][4][2][0] m`(1200m 환산). 모바일은 순위 줄이 한 줄을 통째로 쓴다.
   - **카운트다운**: [경주 시작] 뒤 3 · 2 · 1 · GO! 를 캔버스 위 가운데에(DOM).
   - `RaceEventMessage`: 캔버스 위 상단(생울타리 띠) 가운데에 1.5초 표시 후 fade-out. 동시에 여러 개 오면 큐로 순차 표시(최대 1개 노출), 3초 넘게 지난 메시지는 버린다.
   - 추가 에셋(사용자 요청 "필요한 이미지를 검색해서 알려 달라" · 유료 무료 무관): 잔디 · 생울타리 · 울타리는 2D 캔버스로 그린 타일 텍스처라 `trackScene.ts` 의 `turfTexture · hedgeTexture · railTexture` 만 바꾸면 이미지로 교체된다. 말 달리기 프레임은 기존 말에셋(AI 생성 치비)과 같은 스타일이어야 하므로 기성 팩보다 같은 도구로 생성하는 쪽을 권했다(12절 8단계 참고).
4-1. **RaceResult — 경주 결과(트랙 무대와 출전표 사이, 사용자 요청 2026-10-13)**: 가장 최근에 끝난 경주의 1~7위. 머리 `RACE RESULT / Race #14 순위 · 10/13 18:00 출발` + 오른쪽 "내 말 1번 THUNDER · 5위 [NEXT TIME!]"(1~3위면 금색 [WIN!] [PLACE!] [SHOW!], 안 걸었으면 "이번 경주에는 참여하지 않았어요."). 칸 7개(PC 7열 · 태블릿 4열 · 모바일 1열 가로 줄): 순위 · 게이트 번호 배지 · 이름 · 한글 이름 · 1~3위 라벨, 1위 칸은 금색 테두리, 내 말 칸은 짙은 테두리 + MY PICK. 경주 중(RUNNING)에는 숨긴다. 쿠폰 정산 문구는 9단계에서 붙인다(사용자 결정: 지금은 순위만).
5. **RaceResultModal (FINISHED, 9단계)** — 순위 표시는 4-1 결과 섹션이 맡으므로 모달은 정산 알림(돌려받은 쿠폰 · 보유 수 · confetti) 위주로 줄여도 된다.
   ```
   RACE RESULT
   🥇 3번 MOCHA   🥈 7번 COOKIE   🥉 1번 THUNDER
   ─────────────
   YOUR HORSE  3번 MOCHA   1위  WIN!
   쿠폰 4장을 돌려받았어요 (원금 1 + 추가 3) · 보유 8장
   ── or ──
   YOUR HORSE  7번 COOKIE  2위  PLACE!     → 3장 (원금 1 + 추가 2)
   YOUR HORSE  1번 THUNDER 3위  SHOW!      → 2장 (원금 1 + 추가 1)
   ── or ──
   YOUR HORSE  5번 CARAMEL  4위  NEXT TIME!
   건 쿠폰 1장은 돌아오지 않아요 · 보유 4장
   [다시 하기] [내 쿠폰 보기 → /my#coupons]
   ```
   - 1~3위면 `earnCoupons(payoutFor(rank), "RACE_PAYOUT", "Race #13 · 1위 (원금 1 + 추가 3)")` + 가벼운 confetti(CSS) 연출. 4위 이하는 정산 없음(차감은 이미 내역에 있다).
   - WIN · PLACE · SHOW 는 경마 용어(1·2·3착). 숫자 순위를 항상 같이 보여 준다.
   - 결과는 `raceHistory` State 맨 앞에 `Race #(마지막+1)` 로 추가.
6. **RaceHistory**: `RECENT RACES` — 최근 5경기 카드, 1~3위 표시.

#### 게이트 번호 규칙 (팀 협의 2026-10-13 · 아직 구현 안 됨)

**1번~7번 게이트 번호는 지난 경주에서 들어온 순서대로 매긴다.** 지난 경주 1위로 들어온 말이 이번 경주 1번, 2위가 2번 … 7위가 7번이다.

- 예: Race #12 도착 순서 `[7, 2, 1, 3, 5, 4, 6]`(말 id) → Race #13 게이트 `1번 COOKIE · 2번 LATTE · 3번 THUNDER · 4번 MOCHA · 5번 CARAMEL · 6번 ESPRESSO · 7번 VANILLA`.
- 경주가 끝날 때마다 다음 경주의 번호가 그 결과로 다시 매겨진다. 그래서 같은 말이라도 경주마다 번호가 바뀐다.
- 지금 코드는 말마다 고정 번호(`Horse.id` = 게이트 번호, 5.1 표의 No)를 쓴다. 구현할 때 바뀌는 곳:
  - `Horse.id` 는 말 식별자로만 쓰고, 게이트 번호는 경주마다 계산한다(지난 경주 `ranking` 에서의 위치 + 1).
  - 기록(`RaceResult.ranking`) · 내가 건 말(`RaceBet.horseId`)은 말 id 를 그대로 저장한다(번호가 바뀌어도 같은 말을 가리키게).
  - 화면 · 문구는 **그 경주의** 게이트 번호를 쓴다 — 출전표 번호 원(`GateBadge`) · 확인창 "3번 MOCHA" · READY · 쿠폰 내역 "Race #13 · N번 MOCHA 참가" · 8단계 트랙 레인 번호 · 9단계 결과.
  - 말 이미지 조끼에 적힌 숫자는 게이트 번호와 상관없다(5.1 — 이름에 맞는 이미지를 골랐다).
- **첫 경주(기록이 하나도 없을 때)**: 게이트 번호는 **무작위 순서**로 매긴다(팀 협의 2026-10-13).
  - 순서는 그 경주에 대해 **한 번만** 정하고 저장한다 — 다시 그리거나 페이지를 오가도 바뀌면 안 된다. 백엔드가 붙으면 서버가 경주를 만들 때 정해 내려준다.
  - Mock 단계에서는 렌더 중에 `Math.random()` 을 부르지 않는다(Cache Components 는 렌더 중 무작위 값을 쓰면 빌드 오류가 나고, 렌더마다 순서가 바뀐다). 브라우저에서 처음 필요할 때 한 번 섞어 `RaceProvider` 에 두고 그 값을 쓴다.
- **출전표 카드 순서**: 게이트 번호 순(1번부터)으로 놓는다(팀 협의 2026-10-13). 번호가 지난 경주 도착 순서이므로, 결과적으로 지난 경주 순위순과 같은 순서가 된다. 첫 경주는 무작위로 정한 번호 순.

#### 레이스 시뮬레이션 (`app/(site)/race/_lib/simulation.ts`)

순수 함수로 작성하고 `useRaceRun` 이 rAF 루프에서 호출한다. **결정적(deterministic)이다** — 난수는 경주 번호 + 출발 시각으로 시드한 mulberry32 이고 그 상태(`rng`)를 `run` 안에 들고 다니며, 시간은 `STEP_MS = 20` 고정 간격으로만 진행한다(프레임 길이와 무관). 같은 입력이면 어느 기기에서든 같은 경주가 나온다(사용자 결정 2026-10-13: 모두 같은 경주를 동시에).

```ts
interface RunnerState {
  horseId: number; trait: HorseTrait;
  progress: number;        // 0 ~ 1 (1 = 결승). 통과 뒤에도 1.6 까지 더 늘어 화면 밖으로 달려 나간다
  prevProgress: number;    // 직전 스텝 — 스텝 사이는 그리기 쪽이 선형 보간
  baseSpeed: number;       // 진행도/ms — 출발 때 시드 난수로
  drift: number;           // 완만한 속도 흔들림(0.95~1.05, 300ms 마다 랜덤워크) — 엎치락뒤치락의 바탕
  modifier: number; modifierUntil: number;  // 이벤트의 일시 배율(경과 ms 기준)
  spurted: boolean;        // 막판 스퍼트는 경주당 한 번
  finishedAt: number | null;
}
interface RaceRun { raceNo; startedAt /* epoch ms, 경과 0 = 출발 */; rng /* 난수 상태 */; elapsed; runners; ranking; doneAt; … 메시지 스로틀 상태 }

seedFor(raceNo, startedAt): number                       // 32비트 시드
createRace(horses, raceNo, startedAt): RaceRun
step(run, names): { run, events }                        // 한 스텝(20ms) — 경과가 0 이하(카운트다운)면 움직이지 않는다
advanceTo(run, targetElapsedMs, names): { run, events }  // 스텝을 넘지 않는 나머지는 남긴다(보간용)
simulateRace(horses, raceNo, startedAt): { ranking, doneAt }  // 끝까지 — 지나간 경주 보충 · 테스트
liveOrder(runners) · leaderProgress(runners)
```

**튜닝 목표: 전체 경주 10~15초.** (구현값 — 몬테카를로 4,000회로 맞췄다)

1. **기본 속도**: `baseSpeed = 1 / 12000ms × random(0.93, 1.07)`.
2. **trait 보정** (구간별 배율 — 평균 완주 시간이 성향마다 비슷해지도록 조정):
   | trait | 0~30% | 30~70% | 70~100% |
   |---|---|---|---|
   | FAST_START | ×1.15 | ×1.0 | ×0.92 |
   | STEADY | ×1.01 | ×1.02 | ×1.01 (이벤트 확률 ↓) |
   | LATE_SPURT | ×0.90 | ×1.0 | ×1.12 (+ 막판 스퍼트 보장) |
   | WILDCARD | ×1.0 | ×1.0 | ×1.0 (이벤트 확률 ↑↑, 배율 변동폭 ×1.3) |
   | BALANCED | ×1.02 | ×1.02 | ×1.02 |
3. **랜덤 이벤트**: 300ms 마다 말별로 확률 체크(기본 4%, STEADY 2%, WILDCARD 9%). 이미 배율이 걸린 말은 건너뛴다.
   - BOOST(×1.35, 1s · 45%) / SLOW(×0.7, 0.8s · 35%) / STUMBLE(×0.4, 0.5s · 20%)
   - SPURT: progress > 0.75 에서 LATE_SPURT 는 한 번 보장, 나머지는 판정마다 2% — ×1.3, 1.2s(경주당 한 번)
   - OVERTAKE: 1~3위 안으로 순위가 오른 말이 있으면 메시지만(쿨다운 2s, 출발 직후 8% 전은 제외). 1위로 올라서면 "선두로 나섭니다", 아니면 "선두를 추격합니다"
   - LEAD_BATTLE: 1·2위 차이 < 0.02 가 1초 이상 지속되면 메시지(쿨다운 4s)
4. **메시지 스로틀**: 화면 메시지는 전체 기준 최소 **1.5초** 간격(토스트 표시 시간과 같아 큐가 밀리지 않는다). 속도 효과는 그대로 적용되고 메시지만 생략된다.
5. **순위 기록**: `progress >= 1` 이 되는 스텝에 `finishedAt` 기록 → 도착 순서대로 `ranking` push(같은 스텝에 둘 이상이면 더 멀리 간 말이 먼저). 7마리 모두 도착하면 `doneAt`, 1.5초 뒤 FINISHED.
6. **안전장치**: 18초가 지나도 도착하지 못한 말은 남은 진행도 순으로 강제 마감.

**결과(2026-10-13, 시드 버전 3,000회)**: 7마리 완주 11.5~15.4초(중앙값 12.7초, 강제 마감 0회) · 선두 첫 도착 9.3~12.2초 · 우승률 11.4~17.4%(가장 높은 추입형 MOCHA) · 경주당 선두 교체 2.4회 · 메시지 5.8개 · 선두 ↔ 꼴찌 최대 간격 p50 0.15 · p90 0.21 · p99 0.25. **결정성**: 같은 시드를 한 번에 · 프레임처럼 잘게(16.7 · 33 · 250 · 1200ms 섞어) · 큰 덩어리로 따라잡아도 순위 · 도착 시각이 300/300 일치. 지나간 경주 40개 보충에 25ms.

**렌더링(8단계 구현 — 사용자 결정으로 지시서의 "위치는 React State 관리"에서 벗어남)**
- 경기 화면은 PixiJS 캔버스. 무대가 WAIT · RUNNING 인 동안 `useRaceRun` 이 루프를 돈다 — 출발 3초 전까지는 타이머로 기다리고(관람 대기), 그 뒤 rAF 콜백이 매 프레임 `advanceTo(run, Date.now() − startedAt)` 로 시뮬레이션을 진행시키고 `scene.update(프레임)` 로 캔버스를 직접 갱신한다(20ms 스텝 사이는 `prevProgress` 와 선형 보간). React State(HUD 순위 · 남은 거리 · 카운트다운 · 토스트)는 **순위 · 토스트가 바뀌거나 100ms 마다**만 갱신한다(DOM 을 60fps 로 다시 그리지 않게).
- 진행도는 프레임 누적이 아니라 **출발 시각 기준 경과 시간**이다. Cache Components 가 `/race` 를 `<Activity>` 로 숨기면 effect cleanup 으로 rAF 와 캔버스가 정리되고, 돌아오면 effect 가 다시 돌며 `runRef` 의 상태를 그 시각까지 따라잡는다 — "다른 페이지에 갔다 돌아와도 경주가 이어진다"(검증: 3초 떠난 사이 571m → 227m). 탭이 뒤에 있어 rAF 가 멈춰도 같다. 그 사이 경주가 끝나 버리면(백그라운드 탭 · 늦은 입장) 자동 보충된 결과로 FINISHED 무대(`finishedFrame`)를 그린다 — 끝까지 본 스냅샷(`doneAt`)이 있을 때만 그 스냅샷을 쓴다.
- 캔버스는 보일 때마다 만들고(텍스처는 `Assets` 캐시) 숨겨지면 `destroy`. StrictMode 의 effect 재실행은 `cancelled` 플래그로 처리.
- 언마운트 / 페이지 이탈 시 `cancelAnimationFrame` · 장면 `destroy` 필수.

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
| AVAILABLE | 짙은 회색(`--seat-available`) 테두리, 크림 배경 | ✓ | 이용 가능 | 가능 |
| USING | 브라운 채움 | ● (사람 아이콘) | 사용 중 | 상세만 |
| RESERVED | 금색 빗금 패턴 | 🔒 | 예약 | 상세만 |
| REPAIR | 회색 + 대각 스트라이프 | 🔧 | 수리 중 | 상세만 |

- 좌석 안에 `T03` + 상태 아이콘 + 인원(`4`)을 표시.
- 필터 불일치: `opacity: 0.3` (숨기지 않음).
- 추천 좌석: 금색 glow + 별 배지 + 은은한 pulse.
- 선택된 좌석: 두꺼운 `--brand-900` 외곽선 + 바깥 간격 링(이용 가능의 얇은 회색 테두리와 굵기로 구분).
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

- 상단: `TODAY'S LINE-UP` / `MENU BOARD`. 클래식 카페 메뉴판 느낌은 세리프 대신 티켓 모양(절취선 · STUB · 일련번호)으로 낸다(2.2 — Pretendard 하나). 점선 리더(`당근 케이크 ........ 6,500원`)는 상세의 사이즈 없는 메뉴에만 쓴다.
- `MenuCategory` 탭: `getCategories()` 결과 중 `visible` 인 것만 `order` 순으로 (전체 탭 포함, 탭마다 메뉴 수). 기본 데이터는 Coffee / Non Coffee / Tea / Dessert. 선택은 클라이언트 State 로만 두고 URL 쿼리 `?category=` 동기화는 하지 않았다 — `cacheComponents` 에서 쿼리를 읽으면 페이지가 정적 셸에서 빠지기 때문(필요해지면 `useSearchParams` + Suspense 로 추가).
- `status: "HIDDEN"` 메뉴는 보이지 않고, `"SOLD_OUT"` 은 카드에 "품절" 스탬프 + 흐리게.
- `MenuCard` = 티켓: 좌측 이미지, 우측 이름(한/영)·설명, 절취선 너머 STUB(폭 92px, 모든 카드 동일). 가격은 모두 STUB 안에 있다 — 맨 위에 `STUB` / 그 아래 줄 `No.0001`(일련번호)을 **왼쪽 정렬로 위에 고정**하고 그 아래에 구분선(머리글의 border-bottom). 가격은 **STUB 바닥에 붙인다** — 음료는 **S · M · L · XL 가격을 한 줄씩**, 사이즈가 없는 디저트는 **`ONE SIZE` 아래에 가격**(가운데 정렬). 카드가 길어지면 머리글과 가격 사이가 벌어진다(`<dl>`, 스크린리더는 "S 사이즈 4,000원" 으로 읽고 STUB · 일련번호만 `aria-hidden`). 카드에는 점선 리더가 없다(상세의 디저트 가격에만 남아 있다). 메인 `TODAY'S LINEUP` 카드는 사이즈 메뉴를 `4,000원~`(S 가격부터)으로 보여 준다. 인기 메뉴는 `BEST`, 1위 메뉴는 금색 `WINNER` 배지(TicketBadge). 카드 어디를 눌러도 상세(`/menu/[id]`)로 간다(이름 링크 + `::after` 로 카드 전체를 덮음).
- 그리드: PC 3열 / 태블릿 2열 / 모바일 1열.
- **검색**(`MenuSearch`): 제목 오른쪽(모바일은 제목 아래) 검색창, 칠 때마다 바로 거른다. 선택한 탭과 함께 적용되고 탭 개수도 검색 결과 기준. 매칭(`_lib/menuSearch.ts`): 이름은 부분 일치 + 한글 초성(`ㅇㅁㄹ` → 아메리카노), 영문명·설명은 부분 일치, 카테고리명은 앞부분 일치("커피" 가 "논커피" 에 걸리지 않게). 공백·대소문자 무시, 입력 중인 마지막 글자는 덜 조합된 상태도 받아 준다(`칼`·`카람` → 카라멜). 결과 0건이면 "전체에서 보기"(다른 탭에 결과가 있을 때) 또는 "검색어 지우기". 검색어도 탭처럼 URL(`?q=`)에 남기지 않는다.
- 상세에 갔다가 "메뉴판으로" 돌아오면 검색어·탭이 그대로다 — `cacheComponents` 가 이전 페이지를 `<Activity>` 로 숨겨 두기 때문(최근 3개 라우트).

#### `/menu/[id]` — 메뉴 상세

- 메뉴판 티켓을 크게 펼친 모양: 일러스트 · `WINNER/BEST/NEW` 배지 + ♡ 찜하기 · 이름 `........` 가격(점선 리더, 사이즈 메뉴는 이름만) · 영문명 · 설명 · 정보(카테고리, 판매 상태) · 주문 영역 · STUB 일련번호. 모바일은 세로로 쌓고 STUB 을 아래로 보낸다.
- **찜하기(`FavoriteButton`, client)**: 배지 줄 오른쪽 끝의 알약 버튼. 누를 때마다 `toggleFavorite(menu.id)` — 켜지면 검은 바탕 + 채운 하트. 글자는 늘 "찜하기"이고 상태는 `aria-pressed` 로 읽힌다(스크린리더 이름 "아메리카노 찜하기"). 품절이어도 찜할 수 있다. 찜 버튼은 **상세에만** 둔다(메뉴판 카드 · 메인 라인업 · 마이페이지 카드에는 없음 — 사용자 결정).
- **주문 영역(`AddToCart`, client)**: 사이즈 4칸 라디오(칸마다 사이즈 가격 — 사이즈별 가격표 역할, 기본 S) → 수량 스테퍼(1~20) + 합계 → `[← 메뉴판으로] [장바구니 담기]` → 담은 뒤 "장바구니에 아메리카노 M 3개를 담았어요. 장바구니 보기 ›"(`role="status"`). 디저트는 사이즈 없이 수량부터. 이미 담은 메뉴·사이즈면 수량을 더하고, 20개를 넘으면 남은 만큼만 담고 알려 준다. 품절이면 가격은 보이되 사이즈·수량·담기가 모두 막힌다.
- 위에 현재 위치(`메뉴판 › 커피`), 아래에 **같은 카테고리의 다른 메뉴** 최대 3개(메뉴판 순서, `MenuCard` 재사용).
- 메뉴판에 보이는 메뉴만 연다(`selectDetail`). HIDDEN · 숨김 카테고리 · 없는 id 는 `notFound()` → 같은 폴더의 `not-found.tsx`("SCRATCHED"). 품절은 열리고 스탬프 + 빨간 "품절" 상태로 보인다.
- 빌드 때 `generateStaticParams` 로 메뉴판의 메뉴를 모두 미리 만들고, 데이터는 `"use cache"` 로 id 별 캐시(메뉴판과 같은 `cacheLife("hours")`). 목록에 없던 id 는 첫 요청 때 렌더된다. 이때 정적 셸이 먼저 나가므로 없는 메뉴의 응답 코드는 404 가 아니라 200 + `noindex` 다(Next 문서의 스트리밍 동작).
- `params` 는 페이지 최상단이 아니라 `<Suspense>` 안의 `MenuDetailContent` 에서만 읽는다. `partialPrefetching` 은 모든 링크가 같은 App Shell 을 미리 받아 두는 방식이라, 밖에서 읽으면 Shell 이 URL 하나에 묶여 개발 모드에서 "URL data outside of Suspense" 가 뜬다. Shell 에는 같은 티켓 틀의 `MenuDetailSkeleton` 이 들어가고, 카드를 누르면 잠깐 보였다가 내용으로 바뀐다(빌드한 메뉴를 주소로 바로 열면 같은 HTML 안에서 곧바로 교체된다).
- 메인 `TODAY'S LINEUP` 카드도 해당 메뉴의 상세로 연결한다.

### 8.5 `/event` — Race Event

진행 중인 카페 이벤트를 보는 곳이다. **내 쿠폰은 여기서 보여주지 않는다**(`/my` — 8.10).

- `EventCard` 목록: `DAILY RACE 18:00 — 쿠폰 1장으로 참여하고 1~3위면 원금과 함께 추가 쿠폰을 받아보세요. [Race 참여하기 → /race]`, `주문 적립 — 주문 한 번에 쿠폰 1장` 등.
- 진행 중인 이벤트가 없으면 빈 상태 일러스트(빈 마구간 + "다음 이벤트에서 만나요").

### 8.6 `/admin` — 관리자 공통

- 사용자 사이트와 분리된 관리자 레이아웃: 왼쪽 사이드 내비(메뉴 관리 · 카테고리 관리) + 상단 "MOCK ADMIN — 변경 내용은 새로고침 시 초기화됩니다" 띠.
- 컨셉 톤은 유지하되(짙은 회색 사이드바·크림, 사이드바 상단에 한 줄형 `BrandLogo` + `ADMIN OFFICE`) 장식은 줄이고 표·폼 중심의 업무 화면으로 만든다. 마스코트·전광판 장식은 쓰지 않는다.
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
- 등록/수정 폼(모달): 이름, 영문명, 카테고리(select, `getCategories()`), 배지(없음/BEST/WINNER/NEW), 가격, 설명, 이미지 경로, 상태.
- 가격: "사이즈별 가격 (S · M · L · XL)" 체크(새 메뉴는 켜짐)를 켜면 4칸, 끄면 1칸. 저장 시 사이즈 메뉴의 `price` 는 S 가격으로 채운다. 체크를 껐다 켜도 입력은 남고, 빈 쪽은 다른 쪽 값(단일 가격 ↔ S)으로 채워 준다. 목록의 가격 칸은 사이즈 메뉴를 `4,000~5,500원 / S–XL` 로 보여 준다.
- 검증(`validateMenu`): 이름·영문명 필수, 가격(사이즈 메뉴는 4칸 각각)은 0 이상 정수(100원 단위), 큰 사이즈가 작은 사이즈보다 쌀 수 없다, 설명 100자 이내, WINNER 배지는 하나의 메뉴에만 둘 수 있다(다른 메뉴에 이미 있으면 안내).
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

### 8.9 `/cart` — 장바구니

```
┌ 담은 메뉴 3 ──────────────────── 전체 삭제 ┐  ┌ 주문 요약 ─────────┐
│ ☕ 아메리카노 (M)   [− 3 +]   13,500원  ×   │  │ 총 수량        5개 │
│    Americano · 4,500원                    │  │ - - - - - - - - - │
│ ☕ 아메리카노 (XL)  [− 1 +]    5,500원  ×   │  │ 합계     25,500원 │
│ 🍰 당근 케이크      [− 1 +]    6,500원  ×   │  │ 🎟 주문 시 쿠폰 +1 │
└───────────────────────────────────────────┘  │ [주문하기]  (목업)  │
                                               │ [메뉴 더 담기]     │
                                               └───────────────────┘
```

- Header 장바구니 아이콘에서 들어온다. 제목 `MY ORDER / CART`. 데이터는 `useCart()` 하나.
- 한 줄 = 메뉴 + 사이즈(같은 메뉴도 사이즈가 다르면 다른 줄): 일러스트 · 이름(상세 링크) + 사이즈 칩 · 영문명 · 단가 · 수량 스테퍼 · 금액 · 삭제(×). 모바일은 `일러스트 | 이름 · ×` / `수량 · 금액` 두 줄.
- 요약(PC 오른쪽 sticky, ≤960px 아래): 총 수량 · 합계(위에 티켓 절취선 점선) · "주문 시 쿠폰 +1" 안내 · "주문하기" · "메뉴 더 담기".
- **주문하기(목업)**: 실제 결제 없이 `placeOrder(lines)`(주문 한 건 `Order` 를 만들어 돌려줌) → `addOrder(order)`(주문 내역) → `earnCoupons(ORDER_COUPON_REWARD, "ORDER", "주문 적립 · 아메리카노 외 2건")` → `clear()`. 장바구니 자리에 완료 상태를 보여 준다: `ORDER No.0001` · "주문이 접수됐어요" · `아메리카노 외 1건 · 2개 · 10,500원` · "쿠폰 1장이 적립됐어요(보유 N장)" + [주문 내역 보기 → /my#orders] [메뉴판 보러 가기]. 처리 중에는 버튼을 막고 ref 로도 막아 두 번 적립되지 않게 한다.
- **Activity 주의**: Cache Components 는 다른 페이지로 가도 `/cart` 를 언마운트하지 않고 숨겨 두므로(최대 3개 경로) State 가 남는다. 주문 완료 · 오류 · 전체 삭제 확인은 `useLayoutEffect` cleanup 에서 되돌려, 메뉴를 더 담고 돌아오면 새 장바구니가 보이게 한다(`node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). 다른 페이지의 일회성 안내 State 도 같은 방식으로 다룬다.
- "전체 삭제" 는 같은 자리에서 "모두 삭제할까요? 삭제 / 취소" 로 한 번 더 묻는다(빨강은 위험 동작 전용). 줄 삭제 · 전체 삭제 뒤에는 포커스를 목록 제목(비면 빈 상태 제목)으로 옮긴다.
- 비어 있으면 "장바구니가 비어 있어요" + "메뉴판 보러 가기".

### 8.10 `/my` — 마이페이지

쿠폰 수만 보는 곳이 아니라 **"내 것"을 모아 보는 곳**이다(2026-10-13 결정): 내 정보 · 주문 내역 · 찜한 메뉴 · 쿠폰 + (자리만) 내 레이스 기록 · 좌석 예약 내역.
Header 의 `MY` 메뉴와 쿠폰 칩(`/my#coupons`)에서 들어온다. 로그인이 없으므로 Mock 사용자 1명 기준이다.
구성은 **요약 + 섹션 세로 나열**(사용자 결정) — 각 섹션은 최근 몇 개만 보여 주고 "전체 보기 (N) / 접기"로 같은 자리에서 펼친다(하위 주소 없음).

```
MY PAGE
┌ [말] MEMBER No.0007          ┊  보유 쿠폰   찜한 메뉴   주문 내역 ┐  ← 내 정보 | 요약 전광판
│      럭키 포니 님             ┊  [0][9]장   [0][2]개   [0][4]건  │    숫자 칸 → #coupons · #favorites · #orders
│      2026.10.01 가입 · …      ┊                                  │    (≤1023px 위아래로, 절취선도 가로)
└─────────────────────────────────────────────────────────────────┘
ORDERS  주문 내역                                            4건
┌ ORDER No.0004  10/13 15:04                       [쿠폰 +1] ┐  ← 영수증 카드, 최근 3건
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│ 아메리카노 [S]                         × 1        4,000원   │  ← 이름은 상세 링크
│ 당근 케이크                            × 1        6,500원   │
│ 총 2개                                           10,500원   │
└───────────────────────────────────────────────────────────┘
[ 전체 보기 (4) ]
MY PICKS  찜한 메뉴                                          2개
[썸네일][썸네일]  ← 최근 찜한 순, 최근 4개(PC 4열 · ≤1023px 3열 · 모바일 2열), 카드 → 상세
COUPONS  쿠폰                                           보유 9장
┌ 쿠폰 한 장으로 DAILY RACE 에 참여할 수 있어요.   [Race 참여하기] [메뉴 주문하기] ┐
│ · 주문할 때마다 1장 · 레이스 1~3위 추가 쿠폰 · 교환은 준비 중                   │
└───────────────────────────────────────────────────────────────────────────┘
적립 · 사용 내역 4건
┌ 10/13 18:02 ┊ [레이스 보상] Race #13 · 1위 (원금 1 + 추가 3)   +4 ┐  ← Race Ticket 줄, 최근 5건
├ 10/13 18:01 ┊ [레이스 참가] Race #13 · 3번 MOCHA 참가        −1 ┤     (+ 는 진한 글씨, − 는 회색)
MY RACES  내 레이스 기록                                   [준비 중]
┊ 레이스에 참여하면 내가 고른 말과 순위, 돌려받은 쿠폰이 여기에 기록돼요.  [출전표 보기] ┊
MY SEATS  좌석 예약 내역                                   [준비 중]
┊ 좌석을 예약하면 예약한 자리와 시간이 여기에 보여요.                    [좌석 보기] ┊
```

- **내 정보**: `getProfile()`(Mock) — 말 마스코트 · `MEMBER No.0007` · 닉네임 · 가입일 + "로그인 기능이 생기면 내 정보를 바꿀 수 있어요". 수정 기능은 없다.
- **주문 내역**: `orders`(최신순). 주문 순간의 장바구니 사본이라 메뉴 가격이 바뀌어도 그대로다. 비어 있으면 "아직 주문 내역이 없어요" + 메뉴판 링크.
- **찜한 메뉴**: `favorites` 순서대로, page 가 메뉴 Service 에서 받은 **메뉴판에 보이는 메뉴**만 그린다(숨김 메뉴 · 숨김 카테고리는 상세가 없어 빠진다). 품절은 흐리게 + `SOLD OUT`. 찜 해제는 상세의 ♡ 에서만 한다. 비어 있으면 "메뉴 상세에서 ♡ 찜하기를 누르면 여기에 모여요".
- **쿠폰**: 얻는 법 · 교환 준비 중 안내 + `couponHistory`. 쿠폰 교환은 규칙이 정해질 때까지 안내 문구만 둔다(버튼 없음).
- **내 레이스 기록 · 좌석 예약 내역**: 지금은 `PlannedSection`(점선 상자 + "준비 중" + 해당 페이지 링크). 9단계 · 11단계에서 실제 목록으로 바꾼다.
- 섹션은 `scroll-margin-top` 으로 #앵커 이동 시 헤더에 가리지 않는다.
- 프로필 · 메뉴 목록은 모두에게 같아 page 에 `"use cache"`, 쿠폰 · 찜 · 주문은 클라이언트 컴포넌트가 `useUser()` 로 읽는다. 시각은 클라이언트에서 만든 값이라 하이드레이션이 어긋나지 않는다.

---

## 9. 반응형 기준

| 구간 | 폭 | 주요 변화 |
|---|---|---|
| Desktop (기준) | ≥ 1200px | 최대 폭 1200px 중앙 정렬, `/seat` 3단 |
| Tablet | 768–1199px | 카드 2열, `/seat` 필터 상단 + 상세 모달 |
| Mobile | < 768px | 1열, 햄버거 내비, Bottom Sheet |

- **경마 트랙(경기 화면)**: 캔버스가 컨테이너 폭을 채우고 높이는 `clamp(260px, 32vw, 440px)`(모바일 `clamp(240px, 62vw, 320px)`). 장면의 치수가 모두 폭 · 높이 비율이라 가로 스크롤이 없다. 말 폭은 PC 12% · 모바일 15%, 번호 배지는 모바일 0.78배.
- **좌석 배치도**: `min-width: 720px` + 가로 스크롤. 스크롤 가능함을 알리는 그라데이션 힌트.
- 좌석·버튼 터치 영역 최소 44px.

---

## 10. 이번 단계에서 하지 않는 것

DB 연결 · Spring Boot API 연결 · 로그인/회원가입 · 실제 결제 · 실제 쿠폰 발급 · 실제 좌석 예약 API · WebSocket 실시간 통신.
→ 모두 Mock Data + React State 로 "동작하는 것처럼" 보여준다. 현금·실제 금전 배팅은 어떤 형태로도 구현하지 않는다.
→ 관리자 페이지도 인증 없이 열린다. 접근 제어는 로그인 기능을 붙일 때 함께 넣는다.
→ 장바구니는 담기·수량·삭제·합계와 목업 "주문하기"(주문 내역 기록 · 쿠폰 +1 · 장바구니 비우기)까지만 한다. 결제는 없고, 장바구니 · 주문 내역 · 찜은 저장하지 않는다(새로고침 시 비워짐).
→ 마이페이지의 내 정보 수정, 주문 취소 · 다시 담기는 하지 않는다.
→ 쿠폰을 메뉴로 바꾸는 교환(몇 장 → 어떤 메뉴)은 하지 않는다. 컨셉만 7절에 적어 두고, `/my` 에 "준비 중" 안내만 둔다.
→ README 의 쿠폰 수에 따른 할인율·포인트 적립률, 레벨별 시그니처 메뉴 해금도 이번 범위 밖이다.

---

## 11. 추후 백엔드 연결 경로

```
현재:  _data/*.ts (Mock) ─▶ _lib/*Service.ts ─▶ _hooks / page ─▶ _components
추후:  Spring Boot API   ─▶ _lib/*Service.ts ─▶ _hooks / page ─▶ _components
                          (이 파일만 교체)
```

- `lib/` 에 `API_BASE = process.env.NEXT_PUBLIC_API_BASE` 와 공용 fetch 헬퍼(`lib/api.ts`)를 추가하고, 각 라우트의 `*Service.ts` 가 그것을 쓰도록 교체한다. 교체가 끝나면 `_data/` 폴더는 지운다.
- 좌석 실시간 반영은 처음엔 polling(`setInterval` 로 `getSeats()` 재호출) → 이후 WebSocket/SSE 로 확장. 컴포넌트는 `seats` 배열만 받으므로 바뀌지 않는다.
- 레이스 결과는 최종적으로 서버가 결정해야 한다. 지금은 경주 번호 + 출발 시각으로 시드한 결정적 시뮬레이션이라 모든 클라이언트가 같은 결과를 내지만, 서버가 붙으면 (1) 서버가 경주마다 시드(또는 `ranking` + 이벤트 타임라인)를 내려주고 프론트는 그것을 **재생**하며, (2) 지나간 경주 자동 보충(`backfillHistory`)은 `GET /api/races/history` 로 대체한다. 시계 어긋남이 문제가 되면 서버 시각을 한 번 받아 보정한다.
- 쿠폰 차감·정산도 그때 서버로 옮긴다. `placeBet` 이 서버에서 1장을 빼고, 결과 확정 시 서버가 `RACE_PAYOUT` 만큼 돌려준 뒤, 프론트는 `UserProvider` 를 서버 값으로 다시 불러온다. 참여 횟수 제한(경주 시각당 1회 등)을 두기로 하면 그것도 서버에서 건다.

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
| 4-1 | 메뉴 사이즈 & 장바구니 | 2, 4 |
| 5 | 쿠폰 · 주문 적립 · 마이페이지 & 이벤트 | 1, 4-1 |
| 5-1 | 마이페이지 확장 — 내 정보 · 주문 내역 · 찜 | 5 |
| 6 | 경주 일정 & 카운트다운 | 1 |
| 7 | 말 출전표 & 쿠폰 걸기 | 5, 6 |
| 8 | 경주 시뮬레이션 & 애니메이션 | 7 |
| 9 | 경주 결과 · 쿠폰 정산 · 기록 | 8 |
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
- [x] (2026-10-08) 브랜드를 `manhattaN cafe` 로 통일 — `BrandLogo`(PC 한 줄형 · 모바일 적층형), 포인트 컬러 그레이스케일(`--brand-*`), 옅은 회색 푸터, 히어로 이미지를 일러스트로 교체
**완료 확인**
- [x] 5개 메뉴 링크가 모두 동작하고(빈 페이지라도) 현재 경로가 강조된다
- [x] 860px 이하에서 햄버거 메뉴가 열리고 닫힌다
- [x] 흰 배경 · 흰 헤더 · 옅은 회색 푸터 · Pretendard 제목이 적용되고, 경마장 느낌은 티켓 배지·전광판·카피로 드러난다
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
- [x] `menuService.ts` — `getTodayWinnerMenu` (2단계에서 미리 만들어 둠, 14단계 대시보드가 쓴다)
- [x] `_lib/menuBoard.ts` — `selectBoard`(노출 카테고리 `order` 순 · HIDDEN/숨김 카테고리 메뉴 제외) · `ticketSerial`
- [x] `MenuCategory.tsx` — 노출 카테고리 탭(`order` 순) + 전체 탭, 개수 표시, ←/→ · Home/End 키보드 이동
- [x] `MenuCard.tsx` — 티켓 카드(이미지 · 한/영 이름 · 가격 점선 리더 · 설명 · STUB 일련번호) — 4-1단계에서 가격을 STUB 안으로 옮김
- [x] BEST / WINNER / NEW 배지, 품절 스탬프
- [x] `MenuBoard.tsx`(client, 탭 State) + `app/(site)/menu/page.tsx` 조립(`"use cache"` 로 정적 셸)
- [x] `_lib/menuSearch.ts` + `MenuSearch.tsx` — 메뉴판 검색(부분 일치 + 한글 초성, 탭과 함께 적용, 빈 상태 안내)
- [x] `_lib/menuBoard.ts` — `parseMenuId` · `selectDetail`(메뉴판에 보이는 메뉴만 + 같은 카테고리 메뉴)
- [x] `app/(site)/menu/[id]/page.tsx` + `MenuDetail.tsx` + `not-found.tsx` — 메뉴 상세, 메인 라인업·메뉴판 카드에서 연결

**완료 확인**
- [x] 탭을 바꾸면 해당 카테고리 메뉴만 보인다
- [x] 숨김 카테고리 · HIDDEN 메뉴는 보이지 않는다
- [x] 품절 메뉴는 "품절"로 구분된다
- [x] PC 3열 / 태블릿 2열 / 모바일 1열
- [x] 이름 · 영문명 · 설명 · 초성으로 찾을 수 있고, 탭 개수가 검색 결과에 맞게 바뀐다
- [x] 카드를 누르면 상세가 열리고, "메뉴판으로" 돌아오면 검색어·탭이 그대로다
- [x] HIDDEN 메뉴 · 없는 id 의 상세 주소는 "SCRATCHED" 화면이 뜬다

---

### 4-1단계 — 메뉴 사이즈 & 장바구니 (`/cart`)

음료에 S · M · L · XL 사이즈별 가격을 두고, 상세에서 사이즈를 골라 장바구니에 담는다. 설계: 3(Header), 7, 8.4, 8.7, 8.9.

**구현**
- [x] `_types.ts` — `MenuSize`, `SizePrices`, `Menu.sizePrices` / `_data/menus.ts` — 음료 12개 사이즈별 가격, 디저트 `null`
- [x] `_lib/menuSize.ts` — `MENU_SIZES` · `priceOf`
- [x] `MenuCard.tsx` — STUB 에 `STUB` / `No.0001` + 음료는 사이즈별 가격 4줄, 디저트는 `ONE SIZE` 가격 / `MenuLineup` — 사이즈 메뉴는 `4,000원~`
- [x] `types/common.ts` — `CartLine` · `CartItem` · `CartState` / `lib/cart.ts` — 담기 합치기 · 수량 1~20 · 총 수량 · 합계
- [x] `components/CartProvider.tsx`(`useCart`) — 루트 레이아웃에서 감싼다 / `components/QuantityStepper.tsx`
- [x] `Header.tsx` — 장바구니 아이콘 + 총 수량 숫자 → `/cart`
- [x] `AddToCart.tsx` — 상세의 사이즈(가격 포함) · 수량 · 합계 · 담기 · 담은 뒤 알림
- [x] `app/(site)/cart/page.tsx` + `CartView.tsx` — 목록 · 수량 · 줄 삭제 · 전체 삭제(한 번 더 확인) · 요약 · 빈 상태
- [x] 관리자 `MenuForm` · `validateMenu` · `MenuAdminTable` — 사이즈별 가격 4칸 입력 · 검증 · 목록 표시

**완료 확인**
- [x] 메뉴판 카드와 상세에서 음료의 S · M · L · XL 가격이 보이고, 디저트는 가격 하나만 보인다
- [x] 상세에서 사이즈 · 수량을 고르면 합계가 바뀌고, 담으면 Header 숫자가 총 수량만큼 늘어난다
- [x] 같은 메뉴 · 같은 사이즈를 다시 담으면 한 줄의 수량이 늘고, 사이즈가 다르면 줄이 따로 생긴다
- [x] Header 아이콘을 누르면 `/cart` 로 가고, 수량 변경 · 삭제가 합계와 Header 숫자에 바로 반영된다
- [x] 품절 메뉴는 가격만 보이고 담을 수 없다
- [x] 관리자 폼에서 사이즈별 가격을 켜고 끌 수 있고, 큰 사이즈가 더 싸면 저장되지 않는다
- [x] PC · 모바일(390px)에서 메뉴판 · 상세 · 장바구니 확인

---

### 5단계 — 쿠폰 · 주문 적립 · 마이페이지 & 이벤트 (`/my`, `/cart`, `/event`)

쿠폰 한 종류의 단일 소스(UserProvider)를 완성하고, 주문 적립 · 내 쿠폰 확인 · 이벤트 안내를 붙인다. 설계: 3(Header), 7, 8.5, 8.9, 8.10.

**구현**
- [x] `types/common.ts` — `Coupon` · `rewards` · `addReward` 제거, `CouponReason` · `CouponLog` · `UserState`(7절)로 교체
- [x] `UserProvider` — `coupons`, `history`(5-1단계에서 `couponHistory` 로 이름 변경), `spendCoupon(reason, label)`, `earnCoupons(amount, reason, label)` 완성 (`INITIAL_COUPONS = 5`). 최신 값을 ref 로도 들고 있어 같은 틱에 두 번 불려도 0장 아래로 내려가지 않는다
- [x] Header 쿠폰 칩이 Context 값을 표시 (1단계 재구성 때 선반영)
- [x] `Header.tsx` — 내비에 `MY` 추가, 쿠폰 칩 링크 `/event` → `/my` / `Footer.tsx` 메뉴 줄에도 `MY`
- [x] `app/(site)/cart/_lib/orderService.ts`(`placeOrder`, `orderSummary`, `ORDER_COUPON_REWARD = 1`) + `CartView` 주문하기 활성화 · 완료 상태(`ORDER No.0001`)
- [x] `app/(site)/my/page.tsx` + `MyCoupons.tsx` · `CouponHistory.tsx` — 보유 쿠폰 전광판 · 교환 준비 중 안내 · 증감 내역 · 빈 상태
- [x] `app/(site)/event/_types.ts`, `_data/events.ts`, `_lib/eventService.ts`
- [x] `EventCard.tsx` — 가로 티켓 + 이동 버튼 / 이벤트 0개 빈 상태
- [x] 메인 히어로 문구의 "우승하면 음료 보상" → "3위 안에 들면 추가 쿠폰"

**완료 확인**
- [x] 쿠폰 수가 Header 와 `/my` 에서 같고, `/event` 에는 내 쿠폰이 없다
- [ ] `spendCoupon()` 은 0장일 때 false 를 돌려주고 수가 음수가 되지 않는다 — 아직 호출하는 화면이 없어 코드로만 확인. 7단계 `/race` 에서 화면으로 확인한다
- [x] 장바구니에서 주문하면 쿠폰이 1장 늘고(담은 수량과 무관), 장바구니가 비고, `/my` 내역 맨 위에 `+1` 이 생긴다 — 주문하기를 같은 틱에 두 번 눌러도 1장만 적립
- [x] 주문 뒤 메뉴를 더 담고 `/cart` 로 돌아오면 지난 주문 완료 화면이 아니라 새 장바구니가 보인다(Activity 로 남은 State 초기화 — 8.9)
- [x] Header 의 MY 메뉴 · 쿠폰 칩이 `/my` 로 이동하고 현재 경로가 강조된다 (861px 에서도 헤더가 넘치지 않음)
- [x] Race 참여하기 버튼이 `/race` 로 이동한다
- [x] `npm run build`, `npm run lint` 통과 · PC(1440) · 모바일(390)에서 `/cart` · `/my` · `/event` 확인

---

### 5-1단계 — 마이페이지 확장 (내 정보 · 주문 내역 · 찜)

마이페이지를 쿠폰 수만 보는 곳에서 "내 것"을 모아 보는 곳으로 넓힌다(2026-10-13 결정). 설계: 4, 7, 8.4(찜하기), 8.9, 8.10.

**구현**
- [x] `types/common.ts` — `Order` 추가, `UserState` 에 `favorites` · `toggleFavorite` · `orders` · `addOrder`, `history` → `couponHistory`
- [x] `UserProvider` — 찜(최근 찜한 순 토글) · 주문 내역(최신순) State
- [x] `orderService.placeOrder` 가 `Order`(장바구니 사본 · 총 수량 · 합계 · 요약 · 적립 쿠폰)를 돌려주고, `CartView` 가 `addOrder` 로 내역에 남긴다. 완료 화면에 수량 · 합계 + [주문 내역 보기 → /my#orders]
- [x] `menu/_components/FavoriteButton.tsx` — 상세 배지 줄 오른쪽 ♡ 찜하기(aria-pressed)
- [x] `my/_types.ts` · `_data/profile.ts` · `_lib/myService.ts`(`getProfile`) · `_lib/format.ts` · `_hooks/useShowMore.ts`
- [x] `MyOverview`(내 정보 + 요약 전광판 → #앵커) · `OrderHistory` · `FavoriteMenus` · `MyCoupons` + `CouponHistory` · `PlannedSection`(내 레이스 기록 · 좌석 예약 내역) · `MySection`
- [x] `my/page.tsx` — `"use cache"`, 프로필 + 메뉴판에 보이는 메뉴(찜 후보)를 Service 에서 받아 조립
- [x] Header 쿠폰 칩 · 이벤트 "내 쿠폰 보기" → `/my#coupons`

**완료 확인**
- [x] 상세에서 찜을 켜고 끄면 마이페이지 찜한 메뉴에 최근 찜한 순으로 바로 반영된다
- [x] 주문하면 마이페이지 주문 내역 맨 위에 그 주문(줄 · 수량 · 합계 · 쿠폰 +1)이 생기고, 요약의 주문 수 · 쿠폰 수가 함께 바뀐다
- [x] 주문 4건이면 3건만 보이다가 "전체 보기 (4)" 로 펼쳐지고 "접기" 로 돌아간다
- [x] `/my#orders` · `/my#coupons` 로 오면 해당 섹션이 헤더 바로 아래에 온다
- [x] 내 레이스 기록 · 좌석 예약 내역은 "준비 중" 자리와 해당 페이지 링크만 보인다
- [x] `npm run build`, `npm run lint` 통과 · PC(1440) · 모바일(390)에서 `/my` · `/menu/[id]` 확인

---

### 6단계 — 경주 일정 & 카운트다운

메인 · `/race` · Header 가 함께 쓰는 시간 기능.

사용자 결정(2026-10-13): 시작 10분 전부터 SOON · 시작 후 10분 LIVE / `/race` 는 준비 중 화면을 유지하고 전광판 컴포넌트만 만든다 / 메인 히어로 카운트다운은 지금 연결.

**구현**
- [x] `lib/time.ts` — `RACE_TIMES`(KST), `getRaceSchedule` · `getNextRaceTime` · `getLiveRaceTime`, `formatCountdown` · `formatCountdownSpoken` · `formatRaceSlot` · `formatRaceTimes`
- [x] `lib/useCountdown.ts` — 공용 1초 시계(초 경계 정렬, 구독자 없으면 타이머 정지), `useNow` · `useRaceCountdown` · `useRacePhase`, 하이드레이션 전 `--:--:--`
- [x] `components/RacePhaseBadge.tsx` · `Scoreboard` 의 `onDark`
- [x] `RaceCountdown.tsx` + `race.module.css` — `/race` 상단 전광판(다음 경기 · 남은 시간 · 내 쿠폰). 페이지에는 7단계에서 붙인다
- [x] Header RACE 메뉴의 SOON · LIVE 신호(PC 점 · 모바일 글자 배지)
- [x] 메인 히어로 NEXT RACE 슬라이드 — `HeroRaceClock` · 탭 제목, 슬라이드 문구 정리
- [x] Footer · `/event` 의 경주 시각을 `formatRaceTimes()` 로
- [x] (버그 수정) 모바일 햄버거 메뉴가 열려도 보이지 않던 문제 — 헤더 blur 를 `::before` 로(3절 Header)

**완료 확인**
- [x] 카운트다운이 1초마다 줄어든다 (2초 뒤 정확히 2초 감소)
- [x] 경주 시각이 지나면 다음 경주로 넘어가고, 마지막 경주 뒤에는 내일 첫 경주를 가리킨다 — 경계 13개(12:19:59 UPCOMING → 12:20 SOON → 12:30 LIVE → 12:40 다음 18:00, 18:10 → 내일 12:30, KST 자정 직후 등) 순수 함수 테스트 + 브라우저에서 17:59:57 → LIVE, 18:09:58 → 내일 12:30 자동 전환 확인
- [x] 새로고침 시 하이드레이션 경고가 없다(콘솔 오류 0) · 정적 셸에는 "매일 12:30 · 18:00 출발" + `--:--:--`
- [x] `npm run build`(`/` · `/race` 정적), `npm run lint` 통과 · PC(1440) · 모바일(390)에서 히어로 · 헤더 · 모바일 메뉴 · 전광판(검증용으로 잠시 붙였다가 되돌림) 확인

---

### 7단계 — 말 출전표 & 쿠폰 걸기 (`/race` BETTING)

설계: 7(쿠폰 규칙), 8.2 화면 구성 1~3.

사용자 결정(2026-10-13): 레이스 상태는 루트 `RaceProvider` / 최근 성적은 경주 기록에서 계산 / 쿠폰을 건 뒤에는 출발 대기 패널 / 말 이미지는 `말에셋.png` 를 잘라 쓰되 이름에 어울리는 말을 고르고(조끼 숫자 ≠ 게이트 번호 허용) 대표색은 조끼 색, 출전 7장만.

**구현**
- [x] `/race` 의 준비 중 화면을 실제 페이지로 교체하고 맨 위에 `RaceCountdown`(6단계) 을 붙인다
- [x] `scripts/split-horses.mjs` + `assets/horse-sheet.png` → `public/images/horses/*.png` 7장(배경 잔여물 정리 · 같은 캔버스)
- [x] `app/(site)/race/_types.ts`(`Horse` 에 `nameKo` · `colorName` · `image`, `recentResults` 제거, `RaceBet`), `_data/horses.ts`, `_data/raceHistory.ts`(Race #8~#12), `_lib/raceService.ts` (`getHorses`, `getRaceHistory`, `placeBet`)
- [x] `_lib/payout.ts` — `RACE_ENTRY_COUPONS = 1` · `RACE_PAYOUT = { 1: 4, 2: 3, 3: 2 }`(원금 포함, 우선값) · `payoutFor(rank)`(4위 이하 0) · `payoutTable` · `payoutSummary`
- [x] `_lib/records.ts` — `nextRaceNo` · `recentRanks` · `TRAIT_LABEL` · `textOn`
- [x] `components/RaceProvider.tsx` + 루트 레이아웃 / `useRace` — 기록 합치기 · 경주 번호 · BETTING → READY 전환, `spendCoupon("RACE_BET", …)`
- [x] `HorseCard.tsx` · `GateBadge.tsx` — 게이트 번호 · 이름 · 말 이미지 · 대표색 · 성향 · 최근 성적 · 설명 · 선택 버튼
- [x] `PayoutGuide.tsx` — 출전표 위 보상 안내(`RACE_PAYOUT` 에서 생성)
- [x] `BetConfirmModal.tsx` — "OOO에 쿠폰 1장을 사용하시겠습니까?" + 보상 안내 + 보유 수 변화
- [x] `ReadyPanel.tsx` — 출발 대기 패널(8단계에서 트랙으로 교체)
- [x] 쿠폰 0장이면 선택 버튼 비활성 + 주문 적립 안내
- [ ] **게이트 번호를 지난 경주 도착 순서로 매기기(팀 협의 2026-10-13)** — 8.2 "게이트 번호 규칙" 대로 말 id 와 게이트 번호를 나누고, 출전표 · 확인창 · READY · 쿠폰 내역 문구가 그 경주의 게이트 번호를 쓰게 한다. 출전표 카드는 게이트 번호 순. 기록이 없는 첫 경주는 무작위 순서를 한 번만 정해 `RaceProvider` 에 둔다

**완료 확인**
- [ ] Race #13 출전표의 게이트 번호가 Race #12 도착 순서(1번 COOKIE · 2번 LATTE · 3번 THUNDER · 4번 MOCHA · 5번 CARAMEL · 6번 ESPRESSO · 7번 VANILLA)와 같고 카드도 그 순서로 놓이며, 경주가 끝나면 다음 경주 번호가 그 결과대로 다시 매겨진다
- [ ] 기록이 없으면 무작위 순서로 번호가 매겨지고, 다시 그리거나 다른 페이지를 다녀와도 그 순서가 그대로다(빌드 · 하이드레이션 경고 없음)
- [x] 출전표 7장이 보이고 최근 성적 1위가 금색으로 강조된다(금색 칸 3개 — THUNDER · ESPRESSO · COOKIE)
- [x] 확인 → 쿠폰 1장 감소(Header 에도 반영) + `/my` 내역에 `−1`, 취소 → 변화 없음 · [사용하기] 를 같은 틱에 두 번 눌러도 1장만
- [x] 0장일 때 선택할 수 없다(검증용으로 초기 쿠폰을 잠시 0장으로 빌드해 확인 후 되돌림)
- [x] 쿠폰을 건 뒤 다른 페이지 5곳을 다녀와도 READY · MY PICK 이 남는다(RaceProvider)
- [x] 순수 함수 테스트(보상 · 기록 무결성 · 다음 번호 13 · 최근 성적 · 배지 글자색), `npm run build`(`/race` 정적) · `npm run lint` 통과, 콘솔 오류 없음 · PC(1440) · 모바일(390) 확인

---

### 8단계 — 경주 시뮬레이션 & 애니메이션 (`/race` READY → RUNNING)

설계: 8.2 상태 머신 · 화면 구성 3-1 · 4 · 레이스 시뮬레이션.

사용자 결정(2026-10-13): 경기 화면은 아케이드 경마 레퍼런스(측면 뷰 · 잔디 · 흰 울타리 · 번호 배지 · 하단 순위 바) 2장을 따른다 / **선두 추적 카메라** / **원근 잔디 · 레인선 없음** / CSS 대신 **WebGL — PixiJS v8**, 경기 화면만 캔버스(머리띠 · HUD · 토스트는 DOM) / 추가 이미지 에셋은 "필요한 것을 검색해 알려 달라(유료 무료 무관)" → 아래 후속.

**구현**
- [x] `_lib/simulation.ts` — `createRace` · `step` · `advanceTo` · `liveOrder` · `leaderProgress` (기본 속도 · trait 구간 배율 · drift · 랜덤 이벤트 · 스퍼트 · 추월 · 선두 경쟁 · 도착 순위 · 18초 안전장치 · 통과 후 달려 나가기)
- [x] `_lib/messages.ts` — 이벤트 메시지 템플릿(OVERTAKE 는 올라선 순위에 따라 문구가 다르다)
- [x] `_types.ts` — `RaceEventType` · `RaceEventMessage.at` · `RunnerState` · `RaceRun`
- [x] `components/RaceProvider.tsx` — `startRace(run)` · `finishRace(ranking)` · `runRef` · `ranking`(단계 전환은 `transition` 하나로)
- [x] `useRace.startRace` — 출발 시각 = 지금 + 3초 / `useRaceRun` — rAF 루프(effect 안, 경과 시간 기준 따라잡기), 캔버스 매 프레임 · DOM 100ms, 토스트 큐(1.5초씩 · 3초 지난 것은 버림), 7마리 도착 + 1.5초 뒤 `finishRace`
- [x] `_lib/trackScene.ts` — PixiJS 장면: 생울타리 · 먼 울타리 · 잔디 줄무늬 · 원근 그늘 · START/FINISH 기둥 · 말 7마리(배지 · MY · 그림자 · 들썩임 · 먼지) · 가까운 울타리, `cameraFor`, ResizeObserver, `destroy`
- [x] `HorseTrack.tsx` — 머리띠(READY · [경주 시작] / NOW RACING LIVE / FINISH) + 캔버스 호스트(WebGL 실패 시 안내) + 3·2·1·GO! + `RaceEventMessage` + HUD(RACE # ┊ 순위 배지 ┊ REMAINING m)
- [x] `ReadyPanel` · (중간 CSS 버전의) `HorseRunner` 삭제, `RaceBoard` 에서 `HorseTrack` 조립, `HorseCard` 의 내 말 문구(출발 대기 중 · 경주 중 · 경주 종료)
- [x] `pixi.js@8.22.0` 추가(`/race` 에서만 동적 import)
- [ ] **후속 — 이미지 에셋(사용자 요청)**: 검색 결과 기성 에셋은 대부분 픽셀/벡터 스타일이라 기존 말에셋(AI 생성 치비)과 맞지 않는다. (1) 말 달리기 프레임 — 같은 도구로 "같은 말 · 측면 · 달리기 4~6 프레임 시트"를 생성해 받으면 `trackScene` 의 Sprite 를 `AnimatedSprite` 로 바꾼다. (2) 잔디 · 생울타리 · 울타리 — CSS 로 그린 타일을 그대로 써도 되고, 이미지를 받으면 `turfTexture · hedgeTexture · railTexture` 세 함수만 바꾼다(seamless · 256×64 정도). (3) 관중석 · 나무 실루엣 같은 원경은 선택.

**완료 확인**
- [x] 시뮬레이션을 여러 번 돌려 경주 시간이 10~15초 안에 들어온다 — 4,000회: 7마리 완주 11.2~14.9초(중앙값 12.7초), 강제 마감 0회
- [x] 말마다 우승 확률이 한쪽으로 크게 쏠리지 않는다 — 12.5~16.0%(처음 값은 추입형 33% 라 trait 배율 · 스퍼트 배율을 낮춰 맞췄다)
- [x] 경주 중 추월이 눈에 보이고 이벤트 메시지가 1~2초 보였다 사라진다 — 경주당 선두 교체 2.4회, 브라우저에서 토스트 "🔥 COOKIE가 속도를 올립니다!" · "🏁 THUNDER와 ESPRESSO의 치열한 선두 경쟁!" 확인
- [x] 다른 페이지에 갔다 돌아와도 경주가 이어진다 — 경주 중 HOME 으로 갔다 3초 뒤 RACE 로 복귀: 남은 거리 496m → 130m, 캔버스 다시 생성
- [x] `npm run build`(`/race` 정적) · `npm run lint` · `tsc` 통과, 콘솔 오류 · 경고 0 · headless Chrome(SwiftShader WebGL) 1440 · 390 에서 READY · 카운트다운 · RUNNING · FINISHED 확인

**추가 — 경기 후 순위 표시 · 경주 시각 동시 출발 · 관람(사용자 요청 2026-10-13 저녁)**

사용자 결정: 지나간 경주는 결정적 시뮬레이션으로 자동 기록(누가 언제 들어와도 번호 · 최근 성적이 같게) / 결과 섹션은 순위만(쿠폰 정산 · 내 레이스 기록은 9단계 그대로).

- [x] `lib/time.ts` — `NEXT_PUBLIC_RACE_TIMES` 환경변수 · `RACE_GATE_CLOSE_MS`(10초) · `getRaceStartsBetween`
- [x] `_lib/simulation.ts` — 시드 난수(mulberry32, `seedFor`) · 20ms 고정 스텝 · `prevProgress` 보간 · `simulateRace` · `RACE_SETTLE_MS`
- [x] `_lib/records.ts` — `backfillHistory`(최근 40경주까지 시뮬레이션, 그보다 오래된 번호는 건너뜀) · `mergeHistory` · `formatRaceDate` · `rankLabel`
- [x] `components/RaceProvider.tsx` — `bets`(경주 번호별) · `results` · `placeBet` · `recordResult` · `runRef`. 단계 · [경주 시작] 제거
- [x] `useRace` — 1초 시계로 `RaceStage`(WAIT · RUNNING · FINISHED) 계산, 마감 · 쿠폰 부족 잠금(`lock`), 지나간 경주 보충(확실히 끝난 마지막 출발 시각이 바뀔 때만 다시 계산) / `useRaceRun` — 출발 3초 전까지 타이머 대기 → rAF, 경주가 바뀌면 run 새로, 끝나면 `recordResult`
- [x] `HorseTrack` — 머리띠 문구 표(8.2 화면 구성 3-1), 버튼 없음, 끝까지 본 스냅샷이 없으면 확정 순위로 결승 장면
- [x] `RaceResult.tsx` — 최근 경주 1~7위(트랙과 출전표 사이), 내 말 MY PICK · WIN/PLACE/SHOW · 경주 중에는 숨김
- [x] `RaceBoard` — 마감 안내 · 버튼 잠금 · 다음 경주 번호 · 건 카드 문구
- [x] `/race/lab`(실험실 — 팀원 작성) 호출부를 바뀐 API(시드 내장 · 고정 스텝)에 맞춤: 시드 입력을 가짜 출발 시각(분)으로

**완료 확인**
- [x] 두 탭(참여자 A · 관람자 B)의 시계를 17:59:30 으로 맞춰 실행: 들어오자마자 지나간 12:30 경주가 "Race #13 순위"로 보충돼 있고 출전표는 #14 · 17:59:50 마감 뒤 B 의 버튼 7개 비활성("DISABLED") · 18:00 에 두 탭 모두 NOW RACING(같은 순위 진행) · 18:00:20 쯤 두 탭 모두 FINISH, **결과 섹션의 1~7위가 두 탭에서 같음**(5 · 2 · 6 · 7 · 1 · 4 · 3) · 끝나면 출전표가 #15 로 바뀌고 버튼이 다시 열림 · 콘솔 오류 0
- [x] 백그라운드 탭(rAF 정지)은 경주가 끝난 뒤 자동 보충 결과로 FINISHED 무대 · 결과 섹션을 보여 준다(처음에는 멈춘 프레임의 순위를 머리띠 · HUD 에 썼던 문제를 고침)
- [x] 순수 함수: 시드 결정성 300/300 · 시드가 다르면 다른 경주 · 보충 40경주 25ms
- [ ] (9단계) 결과 섹션에 쿠폰 정산 문구 · 내 레이스 기록

---

### 9단계 — 경주 결과 · 쿠폰 정산 · 기록 (`/race` FINISHED)

설계: 7(쿠폰 규칙), 8.2 화면 구성 5~6.

**구현**
- [x] `_data/raceHistory.ts`, `raceService.getRaceHistory` (7단계에서 함께 — 최근 성적 · 경주 번호 계산에 필요)
- [ ] 끝난 경주를 `RaceProvider.results` 맨 앞에 추가(출전표 최근 성적 · 다음 경주 번호가 함께 바뀐다)
- [ ] FINISHED 진입 시 정산 — 1~3위면 `earnCoupons(payoutFor(rank), "RACE_PAYOUT", …)`, `raceNo` 로 경주당 한 번만
- [ ] `RaceResultModal.tsx` — 1~3위, YOUR HORSE + 순위, WIN! / PLACE! / SHOW! / NEXT TIME!, 돌려받은 쿠폰(원금 + 추가) · 보유 수
- [ ] 1~3위 confetti
- [ ] `RaceHistory.tsx` — RECENT RACES 최근 5경기, 방금 경주를 맨 앞에 추가
- [ ] 다시 하기 → BETTING 초기화
- [ ] 내 레이스 기록 — `UserState` 에 내가 참여한 경주(경주 번호 · 고른 말 · 순위 · 돌려받은 쿠폰) 추가, `/my` 의 MY RACES 를 `PlannedSection` 에서 실제 목록으로 교체

**완료 확인**
- [ ] 결과 모달의 순위가 트랙 도착 순서와 같다
- [ ] 경주가 끝나면 `/my` 내 레이스 기록 맨 위에 그 경주가 생긴다
- [ ] 내 말이 1·2·3위면 쿠폰이 각각 4·3·2장 늘고(건 1장 포함 순증 +3·+2·+1), 4위 이하면 건 1장만 빠진 채로 끝난다
- [ ] 결과 모달을 다시 열거나 다른 페이지에 갔다 와도 두 번 지급되지 않는다
- [ ] `/my` 내역에 참가 `−1` 과 정산 `+N` 이 순서대로 남는다
- [ ] 다시 하기 후 새 경주의 번호가 1 늘어난다
- [ ] (조율) 몇 경주 돌려 본 뒤 `RACE_PAYOUT` 수량과 참여 횟수 제한 여부를 다시 정한다

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
- [ ] 좌석 예약 내역 — 내가 예약한 좌석을 페이지를 넘나드는 값(`UserState`)으로 남기고, `/my` 의 MY SEATS 를 `PlannedSection` 에서 실제 목록으로 교체

**완료 확인**
- [ ] 예약하면 배치도 · 요약 숫자가 즉시 바뀐다
- [ ] 예약한 좌석이 `/my` 좌석 예약 내역에 보인다
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
- [x] `Hero.tsx` — 전폭 슬라이더 골격(탭 페이지네이션 · 자동 전환 · 진행바). 현재 NEXT RACE 1장(카운트다운 + 사진)
- [x] `MenuLineup.tsx` + `_lib/lineup.ts` — TODAY'S LINEUP 배지 메뉴 8개 그리드
- [x] NEXT RACE 슬라이드에 카운트다운 연결(6단계에서 함께 함 — `HeroRaceClock`)
- [ ] 히어로 슬라이드 추가 — 오늘의 WINNER 메뉴 · 이용 가능 좌석 · 내 쿠폰/이벤트 (각 Service 값으로 page 가 조립)
- [ ] `DashboardCard.tsx` — 이용 가능 좌석 · 오늘의 인기 메뉴 · 내 쿠폰 · 다음 경주 (슬라이드로 흡수할지 별도 섹션으로 둘지 결정)
- [ ] `app/(site)/page.tsx` — `getSeatSummary`, `getTodayWinnerMenu` 를 각 라우트 Service 에서 가져와 조립

**완료 확인**
- [ ] 카드 4개가 각각 `/seat`, `/menu`, `/my#coupons`(내 쿠폰), `/race` 로 이동한다
- [ ] 쿠폰 수가 Header · `/my` 와 같다
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
