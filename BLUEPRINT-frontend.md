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
| 관리자 페이지 | `/admin/menus`(메뉴 관리), `/admin/categories`(카테고리 관리), `/admin/race`(경주 관리), `/admin/event`(이벤트 관리 · `/admin/event/[id]` 상세) — 인증 없이 Mock 으로 동작. 경주 · 이벤트 변경은 localStorage 에 남아 같은 브라우저의 손님 화면에 반영(사용자 결정 2026-10-14) |
| 구현 순서 | 기능 단위 15단계 TODO + 16단계(경주 · 이벤트 관리) (12절) |

**컨셉 한 줄:** "빈티지 경마장을 테마로 한 감성 카페". 카지노·도박 사이트처럼 보이면 실패다.

---

## 1. 프로젝트 폴더 구조

**기능(라우트) 단위 Colocation 구조.** 한 페이지에서만 쓰는 컴포넌트·훅·로직·Mock Data·타입은 그 라우트 폴더 안에 `_` 접두사 폴더(Next.js 비공개 폴더 — 라우트로 잡히지 않음)로 둔다. 둘 이상의 페이지가 쓰는 것만 최상위 `components/`, `lib/`, `types/` 로 올린다.

```
frontend/
├─ app/
│  ├─ layout.tsx                  # 루트: <html>, 폰트, UserProvider · CartProvider · RaceProvider(+ RaceSettlement) (Header/Footer 없음)
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
│  │  │  │  ├─ GateBadge.tsx      # 게이트 번호 원(번호 = 그 경주의 게이트 번호, 대표색 = 조끼 색, 글자색은 대비 계산)
│  │  │  │  ├─ PayoutGuide.tsx    # "쿠폰 1장으로 참여 · [1위 4장] [2위 3장] [3위 2장] 돌려받기"
│  │  │  │  ├─ BetConfirmModal.tsx# "MOCHA에 쿠폰 1장을 사용하시겠습니까?"
│  │  │  │  ├─ HorseTrack.tsx     # 트랙 무대 — 머리띠(READY · [경주 시작] · LIVE · FINISH) + 경기 화면(PixiJS 캔버스, _lib/trackScene) + HUD(순위 · 남은 거리) + 카운트다운 · 토스트(DOM)
│  │  │  │  ├─ RaceCountdown.tsx  # 상단 전광판(다음 경기 · 남은 시간 · 내 쿠폰)
│  │  │  │  ├─ RaceEventMessage.tsx # 경기 중 이벤트 토스트(캔버스 위 DOM, 1.5초)
│  │  │  │  ├─ RaceResult.tsx     # 경주 결과 — 최근 경주 1~7위(트랙 무대와 출전표 사이), 내 말 MY PICK · WIN/PLACE/SHOW + 쿠폰 정산 줄
│  │  │  │  ├─ RaceResultModal.tsx# 정산 알림 모달 — 내 말 순위 · 돌려받은 쿠폰 · 보유 수 · 1~3위 줄, 1~3위 confetti(CSS)
│  │  │  │  ├─ RaceHistory.tsx    # RECENT RACES — 출전표 아래 최근 5경기 1~3위, 내가 건 경주는 MY PICK
│  │  │  │  └─ race.module.css    # /race 스타일(전광판부터 7~9단계에서 이어 붙임)
│  │  │  ├─ _hooks/
│  │  │  │  ├─ useRace.ts         # useRaceHistory(기록 합치기 — /admin/race 도 씀) + useRace(경주 번호 · 쿠폰 걸기 · 결과 모달 알림) + useRaceRun(rAF 루프 — 캔버스 매 프레임 · DOM 10Hz · 토스트 큐)
│  │  │  │  └─ useRaceHorses.ts   # (16단계) 출전마 구독 — page 가 받은 출전마에 관리자 변경(horseStore)을 겹친다(RaceBoard · /my MyRaces · /admin/race)
│  │  │  ├─ _lib/
│  │  │  │  ├─ simulation.ts      # 순수 함수: createRace · step · advanceTo(속도 · 성향 · 이벤트 · 순위 · 18초 안전장치) · seededShuffle — UI 의존 없음
│  │  │  │  ├─ messages.ts        # 이벤트 메시지 템플릿
│  │  │  │  ├─ trackScene.ts      # PixiJS 장면(잔디 · 울타리 · 말 · 결승선 · 먼지) + 카메라(cameraFor) — React 와 무관
│  │  │  │  ├─ payout.ts          # RACE_ENTRY_COUPONS · RACE_PAYOUT · payoutFor · payoutTable · payoutSummary · payoutBreakdown · payoutLabel
│  │  │  │  ├─ records.ts         # 순수 함수: nextRaceNo · recentRanks · backfillHistory(지나간 경주 결정적 보충 — 그 경주 당시 출전마) · raceStartAt(경주 번호 → 출발 시각) · mergeHistory · gatesFor · gatesAfter · byGate(게이트 번호) · rankLabel · TRAIT_LABEL · textOn
│  │  │  │  ├─ horseStore.ts      # (16단계) 출전마 저장소 — 기본값 + 관리자 변경 버전(localStorage) · latestHorses(표시) · raceHorsesAt(시뮬레이션) · saveHorses
│  │  │  │  └─ raceService.ts     # 데이터 접근(getHorses, getRaceHistory, placeBet, getRaceResult(raceNo)) + 관리자(updateHorse, getRaceTimes, updateRaceTimes)
│  │  │  ├─ _data/
│  │  │  │  ├─ horses.ts          # 7마리(이미지 · 조끼 색)
│  │  │  │  └─ raceHistory.ts     # Race #8~#12, 경주마다 7마리 전체 순위
│  │  │  ├─ _types.ts             # Horse, Gates, RaceStage, RaceResult, RaceBet, RaceEventMessage, RunnerState, RaceRun ...
│  │  │  └─ lab/                  # /race/lab 개발용 실험실(시드 · 배속 · 되감기 · 이벤트 강제 · 게이트 번호 = 직전 실험 경주 도착 순서) — 쿠폰 · 단계와 무관, noindex
│  │  │
│  │  ├─ seat/                    # /seat  ★ 핵심 — 날짜 · 지점 · 시간대 → 의자 단위 예약(8.3, 2026-10-13 재설계)
│  │  │  ├─ page.tsx              # "use cache" — 제목 → SeatBooking(좌석 · 평면도 · 지점 · 시간대를 Service 에서)
│  │  │  ├─ _components/
│  │  │  │  ├─ SeatBooking.tsx    # 조립(client) — BookingBar · [SeatCanvas | 패널(일정 선택 → 선택 좌석 → 완료)] · 모달 · 모바일 고정 바
│  │  │  │  ├─ BookingBar.tsx     # 고른 지점 · 날짜 · 시간대 · 인원 칩 + [일정변경] | SeatSummary
│  │  │  │  ├─ SeatSummary.tsx    # AVAILABLE SEATS n / 71 전광판 + 빈 테이블 인원별 수 + 마지막 업데이트
│  │  │  │  ├─ SeatCanvas.tsx     # 어두운 캔버스 — 배율 · 확대/축소 · 미니맵 · 덮개 안내 · [예약대기] + 범례
│  │  │  │  ├─ CafeFloorPlan.tsx  # 평면도 — 창문 · 바 · 카운터 · 화장실 · 출입구 · 통로 · 구역 알약 · 테이블 · 의자(Chair)
│  │  │  │  ├─ Chair.tsx          # 의자 하나(버튼) — 상태별 모양 · 아이콘 · aria-label (chairClassName · chairGlyph 는 범례 · 카드 공용)
│  │  │  │  ├─ SeatLegend.tsx     # 색 + 아이콘 + 텍스트 범례(상태별 의자 수)
│  │  │  │  ├─ SchedulePanel.tsx  # STEP 1 — DatePicker · 지점 칩 · 인원 1~8 · 시간대 카드(잔여석 · 진행 중 · 매진 · 마감) · [좌석 선택하기] / [예약대기 신청하기]
│  │  │  │  ├─ DatePicker.tsx     # 달력(월 이동 · 일요일 빨강 · 오늘 · 범위 밖 흐림)
│  │  │  │  ├─ SelectionPanel.tsx # STEP 2 — 선택 좌석 카드 목록 · [예약하기] + SelectionBar(모바일 고정 바 + Bottom Sheet)
│  │  │  │  ├─ ReservationDone.tsx# STEP 3 — RESERVED 스탬프 "예약되었습니다." + 예약 내용
│  │  │  │  ├─ ReserveConfirmModal.tsx # "예약 안내" → [확인하고 예약하기]
│  │  │  │  ├─ WaitlistModal.tsx  # "원하는 좌석이 없으면? 예약대기를 신청하세요!" → [신청하기]
│  │  │  │  ├─ icons.tsx          # ✓ · 사람 · 자물쇠 · 공구 · 핀 · 종 · 화살표 · 확대/축소 SVG(currentColor)
│  │  │  │  ├─ SeatFilter.tsx     # (12단계) 배치도 카드 위쪽 FILTER 줄 — [전체]/[이용 가능만] · 특징 칩 4개 · "N명 기준" · 초기화
│  │  │  │  ├─ RecommendedSeat.tsx# (12단계) RECOMMENDED 줄 — ★ 카드 3개(누르면 의자 선택) · 안내 · 대안 1개
│  │  │  │  ├─ SeatStatusDevTool.tsx   # (13단계)
│  │  │  │  └─ seat.module.css
│  │  │  ├─ _hooks/
│  │  │  │  ├─ useSeatBooking.ts  # 예약 흐름 단일 State(단계 · 날짜 · 지점 · 인원 · 시간대 · 선택 의자) + 서버 상태와 내 예약 합치기 · 요약 · 예약/대기 호출 · selectChairs(추천)
│  │  │  │  ├─ useMinuteClock.ts  # 1분 시계(useSyncExternalStore) — 오늘 · 지나간 시간대 판정
│  │  │  │  └─ useSeatFilter.ts   # (12단계) 필터 State — 전체/이용 가능만 · 특징 토글 · 초기화
│  │  │  ├─ _lib/
│  │  │  │  ├─ geometry.ts        # FLOOR 900×702 · 테이블 크기 · 의자 자리(chairsOf) · chairId
│  │  │  │  ├─ labels.ts          # 구역·상태·특징 라벨 · chairLabel("T03 3번" · "B07") · chairDescription
│  │  │  │  ├─ schedule.ts        # 예약 범위 · 시간대 상태(OPEN · LIVE · CLOSED) · 달력 칸 · sameSlot · 시간대 범위 필터
│  │  │  │  ├─ mockStatus.ts      # 지점|날짜|시간대 시드의 결정적 의자 상태(서버가 붙으면 지운다)
│  │  │  │  ├─ summary.ts         # summarize(의자 상태 → 잔여 · 상태별 수 · 빈 테이블 인원별)
│  │  │  │  ├─ filter.ts          # (12단계) 순수 함수: matchesFilter · freeChairIds · fitsPeople · FILTER_FEATURES
│  │  │  │  ├─ recommend.ts       # (12단계) 순수 함수: recommendSeats(점수 · 상위 3개 · 바석 묶음 · 대안)
│  │  │  │  └─ seatService.ts     # getBranches · getSeats · getFloorPlan · getTimeBlocks · getChairStatuses · getSlotAvailability · reserveChairs · joinWaitlist · cancelReservation · getSeatSummary
│  │  │  ├─ _data/
│  │  │  │  ├─ seats.ts           # 30자리(테이블 17 · 바석 13 = 의자 71), x·y %
│  │  │  │  ├─ floorPlan.ts       # 구역 4 + 구조물(창문 · 바 · 카운터 · 화장실 · 출입구 · 통로)
│  │  │  │  ├─ branches.ts        # 지점 3곳(마포 본점 · 강남점 · 성수점)
│  │  │  │  └─ schedule.ts        # TIME_BLOCKS(2시간 6개) · BOOKING_DAYS 14 · MAX_PEOPLE 8
│  │  │  └─ _types.ts             # Seat, Chair, FloorFixture, FloorSection, FloorPlan, Branch, TimeBlock, SeatSlot, ChairStatusMap, SlotAvailability ...
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
│  │  ├─ event/                   # /event  진행 중 · 노출 허가 이벤트 (내 쿠폰은 /my)
│  │  │  ├─ page.tsx              # "use cache" 제목 + EventList(클라이언트 — 오늘 날짜 · 관리자 변경을 따른다)
│  │  │  ├─ [id]/page.tsx         # (16단계) /event/[id] 상세 — generateStaticParams(기본 이벤트) + Suspense 안에서 params → EventDetail
│  │  │  ├─ _components/
│  │  │  │  ├─ EventList.tsx      # (16단계) 목록 — 진행 중 → 예정 → 종료, 시계 전에는 빈 자리
│  │  │  │  ├─ EventCard.tsx      # 가로 경마 티켓(STUB: 일련번호 · 운영 안내 · 시각 · 상태 | 이름(상세 링크) · 기간 · 설명 · [자세히 보기] · 버튼) + EventStatusChip
│  │  │  │  ├─ EventDetail.tsx    # (16단계) 상세 — 큰 티켓 머리 + 참여 방법 · 유의 사항 + 버튼, 볼 수 없으면 CLOSED 안내
│  │  │  │  └─ event.module.css
│  │  │  ├─ _hooks/
│  │  │  │  └─ useEvents.ts       # (16단계) 이벤트 저장소 구독
│  │  │  ├─ _lib/
│  │  │  │  ├─ eventStatus.ts     # (16단계) 순수 함수: autoStatus · eventStatus(수동 우선) · isShownOnSite · sortForSite · formatEventPeriod · statusHint(D-day) · statusReason · visibilityReason · eventTimeText · parseEventId
│  │  │  │  ├─ eventStore.ts      # (16단계) 이벤트 저장소 — 기본값 또는 관리자가 바꾼 목록(localStorage)
│  │  │  │  └─ eventService.ts    # getEvents · getEvent + 관리자(createEvent · updateEvent · deleteEvent · updateEventVisibility · updateEventStatus · resetEvents)
│  │  │  ├─ _data/
│  │  │  │  └─ events.ts
│  │  │  └─ _types.ts             # CafeEvent, CafeEventInput, EventStatus, EventTimeMode
│  │  │
│  │  └─ my/                      # /my  마이페이지 (로그인 없이 Mock 사용자 1명)
│  │     ├─ page.tsx              # "use cache" — 프로필 + 찜 후보 메뉴(메뉴 Service) + 출전마(레이스 Service) 조립, 섹션 세로 나열
│  │     ├─ _components/
│  │     │  ├─ MyOverview.tsx     # 내 정보(Mock 프로필) + 요약 전광판(쿠폰 · 찜 · 주문 수 → #앵커)
│  │     │  ├─ OrderHistory.tsx   # 주문 내역 — 영수증 카드, 최근 3건 + 전체 보기
│  │     │  ├─ FavoriteMenus.tsx  # 찜한 메뉴 — 정사각 썸네일 카드, 최근 4개 + 전체 보기
│  │     │  ├─ MyCoupons.tsx      # 쿠폰 — 얻는 법 · 교환 준비 중 안내 + CouponHistory
│  │     │  ├─ CouponHistory.tsx  # 쿠폰 적립·사용 내역 — Race Ticket 스타일 줄, 최근 5건 + 전체 보기
│  │     │  ├─ MyRaces.tsx        # 내 레이스 기록 — Race Ticket 줄(경주 STUB ┊ 고른 말 · 돌려받은 쿠폰 ┊ 순위), 최근 5경주 + 전체 보기
│  │     │  ├─ MySeats.tsx        # 좌석 예약 내역(11단계) — 날짜 · 시간대 STUB ┊ 지점 · 좌석 · 인원 ┊ 예약됨 · 대기 중 · 이용 완료 + 취소, 최근 5건 + 전체 보기
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
│     │  ├─ AdminNav.tsx          # 메뉴 관리 · 카테고리 관리 · 경주 관리 · 이벤트 관리
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
│     ├─ categories/              # /admin/categories  카테고리 관리
│     │  ├─ page.tsx
│     │  ├─ _components/
│     │  │  ├─ CategoryList.tsx   # 카테고리 목록(순서 이동·노출 토글·메뉴 수) + 폼·확인창 조립
│     │  │  └─ CategoryForm.tsx   # 추가/이름 수정 폼
│     │  ├─ _hooks/
│     │  │  └─ useCategoryAdmin.ts
│     │  └─ _lib/
│     │     └─ validateCategory.ts
│     ├─ race/                    # /admin/race  경주 관리(16단계, 8.11)
│     │  ├─ page.tsx              # getHorses · getRaceHistory → RaceAdmin
│     │  ├─ _components/
│     │  │  ├─ RaceAdmin.tsx      # 조립(client) — 현황 · 시간표 / 출전마 / 경주 기록 구역 + 바로가기 + 토스트
│     │  │  ├─ RaceStatusPanel.tsx# 카드 4개(다음 경주 · 지금 · 최근 결과 · 오늘) + 오늘 · 내일 경주표
│     │  │  ├─ ScheduleEditor.tsx # 시각 칩(× 빼기) + 시각 추가 → [시간표 저장](바꾼 내용이 있을 때만)
│     │  │  ├─ HorseAdminTable.tsx# 출전마 7마리 표 + 수정 모달
│     │  │  ├─ HorseForm.tsx      # 이름 · 색 · 이미지(7장 중) · 주행 성향(설명 포함) · 성격 · 설명 + 기본값으로 채우기
│     │  │  ├─ RaceHistoryTable.tsx # 지난 경주 1~7위(그 경주 당시 게이트 번호) · 검색 · 10개씩 더 보기
│     │  │  ├─ HorseTag.tsx       # 게이트 번호 점(조끼 색) + 이름
│     │  │  └─ raceAdmin.module.css
│     │  ├─ _hooks/
│     │  │  ├─ useScheduleEditor.ts # 고친 시간표(draft) · 추가 · 빼기 · 검증 · 저장
│     │  │  └─ useHorseAdmin.ts   # 수정 폼 · 검증 · 저장
│     │  └─ _lib/
│     │     ├─ validateSchedule.ts # 시간표 검증(1~6개 · 20분 간격 · 23:50 전 · 경계 간격)
│     │     ├─ validateHorse.ts
│     │     └─ timetable.ts       # 오늘 · 내일 경주표(번호 · 상태 · 결과)
│     └─ event/                   # /admin/event  이벤트 관리(16단계, 8.12)
│        ├─ page.tsx              # EventAdminList
│        ├─ [id]/page.tsx         # /admin/event/[id] — generateStaticParams + Suspense → EventAdminDetail
│        ├─ _components/
│        │  ├─ EventAdminList.tsx # 검색 · 상태 · 손님 화면 필터 + 표(노출 허가 스위치) + 폼 · 삭제 · 기본값 되돌리기
│        │  ├─ EventAdminDetail.tsx # 진행 상태(자동/직접 지정) · 손님 화면 노출 패널 + 정보 표 + 수정 · 삭제
│        │  ├─ EventForm.tsx      # 등록/수정 폼(모달)
│        │  ├─ EventBadges.tsx    # 상태 알약 + 자동/수동 + D-day · 손님 화면 보임/숨김
│        │  └─ eventAdmin.module.css
│        ├─ _hooks/
│        │  └─ useEventEditor.ts  # 폼 · 저장 · 삭제 · 상태 지정 · 노출 허가 + 토스트(목록 · 상세 공용)
│        └─ _lib/
│           └─ validateEvent.ts
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
│  ├─ UserProvider.tsx            # "내 것" Context(쿠폰 · 쿠폰 내역 · 찜 · 주문 내역 · 내 레이스 기록(내가 건 말 · 정산) · 좌석 예약 · 예약대기) + useUser() 훅
│  ├─ CartProvider.tsx            # 장바구니 Context + useCart() 훅 (Header · /menu/[id] · /cart)
│  ├─ RaceProvider.tsx            # 레이스 진행 Context(이 세션에서 확정된 경주 결과 · 결과 모달을 띄운 경주 번호 · 진행 중 시뮬레이션 ref) + useRaceSession() 훅
│  ├─ RaceSettlement.tsx          # 화면 없는 정산기 — 내가 건 경주의 결과를 받아(getRaceResult, 동적 import) 어느 페이지에서든 쿠폰을 돌려준다
│  ├─ QuantityStepper.tsx         # 수량 − / + (/menu/[id] 담기 · /cart 공용)
│  ├─ RaceTimesText.tsx           # (16단계) 지금 공지된 경주 시각 "12:30 · 18:00" — Footer 안의 클라이언트 조각(useRaceTimes)
│  ├─ layout.module.css           # Header · Footer · 사이트 골격 · 안내 상자(404 · SCRATCHED) — ComingSoon 은 10단계에서 마지막 페이지(/seat)를 채우며 지웠다
│  └─ ui.module.css               # Modal · TicketBadge · Scoreboard · HorseAvatar · QuantityStepper
│
├─ lib/                           # 2개 이상 페이지가 쓰는 공용 로직
│  ├─ cart.ts                     # 장바구니 순수 함수(담기 합치기 · 수량 1~20 · 총 수량 · 합계)
│  ├─ time.ts                     # 순수 함수: 다음/진행 중 경주(시간표 — raceSchedule) · SOON/LIVE 단계 · 카운트다운 포맷 · formatRaceDate · changeEffectiveFrom(관리자 변경 적용 시각)
│  ├─ raceSchedule.ts             # (16단계) 경주 시간표 — BASE_RACE_TIMES(NEXT_PUBLIC_RACE_TIMES) + 관리자 변경 버전(localStorage) · raceTimesAt · announcedRaceTimes
│  ├─ localStore.ts               # (16단계) localStorage JSON 외부 저장소(createLocalStore) — 관리자 Mock 의 "서버" 자리, useSyncExternalStore 로 구독
│  ├─ useRaceTimes.ts             # (16단계) 시간표 구독 훅(하이드레이션 동안 기본값)
│  ├─ kst.ts                      # 순수 함수: KST 날짜("YYYY-MM-DD") · 분 · 요일 · formatYmdKo("2026.10.17(토)") · formatKstTime — /seat · /my · /event · 관리자 공용
│  └─ useCountdown.ts             # 공용 1초 시계(useSyncExternalStore) — useNow · useRaceCountdown · useRacePhase · useKstToday
│
├─ types/
│  └─ common.ts                   # CouponReason, CouponLog, Order, RaceEntry, UserState, CartLine, CartItem, CartState 등 공용 타입
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
| `app/(site)/race/_types.ts` | `HorseTrait`, `Horse`, `HorseInput`(관리자 수정 폼), `Gates`, `RaceStage`(`RaceStageKind`), `RaceResult`, `RaceBet`, `RaceEventMessage`, `RunnerState`, `RaceRun` |
| `app/(site)/seat/_types.ts` | `SeatSection`, `SeatType`, `SeatStatus`, `SeatFeature`, `Seat`, `Chair`, `FloorFixture`, `FloorSection`, `FloorPlan`, `Branch`, `TimeBlock`, `BlockState`, `SlotAvailability`, `SeatSlot`, `ChairStatusMap`, `ReservationRequest`, `WaitlistRequest` |
| `app/(site)/menu/_types.ts` | `Category`, `MenuStatus`, `MenuBadge`, `MenuSize`, `SizePrices`, `Menu`, `MenuInput`, `CategoryInput` |
| `app/(site)/event/_types.ts` | `EventStatus`, `EventTimeMode`, `CafeEvent`, `CafeEventInput` |
| `app/(site)/my/_types.ts` | `UserProfile` |
| `types/common.ts` | `CouponReason`, `CouponLog`, `Order`, `RaceEntry`, `SeatReservation`(`SeatReservationKind`), `UserState` (Header·메인·/race·/menu/[id]·/cart·/seat·/my 공용), `CartLine`, `CartItem`, `CartState` (Header·/menu/[id]·/cart 공용) |

```ts
// ===== app/(site)/race/_types.ts =====
// ---- Horse ----
export type HorseTrait = "FAST_START" | "STEADY" | "LATE_SPURT" | "WILDCARD" | "BALANCED";

export interface Horse {
  id: number;              // 1~7 — 말 식별자. 게이트 번호와는 다르다(경주마다 지난 경주 도착 순서로 다시 매긴다 — Gates, 8.2 "게이트 번호 규칙")
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

export type Gates = Readonly<Record<number, number>>;  // 한 경주의 게이트 표: 말 id → 번호(1~7). records.gatesFor 가 만든다 — 화면 표시 전용

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
  startsAt: string;        // ISO — 그 경주의 출발 시각(결과를 받을 때 시드로 쓴다)
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
// 좌석 데이터는 테이블(2~8인) · 바석(1인) 단위, 예약은 테이블을 의자로 쪼갠 "의자 단위"(사용자 결정 2026-10-13).
// 상태는 지점 · 날짜 · 2시간 시간대마다 달라 Seat 에 두지 않고 ChairStatusMap 으로 따로 받는다.
export type SeatSection = "TRACKSIDE" | "GRANDSTAND" | "PADDOCK" | "LOUNGE";
export type SeatType = "TABLE" | "BAR";
export type SeatStatus = "AVAILABLE" | "USING" | "RESERVED" | "REPAIR";
export type SeatFeature = "WINDOW" | "OUTLET" | "QUIET" | "GROUP" | "NEAR_COUNTER" | "BAR";

export interface Seat {            // 테이블 · 바 자리 하나
  id: string;              // "T03" · "B01"
  section: SeatSection;
  type: SeatType;
  capacity: number;        // 의자 수 — 의자 id 는 `${id}-${n}`(1~capacity, 윗줄 왼쪽부터), 바석은 1
  x: number;               // 평면도(900×702) 기준 % (테이블 중심)
  y: number;
  features: SeatFeature[];
}
export interface Chair { id: string; seat: Seat; no: number; x: number; y: number }  // 화면 전용 — geometry.chairsOf 가 만든다(논리 px)

export interface FloorFixture {   // 창문 · 바 · 카운터 · 출입구 · 화장실 · 통로 — % (좌상단 · 폭 · 높이)
  id: string;
  kind: "WINDOW" | "COUNTER" | "ENTRANCE" | "RESTROOM" | "AISLE" | "BAR";
  label: string; labelKo?: string;
  x: number; y: number; w: number; h: number;
}
export interface FloorSection { section: SeatSection; x: number; y: number; w: number; h: number }  // 구역 영역
export interface FloorPlan { sections: FloorSection[]; fixtures: FloorFixture[] }

export interface Branch { id: string; name: string; address: string }         // 지점
export interface TimeBlock { start: string; end: string }                      // "13:00" "15:00"
export type BlockState = "OPEN" | "LIVE" | "CLOSED";                           // 예약 가능 · 지금 진행 중(오늘) · 지남
export interface SlotAvailability extends TimeBlock { state: BlockState; available: number; total: number }
export interface SeatSlot { branchId: string; date: string; start: string; end: string }  // 상태를 묻는 단위(지점 · KST 날짜 · 시간대)
export type ChairStatusMap = Readonly<Record<string, SeatStatus>>;             // 의자 id → 상태(없으면 AVAILABLE)
export interface ReservationRequest { slot: SeatSlot; branchName: string; people: number; chairIds: string[]; chairLabels: string[] }
export type WaitlistRequest = Omit<ReservationRequest, "chairIds" | "chairLabels">;

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
// 16단계(사용자 결정 2026-10-14): 기간(시작일 · 종료일) · 상태(날짜 자동 + 관리자 지정 우선) · 노출 허가 · 상세(참여 방법 · 유의 사항)를 더했다.
export type EventStatus = "ONGOING" | "UPCOMING" | "ENDED";   // 진행 중 · 예정 · 종료
export type EventTimeMode = "NONE" | "TEXT" | "RACE";          // 시각 칸 — 없음 · 직접 입력 · 경주 시간표 따라가기

export interface CafeEvent {
  id: number;
  title: string;           // "DAILY RACE"
  period: string;          // 운영 안내(짧게) — "매일" · "상시" · "첫 방문"
  timeMode: EventTimeMode;
  time: string;            // timeMode "TEXT" 일 때의 문구 — "평일 15:00"
  description: string;     // 카드 한 줄 설명
  steps: string[];         // 상세 — 참여 방법
  notes: string[];         // 상세 — 유의 사항
  startDate: string | null;          // KST "YYYY-MM-DD" — null 이면 이미 시작
  endDate: string | null;            // 그날까지 진행 — null 이면 상시
  statusOverride: EventStatus | null; // 관리자가 직접 지정한 상태 — null 이면 날짜로 자동
  visible: boolean;        // 노출 허가 — 켜면 진행 중이 아니어도 /event 에 보인다(진행 중은 늘 보인다)
  ctaLabel?: string;       // "Race 참여하기"
  ctaHref?: string;        // "/race"
}
export type CafeEventInput = Omit<CafeEvent, "id">;

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

export interface RaceEntry extends RaceBet {  // 내 레이스 기록 한 건 — 걸 때 생기고, 정산 때 순위 · 돌려받은 쿠폰이 채워진다
  gate: number;            // 그 경주의 게이트 번호("3번 MOCHA") — 게이트 번호가 경주마다 바뀌어도 기록은 그대로
  rank: number | null;     // 내 말 순위, 정산 전 null
  payout: number;          // 돌려받은 쿠폰(원금 포함) — 정산 전 · 4위 이하 0
  settledAt: string | null;// ISO — 정산 시각
}

export type SeatReservationKind = "RESERVED" | "WAITING";   // 예약 · 예약대기
export interface SeatReservation {  // 좌석 예약 한 건(11단계) — 지점 · 날짜 · 시간대 · 의자. 결제 · 쿠폰 없음
  id: string;              // "S-0001"
  kind: SeatReservationKind;
  branchId: string; branchName: string;   // 지점 이름도 남긴다(지점 데이터를 다시 안 봐도 되게)
  date: string;            // "2026-10-17"(KST)
  start: string; end: string;             // "13:00" "15:00"
  people: number;
  chairIds: string[];      // "T03-1" — 예약대기는 빈 배열
  chairLabels: string[];   // 표시용 "T03 1번" · "B07"
  reservedAt: string;      // ISO
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
  races: RaceEntry[];                                                // 내가 참여한 경주, 최신순
  joinRace: (bet: RaceBet, gate: number) => boolean;                 // 건 경주 기록, 그 경주에 이미 걸었으면 false
  settleRace: (raceNo: number, rank: number, payout: number) => boolean; // 정산 기록, 이미 정산했으면 false(경주당 한 번)
  seatReservations: SeatReservation[];                               // 좌석 예약 · 예약대기, 최신순
  addSeatReservation: (reservation: SeatReservation) => void;
  cancelSeatReservation: (id: string) => boolean;                    // 목록에서 지운다 — 없으면 false
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
| `lib/raceSchedule.ts` | `BASE_RACE_TIMES` + 관리자 시간표 버전(메인·/race·/event·관리자 공용이라 최상위) |
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

이름·설정 수정은 이 파일만 고치면 되도록 한다. 표의 No 는 말 식별자(`Horse.id`)이고 게이트 번호가 아니다 — 게이트 번호는 경주마다 지난 경주 도착 순서대로 다시 매긴다(8.2 "게이트 번호 규칙"). 대표색은 이미지에서 잰 조끼 색이고, 번호 배지 글자는 흰 글자 대비가 3:1 미만이면(노랑) 짙은 색이다(`textOn`). 이미지를 바꾸려면 `scripts/split-horses.mjs` 의 `PICKS` 를 고치고 다시 실행한다.

### 5.2 seats.ts — 30자리 = 의자 71석 (2026-10-13 의자 단위로 재구성)

| 구역 | 한글 | 자리(의자 수) | 비고 |
|---|---|---|---|
| TRACKSIDE | 창가 좌석 | T01(2) T02(2) T03(4) T04(2) T05(2) T06(4) | WINDOW, 일부 OUTLET · QUIET |
| GRANDSTAND | 일반 좌석 | T07(4) T08(2) T09(2) T10(4) T11(2) T12(2) T13(4) T14(2) | 일부 QUIET / OUTLET / NEAR_COUNTER |
| LOUNGE | 단체 좌석 | T15(6) T16(6) T17(8) | GROUP, 일부 OUTLET |
| PADDOCK BAR | 바 좌석 | B01 ~ B13 (각 1) | BAR, 전부 OUTLET, B12 · B13 NEAR_COUNTER |

- **상태는 데이터에 없다.** 지점 · 날짜 · 시간대마다 `_lib/mockStatus.ts` 가 결정적으로 만든다(시간대별 점유율 × 지점 계수 + 주말 보너스, 지점마다 한 자리 수리 중). 서버가 붙으면 `GET /api/seats/status` 로 바뀐다.
- `x, y` 는 평면도(900×702) 기준 **퍼센트**(테이블 중심). 위치 변경은 이 값만 고친다. 테이블 크기 · 의자 자리는 인원수로 자동(`_lib/geometry.ts`).

### 5.3 floorPlan.ts · branches.ts · schedule.ts

- **평면도**: 구역 4개(TRACKSIDE 위 한 줄 · GRANDSTAND 가운데 두 줄 · LOUNGE 아래 · PADDOCK BAR 오른쪽 세로) + WINDOW(위쪽 벽 전체), BAR(오른쪽 벽 세로 바 테이블), COUNTER · RESTROOM(오른쪽 아래), ENTRANCE(왼쪽 아래 벽 끊김), AISLE(가로 · 세로 점선). 모두 % 좌표. 세 지점이 같은 평면도를 쓴다(사용자 결정).
- **지점**: 마포 본점(트랙길 7 — Footer 주소) · 강남점 · 성수점. 첫 번째가 기본 선택.
- **시간대**: `TIME_BLOCKS` 1시간 블록 13개(09–10 … 21–22, 영업 시간 전부), `BOOKING_DAYS = 14`(오늘 포함), `MAX_PEOPLE = 8`. 카드 범위 필터(전체 · 오전 <12시 · 오후 12~18시 · 저녁 ≥18시)는 `_lib/schedule.ts` 의 `TIME_FILTERS`.

### 5.4 menus.ts

카테고리 4개 × 3~4개. 인기 메뉴에 `badge: "BEST"`, 오늘의 1위 메뉴에 `"WINNER"`.
"오늘의 인기 메뉴"(메인 대시보드)는 `badge === "WINNER"` 인 메뉴로 정한다.
관리자 화면 확인용으로 `SOLD_OUT` 1개, `HIDDEN` 1개를 섞어 둔다.
음료(커피·논커피·티)는 `sizePrices: { S, M, L, XL }` 를 메뉴마다 직접 적고 `price` 는 S 가격과 같게 둔다. 디저트는 `sizePrices: null`(단일 가격).

categories.ts: `{ id: 1, name: "커피", engName: "Coffee", order: 1, visible: true }` … 4개.

### 5.5 raceHistory.ts

Race #8 ~ #12 의 과거 결과(최신이 앞, `ranking` 7개 전체 저장, RECENT RACES UI 는 1~3위만 노출). 출전표의 최근 성적 · 다음 경주 번호(#13)가 모두 이 기록에서 계산된다.

### 5.6 events.ts · 공용 값

- events: `DAILY RACE`(매일 · 시각은 경주 시간표 따라가기 → /race), `ORDER STAMP`(상시, 주문 1회 쿠폰 1장 → /menu), `WELCOME TICKET`(첫 방문 쿠폰 5장 → /my) — 셋 다 날짜 없음(상시 → 진행 중). 관리자 화면의 예정 · 종료 예시로 `AUTUMN DERBY WEEK`(10.24~11.01 → 예정) · `GRAND OPENING CUP`(10.01~10.07 → 종료)를 두되 **노출 허가를 꺼 손님 화면에는 보이지 않는다**. 화면에서 실제로 동작하지 않는 혜택(메뉴 할인 등)은 손님에게 보이는 이벤트에 넣지 않는다.
- 쿠폰 초기값: `UserProvider` 의 `INITIAL_COUPONS = 5`. 주문 적립은 `ORDER_COUPON_REWARD = 1`(`orderService.ts`), 레이스 보상은 `RACE_PAYOUT`(`race/_lib/payout.ts`) — 수량 조율은 이 상수들만 고친다.
- 레이스 시각: 기본 시간표 `BASE_RACE_TIMES = ["12:30", "18:00"]`(`lib/raceSchedule.ts`)에 관리자(/admin/race)가 바꾼 **시간표 버전**(`{ from, times }` — from 뒤에 출발하는 경주부터)이 쌓인다. `lib/time.ts` 는 경주마다 "그 경주 시각에 유효했던 시간표"로 열리는지 판단해 "지금 이후 가장 가까운 시각"을 계산한다(오늘 다 지났으면 내일 첫 경주). 그래서 시간표를 바꿔도 이미 출발한 경주 · 기록 · 경주 번호는 그대로다. 카페가 서울에 있으므로 브라우저 시간대와 상관없이 **KST(UTC+9)** 기준이다. 시각 문구는 `formatRaceTimes(times)` — 화면은 `useRaceTimes()`(하이드레이션 동안 기본값), 정적 문구(히어로 headline)는 `BASE_RACE_TIMES`.
  - 테스트 · 발표 때는 빌드 환경변수 `NEXT_PUBLIC_RACE_TIMES="12:30,18:00,15:20"` 로 기본 시간표를 바꾸거나(형식이 틀리면 12:30 · 18:00), `/admin/race` 에서 바꾼다(같은 브라우저에만 저장 — 16단계). 경주는 이 시각에 **모든 사용자가 동시에** 출발한다(사용자 결정 2026-10-13) — 백엔드가 붙으면 관리자 변경이 서버를 거쳐 모두에게 같아진다.
  - 출발 10초 전(`RACE_GATE_CLOSE_MS`)부터 마감 — 그 뒤 들어온 사람은 관람만 한다.
- 경주 단계: 시작 10분 전(`RACE_SOON_MS`)부터 `SOON`, 시작 후 10분(`RACE_LIVE_MS`)은 `LIVE`, 나머지는 `UPCOMING`. LIVE 동안의 "다음 경주"는 그다음 경주(18:00 LIVE 면 내일 12:30).

---

## 6. 데이터 계층 (각 라우트의 `_lib/*Service.ts`)

```ts
// app/(site)/seat/_lib/seatService.ts — 현재(Mock)
import { SEATS } from "../_data/seats";
import type { ChairStatusMap, Seat, SeatSlot } from "../_types";

export async function getSeats(): Promise<Seat[]> {
  return structuredClone(SEATS);
}
export async function getChairStatuses(slot: SeatSlot, now: number): Promise<ChairStatusMap> {
  return mockChairStatuses(SEATS, slot, blockState(slot.date, block, now));   // 결정적 Mock
}
export async function reserveChairs(req: ReservationRequest): Promise<SeatReservation> {
  return { id: "S-0001", kind: "RESERVED", ...req.slot, ... };   // 실제 요청 없음 — 반영은 호출한 쪽의 UserProvider 가
}

// 추후(API) — 컴포넌트 변경 없이 이 파일만 교체
// export async function getChairStatuses(slot: SeatSlot) {
//   const res = await fetch(`${API_BASE}/api/seats/status?branch=${slot.branchId}&date=${slot.date}&start=${slot.start}`);
//   return res.json() as Promise<ChairStatusMap>;
// }
```

- 모든 service 함수는 **`async` + `Promise` 반환**으로 통일한다. Mock 일 때도 비동기로 두어야 API 교체 시 호출부가 바뀌지 않는다.
- 쓰기 동작(예약, 쿠폰 걸기, 주문)도 service 함수로 둔다. 지금은 결과만 돌려주고, 상태 반영은 호출한 쪽의 React State 가 한다(쿠폰 증감은 `useUser()` 의 `spendCoupon` · `earnCoupons`, 주문 내역은 `addOrder`, 찜은 `toggleFavorite`).

| 파일 | 함수 | 추후 API (예상) |
|---|---|---|
| `app/(site)/race/_lib/raceService.ts` | `getHorses()`, `getRaceHistory()`, `placeBet(raceNo, startsAt, horseId)` → `RaceBet`, `getRaceResult(raceNo)` → `RaceResult \| null`(확정 전 null — Mock 은 시간표에서 "N번째 경주"의 출발 시각을 찾아 출발 + `RACE_SETTLE_MS` 뒤 결정적 시뮬레이션. 16단계에서 startsAt 인자를 뺐다 — 걸어 둔 경주의 시각이 바뀌어도 같은 번호의 결과를 받는다) | GET /api/horses, GET /api/races/history, POST /api/races/{raceNo}/bets, GET /api/races/{raceNo}/result |
| 〃 (관리자, 16단계) | `updateHorse(id, input)` → `{ horse, from }`, `getRaceTimes()`, `updateRaceTimes(times)` → 시간표 버전 — 둘 다 `changeEffectiveFrom(now)` 부터 적용 | PUT /api/admin/horses/{id}, GET /api/races/schedule, PUT /api/admin/races/schedule |
| `app/(site)/seat/_lib/seatService.ts` | `getBranches()`, `getSeats()`, `getFloorPlan()`, `getTimeBlocks()`, `getChairStatuses(slot, now)` → `ChairStatusMap`, `getSlotAvailability(branchId, date, now)` → 시간대별 잔여석, `reserveChairs(req)` → `SeatReservation`, `joinWaitlist(req)` → `SeatReservation`(WAITING), `cancelReservation(id)`, `getSeatSummary(now)`(메인 대시보드 — 본점 · 지금 시간대), (13단계) `updateSeatStatus(slot, chairId, status)` | GET /api/branches, GET /api/seats, GET /api/seats/floor-plan, GET /api/seats/status?branch&date&start, GET /api/seats/availability?branch&date, POST /api/seats/reservations, POST /api/seats/waitlist, DELETE /api/seats/reservations/{id}, PATCH /api/admin/seats/{id} |
| `app/(site)/menu/_lib/menuService.ts` | `getMenus(categoryId?)`, `getTodayWinnerMenu()`, `getCategories()`, `getMenuImageOptions()` | GET /api/menus, GET /api/categories, (이미지 업로드 API 생기면 교체) |
| 〃 (관리자) | `createMenu(input)`, `updateMenu(id, input)`, `deleteMenu(id)`, `updateMenuStatus(id, status)` | POST /api/admin/menus, PUT·DELETE /api/admin/menus/{id}, PATCH /api/admin/menus/{id}/status |
| 〃 (관리자) | `createCategory(input, order)`, `updateCategory(id, input, order)`, `deleteCategory(id)`, `reorderCategories(ids)` | POST /api/admin/categories, PUT·DELETE /api/admin/categories/{id}, PUT /api/admin/categories/order |
| `app/(site)/cart/_lib/orderService.ts` | `placeOrder(lines)` → `Order` | POST /api/orders (주문 내역 저장 · 쿠폰 적립은 서버가 처리) |
| `app/(site)/event/_lib/eventService.ts` | `getEvents()`, `getEvent(id)` | GET /api/events, GET /api/events/{id} |
| 〃 (관리자, 16단계) | `createEvent(input)`, `updateEvent(id, input)`, `deleteEvent(id)`, `updateEventVisibility(id, visible)`, `updateEventStatus(id, statusOverride)`, `resetEvents()`(Mock 전용) | POST /api/admin/events, PUT·DELETE /api/admin/events/{id}, PATCH /api/admin/events/{id}/visibility · /status |
| `app/(site)/my/_lib/myService.ts` | `getProfile()` | GET /api/my/profile |
| `lib/time.ts` | `getRaceSchedule(now)` · `getNextRaceTime(now)` · `getLiveRaceTime(now)` · `getRaceStartsBetween(after, until)` · `changeEffectiveFrom(now)` (순수 함수, 입력은 `lib/raceSchedule.ts` 의 시간표 버전) | GET /api/races/schedule (시간표 버전 목록을 저장소 대신 넣는다) |

- 메인(`/`)의 `_data/` 에는 히어로 슬라이드 문구(`heroSlides.ts`)만 둔다. 좌석 수·인기 메뉴 같은 대시보드 값은 위 Service 들을 import 해서 모은다.
- 관리자 페이지(`/admin/*`)도 자기 `_data/` 가 없다. 메뉴·카테고리는 `app/(site)/menu/_lib/menuService.ts` 하나로만 읽고 쓴다.
- **Mock 단계의 한계**: 메뉴 · 카테고리 관리자 쓰기 함수는 성공만 돌려주고, 변경은 관리자 화면의 React State 에만 반영된다. 새로고침하면 초기화되고 `/menu` 에는 반영되지 않는다. API 를 연결하면 두 화면이 같은 데이터를 보게 된다.
- **경주 · 이벤트 관리(16단계, 사용자 결정 2026-10-14)는 다르다** — 같은 브라우저의 손님 화면에도 보이도록 localStorage 저장소(`lib/localStore.ts` 의 `createLocalStore`)에 쓴다: 시간표(`lib/raceSchedule.ts`), 출전마(`race/_lib/horseStore.ts`), 이벤트(`event/_lib/eventStore.ts`). Service 가 읽고 쓰고, 클라이언트 화면은 훅(`useRaceTimes` · `useRaceHorses` · `useEvents`)으로 구독한다 — `useSyncExternalStore` 라 하이드레이션 동안은 기본값(정적 셸과 같음), 직후 저장값으로 바뀌고 다른 탭도 storage 이벤트로 따라간다. 다른 브라우저 · 다른 사용자에게는 보이지 않는다(서버가 붙어야 모두 같아진다). 백엔드가 붙으면 저장소 세 개를 지우고 훅이 Service 를 불러오게 바꾼다.
- 내 쿠폰 수와 증감 내역(`GET /api/my/coupons`, `GET /api/my/coupons/history`), 찜(`GET /api/my/favorites`, 토글은 `PUT·DELETE /api/my/favorites/{menuId}`), 주문 내역(`GET /api/my/orders`), 내 레이스 기록(`GET /api/my/races`)은 `UserProvider` 가 초기화할 때 불러오는 구조로 확장한다.

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
  races: RaceEntry[];                    // 내 레이스 기록(내가 건 말 + 정산 결과), 최신순
  joinRace: (bet, gate) => boolean;      // 건 경주 기록, 경주당 한 번
  settleRace: (raceNo, rank, payout) => boolean; // 정산 기록, 경주당 한 번(이미 했으면 false)
  seatReservations: SeatReservation[];   // 좌석 예약 · 예약대기, 최신순(11단계)
  addSeatReservation: (reservation) => void;
  cancelSeatReservation: (id) => boolean;
}
```

- "내 것"(쿠폰 · 찜 · 주문 내역 · 내 레이스 기록 · 좌석 예약)을 한 Context 에 둔다. 모두 마이페이지에 모이고, 로그인이 붙으면 같은 사용자 단위로 서버에서 불러오기 때문이다.
- Header(쿠폰 수), 메인 대시보드, `/race`(걸기 · 내가 건 말), `RaceSettlement`(정산), `/menu/[id]`(찜), `/cart`(주문 적립 · 내역 기록), `/seat`(예약 · 같은 시간대의 내 예약을 배치도에 겹치기), `/my` 가 같은 값을 본다.
- 좌석 예약이 루트에 있는 이유도 레이스와 같다 — `/seat` 는 배치도에 내 예약을 겹쳐 그리고 `/my` 는 목록 · 취소를 맡는데, 둘이 같은 값을 봐야 취소한 자리가 돌아왔을 때 풀려 있다.
- 쿠폰 수가 바뀌는 곳은 `spendCoupon` · `earnCoupons` 두 함수뿐이고, 둘 다 `couponHistory` 맨 앞에 내역을 한 줄 남긴다.
- 새로고침 시 초기화되어도 무방(프로토타입). 원하면 `localStorage` 동기화를 옵션으로.

#### 쿠폰 규칙 (2026-10-13 결정)

> 지시서·이전 설계의 "레이스 참가권 + 1위 보상 무료 아메리카노 쿠폰" 두 종류 구조를 버리고, README 컨셉에 맞춰 **쿠폰 한 종류**로 합쳤다.

- **쿠폰 = 레이스 참가권 = 적립 단위.** 특정 메뉴 쿠폰이 아니다. 몇 장을 모으면 메뉴로 바꾸는 방식이다(교환 규칙·화면은 추후 — 10절).
- **얻는 방법**
  - 처음 5장(`INITIAL_COUPONS`)
  - 주문 1회당 1장 — `/cart` 의 목업 "주문하기"(8.9). 담은 수량과 무관하게 주문 한 번에 1장
  - 레이스 1~3위 (아래 표)
- **레이스에 거는 방법**: 한 경주에 **1장 고정**, 보유량 상한 없음. 거는 순간 바로 1장 차감(`spendCoupon("RACE_BET", …)`), 경주가 끝나면 **어느 페이지에 있든** 돌려준다(`earnCoupons(n, "RACE_PAYOUT", "Race #13 · 1위 (원금 1 + 추가 3)")` — 아래 "정산").

  | 내 말 순위 | 결과 때 돌려받음 | 순증감 |
  |---|---|---|
  | 1위 | 원금 1 + 추가 3 = **4장** | +3 |
  | 2위 | 원금 1 + 추가 2 = **3장** | +2 |
  | 3위 | 원금 1 + 추가 1 = **2장** | +1 |
  | 4~7위 | 0장 (원금만 잃음) | −1 |

- 수량은 **우선값**이다. 게임을 구현해 본 뒤 조율하므로 `race/_lib/payout.ts` 의 `RACE_PAYOUT = { 1: 4, 2: 3, 3: 2 }`(원금 포함) 한 곳에서만 바꾼다. 참고로 지금 값은 무작위로 골라도 경주당 평균 +2/7 ≈ +0.29장이라 반복할수록 쌓인다.
- 참여는 **경주당 1회**다 — 경주가 정해진 시각(`RACE_TIMES`)에만 열리므로(8단계 시간 기반 재구성) 하루 참여 수는 경주 수만큼으로 저절로 제한된다. 지시서의 "다시 하기(바로 다음 경주)"는 없어졌고, 결과 모달의 [다음 경주 출전표 보기]가 그 자리를 맡는다. 더 강한 제한(하루 1회 등)은 위 조율 때 함께 정한다.
- 시간대별 좌석 상태(서버 몫)는 `/seat` 페이지 State 로 충분하다(다른 페이지는 요약 숫자만 service 에서 읽는다). 내 예약만 루트(`seatReservations`)에 있다.

**레이스 진행 — `components/RaceProvider.tsx`(7단계, 사용자 결정 · 8단계에서 시간 기반으로 재구성 · 9단계에서 내가 건 말을 UserProvider 로)**: `CartProvider` 안쪽을 감싸고 `useRaceSession()` 으로 꺼낸다. 값은 `results`(이 세션에서 확정된 경주 — 끝까지 본 경주 + 내가 건 경주의 결과, 최신순) · `resultSeenUpTo`(결과 모달을 띄운 마지막 경주 번호) · `runRef`(진행 중 시뮬레이션 `RaceRun`, ref) · `recordResult(result)`(같은 번호가 없으면 맨 앞에 추가 — ref 로 확인해 두 번 불려도 한 번만) · `markResultSeen(raceNo)`.
- **단계는 Provider 에 없다.** WAIT · RUNNING · FINISHED 는 경주 시각(`lib/time`)과 1초 시계로 `useRace` 가 매초 계산한다(8.2 상태 머신). 그래서 모든 사용자가 같은 시각에 같은 단계가 된다.
- **내가 건 말은 Provider 에 없다(9단계).** 7~8단계의 `bets` · `placeBet` 은 "내 것"이라 `UserProvider.races`(`joinRace`)로 옮겼다 — `/my` 내 레이스 기록 · 정산이 같은 값을 보고, 백엔드에서는 `GET /api/my/races` 하나로 불러온다. 둘 다 루트라 "어느 페이지를 다녀와도 남는다"는 7단계 결정은 그대로다.
- 왜 루트인가: `/race` 는 Activity 로 최근 3개 경로까지만 State 가 남는다. 페이지 State 에 두면 쿠폰을 건 뒤 다른 페이지를 3곳 이상 다녀왔을 때 **쿠폰만 빠지고 내 선택이 사라진다**. 루트에 두면 어느 페이지를 다녀와도 남는다(새로고침하면 초기화 — 쿠폰과 같은 수준).
- 쿠폰 차감 · 서비스 호출은 `race/_hooks/useRace.ts` 가, 정산은 `RaceSettlement` 가 하고, Provider 는 값 보관만 맡는다.

**정산 — `components/RaceSettlement.tsx`(9단계, 사용자 결정 2026-10-13: 어느 페이지에 있든 경주가 끝나면 정산)**: 화면 없는 컴포넌트로, `app/layout.tsx` 에서 `RaceProvider` 안쪽에 둔다. 서버가 할 일을 루트에서 대신한다.
1. **결과 받기**: 정산 전인 내 경주가 출발하면 결과가 확정될 때까지 1초마다 `raceService.getRaceResult(raceNo)` 를 묻고(확정 전 null — 출발 + `RACE_SETTLE_MS` 19.5초. 16단계부터 경주 번호로만 묻는다 — 관리자가 시간표를 바꿔도 같은 번호의 실제 경주 결과) 받으면 `recordResult`. `/race` 에서 끝까지 본 경주는 `useRaceRun` 이 더 일찍(도착 + 1.5초) 기록한다. 두 경로 모두 같은 결정적 시뮬레이션이라 순위가 같다. `raceService`(시뮬레이션 포함)는 **동적 import** 라 다른 페이지의 첫 번들에는 들어가지 않는다.
2. **정산**: `results` 에 결과가 있는 내 경주가 정산 전이면 순위 → `payoutFor(rank)` → `settleRace(raceNo, rank, payout)` 가 **true 일 때만** `earnCoupons(payout, "RACE_PAYOUT", payoutLabel(…))`(4위 이하는 0장이라 적립 없음 — 차감은 이미 내역에 있다). `settleRace` 가 ref 로 경주당 한 번만 통과시키므로 결과가 두 경로로 들어와도 · 다른 페이지를 오가도 두 번 지급되지 않는다.
3. **알림**: 결과 모달은 `/race` 가 띄운다 — 정산된 내 경주 중 `resultSeenUpTo` 보다 뒤인 가장 최근 것. 경기를 보고 있었으면 끝나자마자, 다른 페이지에 있었으면 `/race` 로 돌아왔을 때 한 번. 닫으면 `markResultSeen`.
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
- 쿠폰은 7절 "쿠폰 규칙"을 따른다. 차감은 걸 때(마감 전까지, 경주당 한 번), 정산은 결과가 확정되면 **어느 페이지에서든 경주당 한 번만**(9단계 — 7절 "정산", `settleRace` 가 `raceNo` 로 확인). 건 뒤에는 취소가 없다(건 쿠폰은 결과로만 돌아온다).
- 3 · 2 · 1 카운트다운은 출발 3초 전(RACE_COUNTDOWN_MS)부터, 7마리가 모두 들어오고 1.5초(FINISH_HOLD_MS) 뒤에 결과를 기록한다(FINISHED).
- 실제 12:30 · 18:00 을 기다리지 않고 보려면 `NEXT_PUBLIC_RACE_TIMES` 로 시각을 바꿔 빌드한다(5.6). 개발 중 시뮬레이션 · 화면만 보려면 `/race/lab`.

#### 화면 구성 (위→아래)

1. **헤더 전광판(`RaceCountdown`, 6단계에 만듦)**: `NEXT RACE 오늘 18:00 [SOON]` ┊ `RACE STARTS IN [01]:[24]:[32]` ┊ `MY COUPONS [05]장` 세 칸(모바일은 위아래). LIVE 면 `NOW RACING 18:00 [● LIVE]` ┊ `다음 경주 내일 12:30` ┊ 내 쿠폰 — 카운트다운은 쉰다. 실제 경주는 시각과 상관없이 출전표에서 시작하므로 이 전광판은 실제 일정만 알려 준다.
2. **출전표 (BETTING, `RaceBoard` · `HorseCard`)**: 머리 `TODAY'S RUNNERS / 출전표 Race #13` + 오른쪽 보상 안내 `쿠폰 1장으로 참여 [1위 4장] [2위 3장] [3위 2장] 돌려받기 (원금 포함)`(`PayoutGuide`, 숫자는 `RACE_PAYOUT`). 그 아래 카드 7장 그리드(PC 4열 / 태블릿 2열 / 모바일 1열), 게이트 번호 순
   - **게이트 번호 규칙(팀 협의 2026-10-13 · 구현됨)**: 1번~7번 게이트 번호는 **지난 경주에서 들어온 순서대로** 매긴다 — 지난 경주 1위가 1번, 2위가 2번 … 7위가 7번. 경주가 끝나면 카드가 새 번호 순으로 다시 놓인다. 아래 "게이트 번호 규칙" 참고.
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
3. **BetConfirmModal**: `RACE #13 · MY PICK` · 말 이미지 · `(3) 3번 MOCHA` · "MOCHA에 쿠폰 1장을 사용하시겠습니까?" + 보상 안내 + "4위 이하면 쿠폰은 돌아오지 않아요 · 보유 5장 → 4장" [취소] [사용하기](모바일 Bottom Sheet). [사용하기] → `placeBet(raceNo, startsAt, horseId)` → `spendCoupon("RACE_BET", "Race #13 · 3번 MOCHA 참가")` → `joinRace(bet, gate)`(내 레이스 기록 — 9단계) 로 READY. 처리 중에는 버튼 · 배경 닫기를 막고, ref 로 같은 틱의 두 번째 클릭도 막는다(쿠폰 1장만). 취소하면 아무것도 바뀌지 않는다. 다른 페이지로 가면(Activity) 열려 있던 확인창은 닫는다.
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
4-1. **RaceResult — 경주 결과(트랙 무대와 출전표 사이, 사용자 요청 2026-10-13)**: 가장 최근에 끝난 경주의 1~7위. 머리 `RACE RESULT / Race #14 순위 · 10/13 18:00 출발` + 오른쪽 "내 말 1번 THUNDER · 5위 [NEXT TIME!]"(1~3위면 금색 [WIN!] [PLACE!] [SHOW!], 안 걸었으면 "이번 경주에는 참여하지 않았어요."). 칸 7개(PC 7열 · 태블릿 4열 · 모바일 1열 가로 줄): 순위 · 게이트 번호 배지(그 경주 당시 번호) · 이름 · 한글 이름 · 1~3위 라벨, 1위 칸은 금색 테두리, 내 말 칸은 짙은 테두리 + MY PICK. 경주 중(RUNNING)에는 숨긴다. 내 말 줄 아래 **정산 줄**(9단계): "쿠폰 4장을 돌려받았어요 (원금 1 + 추가 3)" / "건 쿠폰 1장은 돌아오지 않았어요" / 결과가 보충으로 먼저 보이고 정산이 아직이면(최대 1초) "쿠폰 정산 중…".
5. **RaceResultModal — 정산 알림 (9단계, 사용자 결정 2026-10-13)**: 순위 전체는 4-1 결과 섹션이 맡으므로 모달은 **정산 알림**이다. **쿠폰을 건 경주에서만** 뜬다(관람자는 결과 섹션만). 경기를 보고 있었으면 끝나자마자(도착 + 1.5초), 다른 페이지에 있었으면 `/race` 로 돌아왔을 때 **한 번**(`RaceProvider.resultSeenUpTo`). 쿠폰 걸기 확인창이 열려 있으면 닫힌 뒤에 뜬다(모달 두 개가 겹치지 않게).
   ```
   RACE #14 · RESULT
   [말 이미지]  YOUR HORSE  (5) 5번 CARAMEL
   [ 1위 · WIN! ]                          ← 1~3위는 금색 알약, 4위 이하는 회색 "7위 · NEXT TIME!"
   쿠폰 4장을 돌려받았어요                  ← 4위 이하: "건 쿠폰 1장은 돌아오지 않아요"
   원금 1 + 추가 3 · 보유 8장               ← 4위 이하: "다음 경주에서 다시 응원해 주세요 · 보유 4장"
   - - - - - - - - - - - - - - - - - - -
   1위 (5) CARAMEL   2위 (2) LATTE   3위 (6) VANILLA   ← 내 말은 테두리
   [다음 경주 출전표 보기] [내 쿠폰 보기 → /my#coupons]
   ```
   - 1~3위면 가벼운 confetti(CSS — 말 조끼 색 + 금색 28조각이 패널 안에서 한 번 떨어진다, 값은 인덱스로 정해 렌더마다 같다, `prefers-reduced-motion` 이면 없음). 정산 자체(쿠폰 적립)는 모달이 아니라 `RaceSettlement` 가 이미 해 두었다.
   - WIN · PLACE · SHOW 는 경마 용어(1·2·3착). 숫자 순위를 항상 같이 보여 준다.
   - [다음 경주 출전표 보기]는 지시서의 [다시 하기] 자리다 — 경주는 시각이 정하므로 다시 시작하지 않고, 모달을 닫고 출전표 제목(이미 다음 경주 번호)으로 포커스를 옮긴다. ×(닫기) · ESC · 배경 클릭 · [내 쿠폰 보기]도 모두 "본 것"으로 표시한다. 모바일은 Bottom Sheet.
   - 결과는 `RaceProvider.results` 맨 앞에 들어가고(끝까지 봤으면 `useRaceRun`, 아니면 `RaceSettlement`), 다음 경주 번호 · 출전표 최근 성적 · RECENT RACES 가 함께 바뀐다.
6. **RaceHistory — RECENT RACES (9단계)**: 출전표 아래 `RECENT RACES / 지난 경주 기록`. 최근 5경기 카드(PC 5열 · 태블릿 3열 · 모바일 2열): `Race #14  10/13 18:00` + 1~3위(순위 · 게이트 번호 배지 · 이름 — 번호는 카드마다 그 경주 당시 번호). 내가 건 경주는 짙은 테두리 + `MY PICK 5번 CARAMEL · 1위`. 기록은 `useRace` 의 history(이 세션에서 확정된 경주 + 지나간 경주 보충 + Mock)라 경주가 끝나면 맨 앞에 바로 붙는다. 맨 앞 경주는 위 결과 섹션과 같은 경주다.

#### 게이트 번호 규칙 (팀 협의 2026-10-13 · 구현 2026-10-13)

**1번~7번 게이트 번호는 지난 경주에서 들어온 순서대로 매긴다.** 지난 경주 1위로 들어온 말이 이번 경주 1번, 2위가 2번 … 7위가 7번이다.

- 예: Race #12 도착 순서 `[7, 2, 1, 3, 5, 4, 6]`(말 id) → Race #13 게이트 `1번 COOKIE · 2번 LATTE · 3번 THUNDER · 4번 MOCHA · 5번 CARAMEL · 6번 ESPRESSO · 7번 VANILLA`.
- 경주가 끝날 때마다 다음 경주의 번호가 그 결과로 다시 매겨진다. 그래서 같은 말이라도 경주마다 번호가 바뀐다.
- **말 id 와 게이트 번호를 나눈다.** `Horse.id` 는 말 식별자로만 쓰고, 기록(`RaceResult.ranking`) · 내가 건 말(`RaceBet.horseId`)은 말 id 를 그대로 저장한다(번호가 바뀌어도 같은 말을 가리키게). 게이트 번호는 경주마다 계산한다.
- **계산 — `records.ts` 의 `gatesFor(raceNo, history, horses)` → `Gates`(말 id → 번호)**: 지난 경주(`raceNo − 1`) `ranking` 의 위치 + 1. 지난 경주에 없던 말은 그 뒤에 id 순. 한 경주의 번호는 지난 경주 결과로만 정해지므로 그 경주가 끝난 뒤에도 같다. `byGate(horses, gates)` 는 게이트 순으로 정렬한 새 배열.
- **어느 경주의 번호를 그리나** — 화면 · 문구는 **그 경주의** 게이트 번호를 쓴다(사용자 결정 2026-10-13: 결과 · 기록도 그 경주 당시 번호). `useRace` 가 세 가지를 준다.
  - `gates` — 출전표(다음 경주): 카드 순서 · 번호 원 · 확인창 "1번 COOKIE" · 쿠폰 내역 "Race #13 · 1번 COOKIE 참가" · 내 레이스 기록(`RaceEntry.gate` — 걸 때 저장).
  - `stageGates` — 트랙 무대의 경주(FINISHED 면 방금 끝난 경주): 머리띠 "1번 COOKIE 응원 중" · 캔버스 배지 · 원근 줄 · HUD.
  - `gatesOf(raceNo)` — 결과 섹션 · RECENT RACES(카드마다) · 결과 모달 1~3위 줄.
  - 그래서 **경주가 끝난 직후 한 화면에 두 경주의 번호가 함께 보인다** — 결과 섹션(Race #13)의 "1번 COOKIE" 가 바로 아래 출전표(Race #14)에서는 "3번 COOKIE". 경마장 결과표와 같은 방식이다.
- **시뮬레이션에 넘기는 말 순서는 바꾸지 않는다(말 id 순).** `createRace` 는 받은 배열 순서대로 난수를 써 말마다 속도를 정하므로, 게이트 순 배열을 넘기면 트랙(`useRaceRun`) · 루트 정산(`getRaceResult`, `HORSES` 고정 순서) · 지나간 경주 보충의 순위가 서로 달라진다(순수 함수 테스트에서 실제로 달라짐을 확인). 정렬은 카드 · 트랙 줄 · 배지 같은 **화면에서만** 한다.
- **캔버스**: `SceneHorse.gate` 가 배지 숫자, `SceneHorse` 배열 순서가 원근 줄(1번이 맨 뒤 줄). 경주가 끝나는 순간 게이트 표는 내용이 같아도 새 객체가 되므로, `HorseTrack` 은 번호 내용을 문자열로 비교해 장면을 다시 만들지 않는다(결승 직후 캔버스가 지워졌다 다시 그려지지 않게 — E2E 에서 같은 캔버스 확인). 새 경주로 넘어가 줄 순서가 바뀔 때만 다시 만든다.
- 말 이미지 조끼에 적힌 숫자는 게이트 번호와 상관없다(5.1 — 이름에 맞는 이미지를 골랐다).
- **`/race/lab`(실험실)도 같은 규칙을 실험실 안에서 재현한다(사용자 결정 2026-10-13)**: 실제 경주 기록 대신 **직전 실험 경주**(7마리가 모두 들어온 경주 — 끝까지 재생했거나 결과까지 건너뛴 경주)의 도착 순서가 다음 실험 경주의 게이트 번호가 되고, 직전 실험 경주가 없으면 그 시드로 섞은 순서다(`records.gatesAfter` — `gatesFor` 와 같은 계산). 번호는 경주를 시작할 때("경주 시작" · "처음부터 다시" · 시작 전 타임라인 이동) 정해 그 경주 동안 고정된다 — 되감아도 같다. 트랙 줄 · 배지 · 말별 상태 표 · 도착 순서 · 내 말 선택 목록이 이 번호를 쓰고, 조작 패널의 "다음 경주 게이트" 줄에 다음 번호와 근거가 보이며 [번호 초기화]로 시드 섞기로 되돌린다. 시뮬레이션에는 늘 말 id 순으로 넘기므로 "같은 시드 = 같은 경주"는 그대로다 — 그래서 같은 시드로 두 번 돌리면 두 번째 경주의 도착 순서가 1 → 2 → … → 7 로 읽힌다(E2E 확인).
- **기록이 없는 경주(지난 경주가 없을 때)**: **경주 번호로 시드한 무작위 순서**(`simulation.ts` 의 `seededShuffle(ids, seedFor(raceNo, 0))`, 사용자 결정 2026-10-13). 팀 협의의 "무작위로 한 번만 정하고 바뀌면 안 된다"를 지키면서 — 모두에게 같고(서버가 정해 내려주는 것과 같은 효과) 렌더 · 페이지 이동에도 바뀌지 않으며, 렌더 중 `Math.random` 이 없어 정적 셸과 하이드레이션이 맞고 따로 저장할 필요도 없다. 처음 설계의 "브라우저에서 한 번 섞어 `RaceProvider` 에 저장"은 쓰지 않는다. 지금은 Mock 기록(#8~#12)과 지나간 경주 보충이 있어 RECENT RACES 에 #8 이 보일 때(#7 기록이 없다) 정도만 해당한다. 백엔드가 붙으면 서버가 경주를 만들 때 정해 내려준다.
- **출전표 카드 순서**: 게이트 번호 순(1번부터, 팀 협의 2026-10-13). 번호가 지난 경주 도착 순서이므로 결과적으로 지난 경주 순위순이다.

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

> **2026-10-13 재설계**(10 · 11단계 구현 때 사용자 결정).
> 원래 설계("지금 상태"만 보는 평면도 + 필터 · 추천)에서 **날짜 · 지점 · 2시간 시간대를 고른 뒤 의자 단위로 예약하는 흐름**으로 바뀌었다. 평면도(창문 · 카운터 · 출입구 · 화장실 · 통로 · 구역명 · 30자리 · x,y 좌표 · 상태 4종 · 범례 · 요약)는 지시서 12~22절 그대로 그 안에 들어 있다.

목표: "12자리 남았구나"가 아니라 **"내일 13시엔 창가 T03 3번이 비어 있네"** 를 보고 그 자리를 바로 잡게 한다.

#### 사용자 결정 (2026-10-13)

| 항목 | 결정 |
|---|---|
| 시간대 | **1시간 블록 13개** 09–10 … 21–22(`_data/schedule.ts`, 처음 고른 2시간 6개를 같은 날 1시간으로 바꿈). 카드가 많아 **전체 · 오전 · 오후 · 저녁** 범위 필터를 위에 둔다. 오늘부터 14일. 지나간 시간대는 CLOSED(마감), 오늘 진행 중이면 LIVE(예약 가능 · "사용 중" 의자가 보인다). **오늘 시간대가 다 지났으면 기본 날짜는 내일**(마감 카드만 보이는 화면 금지) |
| 지점 | Mock 3곳 — 마포 본점 · 강남점 · 성수점. 평면도는 공유하고 좌석 상태만 지점별로 다르다 |
| 좌석 단위 | **의자 단위** — 테이블을 의자로 쪼개 인원 수만큼 고른다. 의자 id `T03-1`(표시 "T03 1번"), 바석은 의자 하나라 "B07". 30자리 = 의자 71석 |
| 점유 표시 | 색 + SVG 아이콘(✓ 선택 · 사람 사용 중 · 자물쇠 예약 · 공구 수리 중) + 텍스트(aria-label · title). 이미지 에셋 없음 |
| 결제 | 없음(무료 예약). 예약대기도 무료 |

#### 레이아웃 (PC)

```
┌ BookingBar ──────────────────────────────────────────────────────────────────────────────┐
│ [📍 마포 본점] [2026.10.17(토)] [13:00~15:00] [2명] [일정변경]   AVAILABLE SEATS [5][3]/[7][1]  │
│                                                       빈 테이블 2인석 6 · 4인석 4 · … · 바 7 · 마지막 업데이트 17:32 │
└────────────────────────────────────────────────────────────────────────────────────────────┘
┌──────────── SeatCanvas (어두운 면 --brand-900) ────────────┐ ┌──── 패널 360px ─────────────┐
│ FLOOR PLAN  좌석 배치도 · 마포 본점            [🔔 예약대기] │ │ STEP 1 · SCHEDULE  일정 선택   │
│ ┌미니맵┐ ═══════════════ WINDOW 창가 ═══════════════        │ │ 날짜   ‹ 2026.10 ›            │
│ └─────┘  (TRACKSIDE · 창가 좌석)       (PADDOCK BAR · 바 좌석)│ │   일 월 화 수 목 금 토          │
│   [1]  [1][2]  [1]   …     ┃ B01 B02 … B13 ║BAR║           │ │   … 13(오늘) ●14 15 …          │
│   T01   T03    T04   …     ┃                               │ │ 지점 [📍마포 본점][강남점][성수점]│
│   [🔒] [3][4]  [2]   …     ┃                               │ │ 인원 [1][2][3][4][5][6][7][8] ↻ │
│  (GRANDSTAND · 일반 좌석)  T07 … T10 / T11 … T14            │ │ 시간대 [09:00~11:00 53/71석]    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ 통로 ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─               │ │        [11:00~13:00 43/71석] … │
│  (LOUNGE · 단체 좌석) T15 T16 T17  [COUNTER 주문] [RESTROOM] │ │ ─────────────────────────────│
│  ENTRANCE →                                    [+][−][⤢]   │ │ 2명 · 배치도에서 자리를 고를 차례예요 │
│ 범례 [1] 이용 가능(53) [✓] 선택 [🔒] 내 예약 [●] 사용 중(0) [🔒] 예약(17) [🔧] 수리 중(1) │ │ [     좌석 선택하기     ]       │
└─────────────────────────────────────────────────────────────┘ └──────────────────────────────┘
```

- **패널은 단계에 따라 바뀐다**(`useSeatBooking.step`):
  1. **일정 선택**(`SchedulePanel`) — 달력(월 이동 · 일요일 빨강 · "오늘" · 범위 밖 흐림 · 고른 날 짙은 원) → 지점 칩(고른 지점 검정 + 핀, 주소) → 인원 1~8(↻ 초기화) → 시간대 범위 필터(전체 · 오전 · 오후 · 저녁) + 1시간 카드 13개(`09:00~10:00` · `잔여 53/71석` · 진행 중 · 매진 · 마감) → [좌석 선택하기]. 매진 시간대면 [예약대기 신청하기]. **이미 고른 날짜 · 지점 · 시간대를 다시 눌러도 풀리지 않는다**(풀리면 골라 둔 의자까지 사라져 버그처럼 보인다 — 2026-10-13 수정).
  2. **선택 좌석**(`SelectionPanel`) — ‹ 일정 선택 · "선택 좌석 n/N" · 전체삭제 · 의자 카드(✓ 견본 · `T03 3번` · `창가 좌석 · 4인 테이블 · 창가 · 콘센트` · ×) · 안내("1석 더 골라 주세요" / 인원 초과 · 찬 자리 안내) · 일정 요약 · [예약하기](N석 다 골라야 켜짐).
  3. **완료**(`ReservationDone`) — RESERVED 스탬프(기울어진 이중 테두리) "예약되었습니다." · 예약 번호 · 지점 · 일시 · 좌석 · 인원 · [마이페이지에서 보기 → /my#seats] [다른 좌석 예약하기].
- **BookingBar** — 고른 지점 · 날짜 · 시간대 · 인원 칩(안 고른 건 점선), 일정 선택 밖에서는 [일정변경] | `SeatSummary`(AVAILABLE SEATS 전광판 `Scoreboard` · 빈 테이블 인원별 수 · 바 · 마지막 업데이트). 시간대 전엔 `--/71` + "시간대를 고르면 좌석 현황이 보여요".
- **캔버스**는 시간대를 고르기 전엔 덮개 안내, 시간대를 고르면 바로 의자를 누를 수 있다 — 일정 선택 단계에서 빈 자리를 누르면 그 의자가 선택되며 선택 좌석 단계로 넘어간다([좌석 선택하기]는 같은 일을 버튼으로). 인원을 안 골랐으면 "인원을 먼저 골라 주세요" 안내(2026-10-13 수정: 미리보기로 `disabled` 해 두니 "클릭이 안 된다"로 보였다). 완료 화면에서만 누를 수 없다. 완료 뒤엔 내 자리가 "내 예약"(자물쇠 + 흰 점선)으로 남는다. 오른쪽 위 [🔔 예약대기]는 시간대 · 인원을 고르면 켜진다. 제목 아래 한 줄(`caption`)은 안내(`hint`)가 있으면 그것을 보여 준다 — 모바일에선 패널이 멀어서다.
- **예약 안내 모달**(`ReserveConfirmModal`) — 지점 · 일시 · 좌석 · 인원 + 유의 사항(10분 전 도착 · 1시간 이용 · 결제 없는 데모) → [확인하고 예약하기]. **예약대기 모달**(`WaitlistModal`) — "원하는 좌석이 없으면? 예약대기를 신청하세요!" · 종 · 대기 일정 · 인원 · 이용 요금 무료 · 신청 취소 · 신청 종료 → [신청하기] → "예약대기를 신청했어요". 같은 시간대에 이미 신청했으면 막는다.
- 태블릿(≤1023px): 한 열 — 일정 선택 · 완료 패널은 캔버스 **위**, 선택 좌석 단계는 캔버스 + **화면 아래 고정 바**(`SelectionBar`: "선택 좌석 1/2 ▴ · T03 3번" [예약하기]) → 누르면 목록 Bottom Sheet(공용 `Modal`, ESC · 배경 탭으로 닫힘, 일정 변경 · 예약하기).
- 모바일(<768px): 같은 구조. 배치도는 최소 720px 폭을 유지하고 가로 스크롤, 미니맵은 작게.

#### 데이터 흐름 — 좌석 상태의 단일 소스

```
seatService.getChairStatuses(slot, now)    ─┐  결정적 Mock(지점|날짜|시작 시각 시드 — _lib/mockStatus.ts)
UserProvider.seatReservations(같은 시간대) ─┴→ useSeatBooking: statuses = 서버 상태 + 내 예약(RESERVED · mine)
      ├→ SeatCanvas · CafeFloorPlan(의자 71개) · SeatLegend(상태별 수)
      ├→ SeatSummary(AVAILABLE n/71 · 빈 테이블 인원별 · 마지막 업데이트 = 서버 응답 시각과 내 마지막 예약 중 나중 것)
      └→ 시간대 카드 잔여석 = getSlotAvailability(지점 · 날짜) − 그 시간대의 내 예약 의자 수
```

- 별도 카운트 State 는 없다. 예약하면(`addSeatReservation`) 배치도 · 요약 · 잔여석이 그 자리에서 바뀌고(53 → 51), `/my` 에서 취소하면(`cancelSeatReservation`) 돌아왔을 때 자리가 풀려 있다.
- Mock 점유율: 시작 시각별 기본값(12~13시 0.7 · 18시 0.68 이 높고 9시 · 21시 0.3 이 낮다) × 지점 계수(0.9 · 1.0 · 1.1) + 주말 +0.15, 최대 0.92. 4인 이상 테이블은 일부만 차기도 한다. 지점마다 한 자리는 수리 중. OPEN ↔ LIVE 가 바뀌어도 같은 자리가 차 있고, LIVE 일 때만 찬 자리의 70% 가 "사용 중"으로 보인다.
- 시계는 `_hooks/useMinuteClock.ts`(1분, `useSyncExternalStore`, 마운트 전 null) — 오늘(KST) · 지나간 시간대 판정은 분 단위면 충분하고, 1초 시계(`lib/useCountdown`)를 쓰면 의자 71개가 매초 다시 그려진다. 날짜 계산은 `lib/kst.ts`(/my 도 쓴다).
- 고른 시간대가 지나가면(자정 · 시간대 종료) 시간대 · 선택이 비고 일정 선택으로 돌아간다 — effect 가 아니라 **파생값**(`block = 고른 시간대가 CLOSED 가 아닐 때만`)으로 계산한다. 날짜도 범위를 벗어나면 기본 날짜(오늘, 오늘 시간대가 다 지났으면 내일 — `hasOpenBlock`)로 돌아온다.
- 다른 페이지를 다녀오면(`Activity` 숨김) 날짜 · 지점 · 인원은 남고, 완료 화면이었으면 일정 선택으로(`SeatBooking` 의 `useLayoutEffect` 정리). 모달도 닫는다.
- 고른 의자는 `selectedRef` 로도 들고 있어 같은 틱에 두 번 눌려도 둘 다 들어간다(UserProvider 지갑과 같은 패턴). 인원 초과 · 찬 자리 · 수리 중 · 내 예약은 거부하고 2.6초 안내(`hint`, `role="status"`).

#### CafeFloorPlan 구현

- 논리 크기 `FLOOR = 900 × 680`(`_lib/geometry.ts`). 구조물 · 구역은 데이터의 % 를 그대로 `left/top/width/height: %` 로, 테이블 · 의자는 geometry 가 px 로 바꿔 `position: absolute` 로 놓는다. **좌표만 바꾸면 위치가 바뀐다.**
- `SeatCanvas` 가 이 상자를 통째로 `transform: scale(폭에 맞춘 기본 배율 × 확대 단계 1 · 1.35 · 1.75 · 2.25)` 한다. 넘치면 스크롤 + 왼쪽 위 미니맵(같은 `CafeFloorPlan` 을 `compact` 로 0.16배, 보이는 영역 흰 사각형). 오른쪽 아래 [+][−][원래 크기] — 확대해도 화면 가운데가 같은 자리를 본다. 좁은 화면은 최소 720px(`scrollbar-gutter: stable`).
- 테이블 크기는 인원수로 정해진다(2인 52×52 · 4인 88 · 6인 124 · 8인 160, 세로 52). 의자(28px, 간격 8)는 윗줄 ⌈n/2⌉ · 아랫줄 나머지, 번호는 윗줄 왼쪽부터. 바석은 스툴(원) 하나 + 오른쪽 벽의 세로 BAR 구조물.
- 구역 이름표는 구역 윗선 가운데에 걸친 알약(`TRACKSIDE · 창가 좌석`, 아래로 11px) — 각 구역의 첫 의자 줄은 윗선에서 16px 아래부터 시작해 이름표와 4px 이상 떨어지고, 구역 사이는 14px(바닥 줄 앞은 통로를 두고 22px), 이름표와 윗줄(창문 띠 · 윗 구역의 아랫줄 의자) 사이는 6px 이상이다(`seats.ts` · `floorPlan.ts` 의 y 가 그렇게 잡혀 있다, 2026-10-14). 창문은 위쪽 벽 전체(빛나는 선), 출입구는 아래쪽 벽이 끊긴 자리 + 화살표, 통로는 점선, 카운터는 ☕ 아이콘.
- 의자 · 테이블 · 구조물 글자는 11~13px(2026-10-14 사용자 요청으로 2px 키움) — 기본 배율(PC 약 0.85 · 모바일 0.8)에서 읽히고 확대하면 커진다. 평면도 높이는 640 → 680.
- **HTML `<table>` 사용 금지.**

#### Chair(의자) 컴포넌트

| 상태 | 모양(어두운 캔버스 위) | 아이콘 | 클릭 |
|---|---|---|---|
| AVAILABLE | 흰 테두리만, 안에 번호(바석은 `B07`) | — | 선택 토글 |
| 선택 | 흰 채움 + 바깥 흰 링, 살짝 확대 | ✓ | 선택 해제 |
| 내 예약 | 흰 점선 테두리 + 반투명 채움 | 🔒 | 안내 "내가 이미 예약한 자리예요" |
| USING | 짙은 채움(#2e2e33) | 사람 | 안내 "이미 예약되었거나 사용 중인 자리예요" |
| RESERVED | 짙은 채움 | 🔒 | 안내 〃 |
| REPAIR | 빗금 | 🔧 | 안내 "수리 중인 자리예요" |

- `<button aria-label="T03 3번, 창가 좌석 · 4인 테이블 · 창가 · 콘센트, 이용 가능" aria-pressed title>`. 찬 자리는 `aria-disabled`(눌러서 안내는 받는다). 상태를 모를 때(시간대 전) · 완료 단계만 `disabled`. `React.memo`.
- 히트 영역은 `.floor .chair::before`(절대 배치된 진짜 의자에만) 로 의자 사이 간격까지 넓힌다(28 + 5×2 px). 기본 배율에서 약 24px, 확대하면 30~54px. 44px 는 확대로 얻는다(좌석이 71개라 기본 배율에서 44px 를 다 주면 평면도가 화면을 넘는다).
- 범례 · 선택 좌석 카드의 견본은 같은 `chairClassName` · `chairGlyph` 를 흐름 배치(`.legendSwatch` · `.selSwatch`, `position: relative` · `::before` 없음 · `z-index: auto` · transition 없음)로 쓴다.
  > **2026-10-13 버그 기록**: 견본에도 `::before { position: absolute; inset: -5px }` 가 붙어 있었다. 견본은 `position: static` 이라 그 가짜 요소의 기준이 뷰포트가 되어 **화면 전체를 덮는 투명 상자**가 됐고, 견본이 flex item 이라 `.chairSelected` 의 `z-index: 1` 이 살아 달력 · 의자 버튼 위로 올라왔다. 그 위에 마우스가 오면 `:hover` 로 `transform: scale(1.08)` 이 걸려 상자가 견본 크기로 줄고 → hover 가 풀려 다시 커지는 진동(transition 0.12s 주기)이 생겨 커서가 깜빡이고 클릭이 절반쯤 빠졌다(달력 8번 중 2번 적중). `el.click()` 기반 E2E 는 히트 테스트를 거치지 않아 못 잡았다 — 클릭 경로 검증은 CDP `Input.dispatchMouseEvent` 실제 마우스로 한다.

#### 필터 (12단계 — `app/(site)/seat/_lib/filter.ts`, `_hooks/useSeatFilter.ts`, `SeatFilter.tsx`)

> 2026-10-14 구현(사용자 결정): 필터 줄과 추천 줄은 **배치도 카드 안, 제목과 배치도 사이**(지시서처럼 배치도 영역과 함께). 인원은 필터에 따로 두지 않고 **일정에서 고른 인원을 그대로** 쓴다(필터엔 "2명 기준" 표시만). 특징은 지시서 19절의 네 가지(콘센트 · 창가 · 조용한 자리 · 단체석).

```
FILTER  [전체] [이용 가능만] │ [콘센트] [창가] [조용한 자리] [단체석]            2명 기준  ↻ 초기화
RECOMMENDED  [★ T03  창가 · 콘센트 · 2인 이용 가능 · 빈 의자 4/4] [★ T01 …] [★ B03 · B04 …]
```

```ts
interface SeatFilterState {
  onlyAvailable: boolean;    // [전체] / [이용 가능만]
  features: SeatFeature[];   // OUTLET, WINDOW, QUIET, GROUP — 모두 포함(AND)
}
isFilterActive(filter)  // 둘 중 하나라도 골랐을 때만 배치도를 흐린다
matchesFilter(seat, filter, people, statuses): boolean   // 자리(테이블 · 바석) 단위로 판정해 그 자리의 의자를 반투명하게
// - features → 고른 특징을 모두 포함
// - people(일정 인원) → 앉을 수 있는 크기(1~2명은 바석도 통과, 3명 이상은 capacity ≥ 인원)
// - onlyAvailable → 빈 의자가 있고, 테이블이면 인원만큼 비어 있다
```
- 맞지 않는 자리는 테이블 · 의자 모두 `opacity: 0.3`(숨기지 않는다, 지시서 19절). 의자 버튼에 `data-dim` · aria-label 에 "필터와 맞지 않음". 고른 의자는 흐리지 않는다.
- 필터 State 는 페이지 로컬(`useSeatFilter`) — 다른 페이지를 다녀와도 남는다.

#### 추천 (12단계 — `app/(site)/seat/_lib/recommend.ts`, `RecommendedSeat.tsx`)

```ts
recommendSeats(seats, statuses, filter, people): { picks: Recommendation[]; fallback: Recommendation | null }
// Recommendation = { key, seat, chairIds, label, reasons, detail, score } — 상위 3개
```
- 대상: 고른 시간대에 **인원만큼 빈 의자가 있고 필터 특징을 가진 자리**. 테이블은 빈 의자 번호 순으로 인원만큼, 바석은 위에서 아래로 **나란히 비어 있는 스툴 묶음**(`B03 · B04`). 누르면 그 의자들로 선택이 바뀌고 선택 좌석 단계로 넘어간다(= 상세가 열린다). 그새 찬 자리는 빼고 안내.
- 점수: 크기 — 딱 맞음 +2 · 1~2석 여유 +1 · 3석 0 · 4석 이상(2명에 8인석) −2 / 테이블이 통째로 비어 있으면 +1 / QUIET +0.5(동점 정리) / 바석은 혼자면 +2, 여럿이면 +1(테이블보다 한 단계 아래). 동점이면 작은 자리 · id 순. 그래서 "4명"이면 4인석이 6 · 8인석보다 먼저다.
- 카드: ★ + 자리 이름 + `창가 · 콘센트 · 2인 이용 가능` + `빈 의자 4/4`(바석은 `바 좌석 · 나란히 2석`). 배치도에서는 추천 테이블에 **금색 glow + ★ 배지 + 은은한 pulse**(사용자 결정 — 금색을 쓰는 두 번째 곳, "오늘의 우승 자리"), 추천 바석은 금색 테두리. `prefers-reduced-motion` 이면 pulse 없음.
- 시간대 전: "시간대를 고르면 맞춤 좌석을 추천해 드려요". 인원 전: "인원을 선택하면 맞춤 좌석을 추천해 드려요". 추천 0개: "조건에 맞는 빈 좌석이 없어요. 조건을 줄여 보세요" + **특징 조건을 뺀 가장 가까운 대안 1개**(≈ 점선 카드). 완료 화면에서는 필터 · 추천 줄을 숨긴다.

#### 예약 · 예약대기 (11단계)

- 의자 카드가 지시서 17절의 좌석 상세를 맡는다(ID · 타입 · 인원 · 위치(구역 한글) · 특징). 별도 `SeatDetailPanel` 은 두지 않는다.
- [예약하기] → 예약 안내 모달 → `seatService.reserveChairs(req)` → `addSeatReservation` → 완료 스탬프. 같은 시간대의 내 예약이 배치도 · 잔여석에 바로 반영된다. 서버가 붙으면 `reserveChairs` 가 `POST /api/seats/reservations` 가 되고, 실패(남이 먼저 잡음)는 모달의 오류 줄로 보여 준다.
- 예약대기: `seatService.joinWaitlist(req)` → `addSeatReservation`(kind `WAITING`, 의자 없음) → `/my` 에 "대기 중". 알림은 준비 중(안내만).
- 취소는 `/my` 에서만(`cancelReservation` → `cancelSeatReservation`). 8.10.

#### 관리자 대비 구조 & 개발용 상태 변경 (13단계)

- 좌석 상태의 **단일 소스**는 "시간대 서버 상태 + 내 예약"(위 데이터 흐름). 요약 · 범례 · 배치도 · 잔여석 · 추천은 모두 여기서 파생(별도 카운트 State 금지).
- `SeatStatusDevTool`: 의자 선택 → 라디오(이용 가능 / 사용 중 / 예약 / 수리 중) → `updateSeatStatus(slot, chairId, status)` → 고른 시간대의 덮어쓰기로 즉시 반영. `process.env.NODE_ENV !== "production"` 일 때만 렌더.
- 추후 관리자 페이지는 같은 `updateSeatStatus` service 를 호출하면 된다.
- "마지막 업데이트" 시각은 서버 상태를 다시 받거나 내 예약이 바뀔 때마다 갱신.

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

- **보이는 이벤트(사용자 결정 2026-10-14)**: 오늘(KST) **진행 중**이거나 운영자가 **노출 허가**한 이벤트(`isShownOnSite`). 상시 이벤트(날짜 없음)는 늘 진행 중이다. 순서는 진행 중(목록 순서) → 예정(시작이 가까운 순) → 종료(최근에 끝난 순).
- 상태 = 관리자가 지정한 상태(`statusOverride`) 또는 날짜 자동(`autoStatus` — 시작일 전 예정, 종료일 다음 날부터 종료, 그 밖 진행 중).
- `EventCard` 목록(`EventList`, 클라이언트): STUB `EVENT No.01` · 운영 안내 알약 · 시각(경주 시간표 따라가기면 관리자 시간표) · 상태 알약(● 진행 중 + D-n · ◷ 예정 D-n · ■ 종료 — 색 + 기호 + 글자) ┊ 이름(상세 링크) · 기간("2026.10.24(토) ~ 11.01(일)" · "상시") · 설명 · [자세히 보기] [이동 버튼]. 종료는 흐리게 하고 이동 버튼을 뺀다.
- 진행 상태가 오늘 날짜에 달려 있어 시계를 읽기 전(정적 셸)에는 빈 티켓 자리 3개만 그린다. 제목은 `"use cache"` 정적 셸.
- 보이는 이벤트가 없으면 빈 상태("진행 중인 이벤트가 없어요 · 다음 이벤트에서 만나요").

#### `/event/[id]` — 이벤트 상세 (16단계)

- 목록 티켓을 크게 펼친 머리(STUB | `RACE EVENT` · 이름 · 기간 · 설명 · 이동 버튼) + **참여 방법**(번호 원) · **유의 사항**(점 목록) 두 상자(≤960px 위아래) + [← 이벤트 목록] [이동 버튼]. 위에 `이벤트 › 이름` 위치 표시.
- 손님 화면에 보이는 이벤트만 연다. 없는 id · 예정/종료인데 노출 허가가 없는 이벤트는 `CLOSED` 안내 상자("지금은 볼 수 없는 이벤트예요" + [진행 중인 이벤트 보기]) — 메뉴의 SCRATCHED 와 같은 틀.
- 기본 이벤트 id 는 `generateStaticParams` 로 셸을 미리 만들고, 관리자가 새로 등록한 id 는 첫 요청 때. params 는 Suspense 안에서만 읽는다(`/menu/[id]` 와 같은 이유). 내용은 클라이언트(`EventDetail`)가 저장소 · 오늘 날짜로 그린다.

### 8.6 `/admin` — 관리자 공통

- 사용자 사이트와 분리된 관리자 레이아웃: 왼쪽 사이드 내비(메뉴 관리 · 카테고리 관리 · 경주 관리 · 이벤트 관리 — ≤960px 는 위 띠, 메뉴가 넘치면 다음 줄로) + 상단 "MOCK ADMIN — 서버에 저장되지 않습니다. 메뉴 · 카테고리 변경은 새로고침하면 초기화되고, 경주 · 이벤트 변경은 이 브라우저에만 저장됩니다" 띠.
- 관리자 화면은 손님 화면 컴포넌트(티켓 카드 등)를 미리보기로 가져오지 않는다 — 관리하기 편한 표 · 정보 패널로 따로 만든다(사용자 결정 2026-10-14). 손님 화면은 링크로 연다. 순수 로직(`_lib/` · Service)은 같이 쓴다.
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

쿠폰 수만 보는 곳이 아니라 **"내 것"을 모아 보는 곳**이다(2026-10-13 결정): 내 정보 · 주문 내역 · 찜한 메뉴 · 쿠폰 · 내 레이스 기록(9단계) + (자리만) 좌석 예약 내역.
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
MY RACES  내 레이스 기록                                      2경주
┌ RACE #14   ┊ [말] 5번 CARAMEL 캐러멜                          [1위] ┐  ← Race Ticket 줄, 최근 5경주
│ 10/13 18:00┊      쿠폰 4장 돌려받음                                  │     1~3위 순위는 금색, 4위 이하 회색
├ RACE #15   ┊ [말] 6번 VANILLA 바닐라                     [결과 대기] ┤  ← 정산 전(경주 전 · 경주 중)
│ 10/14 12:30┊      경주가 끝나면 결과가 기록돼요                         │
MY SEATS  좌석 예약 내역                                   [준비 중]
┊ 좌석을 예약하면 예약한 자리와 시간이 여기에 보여요.                    [좌석 보기] ┊
```

- **내 정보**: `getProfile()`(Mock) — 말 마스코트 · `MEMBER No.0007` · 닉네임 · 가입일 + "로그인 기능이 생기면 내 정보를 바꿀 수 있어요". 수정 기능은 없다.
- **주문 내역**: `orders`(최신순). 주문 순간의 장바구니 사본이라 메뉴 가격이 바뀌어도 그대로다. 비어 있으면 "아직 주문 내역이 없어요" + 메뉴판 링크.
- **찜한 메뉴**: `favorites` 순서대로, page 가 메뉴 Service 에서 받은 **메뉴판에 보이는 메뉴**만 그린다(숨김 메뉴 · 숨김 카테고리는 상세가 없어 빠진다). 품절은 흐리게 + `SOLD OUT`. 찜 해제는 상세의 ♡ 에서만 한다. 비어 있으면 "메뉴 상세에서 ♡ 찜하기를 누르면 여기에 모여요".
- **쿠폰**: 얻는 법 · 교환 준비 중 안내 + `couponHistory`. 쿠폰 교환은 규칙이 정해질 때까지 안내 문구만 둔다(버튼 없음).
- **내 레이스 기록(`MyRaces`, 9단계)**: `races`(최신순). 한 줄 = 경주 STUB(`RACE #14` · 출발 시각 KST `10/13 18:00`) ┊ 말 이미지 · `5번 CARAMEL 캐러멜` · "쿠폰 4장 돌려받음"/"돌려받은 쿠폰 없음" ┊ 순위 알약(1~3위 금색). 정산 전이면 "결과 대기" + "경주가 끝나면 결과가 기록돼요" — 정산은 어느 페이지에서든 되므로(7절 "정산") `/my` 를 보고 있어도 경주가 끝나면 바로 바뀐다. 말 정보는 page 가 `raceService.getHorses()` 로 받아 넘긴다. 최근 5경주 + 전체 보기. 비어 있으면 "아직 참여한 레이스가 없어요" + [출전표 보기].
- **좌석 예약 내역(`MySeats`, 11단계)**: `seatReservations`(최신순). 한 줄 = 날짜 · 시간대 STUB(`10.17(토)` · `13:00~15:00`) ┊ 지점 · 인원 · 좌석(`T03 1번 · T03 2번`, 예약대기는 "예약대기 · 자리가 나면 알려드려요") ┊ 상태 알약(예약됨 · 대기 중, 시간대가 끝났으면 이용 완료 · 대기 종료로 흐리게) + [예약 취소]/[대기 취소](인라인 확인 "취소할까요? 취소 · 아니요"). 취소하면 `seatService.cancelReservation` 뒤 `cancelSeatReservation` 으로 목록에서 지우고, `/seat` 로 돌아가면 그 자리가 풀려 있다. 최근 5건 + 전체 보기. 비어 있으면 "아직 예약한 좌석이 없어요" + [좌석 예약하기]. `/seat` 완료 화면의 [마이페이지에서 보기]가 `#seats` 로 온다.
- 섹션은 `scroll-margin-top` 으로 #앵커 이동 시 헤더에 가리지 않는다.
- 프로필 · 메뉴 목록 · 출전마는 모두에게 같아 page 에 `"use cache"`, 쿠폰 · 찜 · 주문 · 레이스 기록은 클라이언트 컴포넌트가 `useUser()` 로 읽는다. 시각은 클라이언트에서 만든 값이라 하이드레이션이 어긋나지 않는다.

### 8.11 `/admin/race` — 경주 관리 (16단계, 사용자 결정 2026-10-14)

```
경주 관리                                         [현황 · 시간표] [출전마] [경주 기록]  ← 바로가기
┌ NEXT RACE ─┐┌ LIVE ──────┐┌ LAST RESULT ┐┌ TODAY ─────────┐
│ Race #15   ││ 없음 / #14 ││ Race #14     ││ 2경주            │
│ 오늘 12:30 ││ 경주 중    ││ 1위 (4)CARAMEL││ 종료 0 · 남음 2   │
│ 09:57:51   ││            ││ 10/13 18:00  ││ 매일 12:30 · 18:00│
└────────────┘└────────────┘└──────────────┘└─────────────────┘
오늘 · 내일 경주표   날짜 | 출발 | 경주 | 상태(종료 · 경주 중 · 마감 · 곧 출발 · 예정) | 결과 1~3위   ← 다음 경주 줄은 금색 바탕
┌ 경주 시간표 ─────────────────────────────── [기본 시간표(12:30 · 18:00)로] ┐
│ [12:30 ×] [18:00 ×] [15:20 NEW ×]   시각 추가 [--:--] [+ 추가]            │
│ 변경: 추가 15:20 — 아직 저장하지 않았어요.            [되돌리기] [시간표 저장] │
└──────────────────────────────────────────────────────────────────────────┘
출전마   이미지 | 이름 | 조끼 색 | 주행 성향 | 성격 · 설명 | 최근 성적 | [수정]
경주 기록  검색(경주 번호 · 1~3위 말 이름) → 경주 | 출발 | 1위 | 2위 | 3위 | 4~7위   [더 보기]
```

- **현황**: `/race` 와 같은 기록(`useRaceHistory` — 이 세션에서 본 경주 + 지나간 경주 보충 + Mock)과 시간표로 계산한다(`_lib/timetable.ts`). 끝난 경주는 기록의 번호 · 결과, 아직인 경주는 다음 번호부터 차례로. 게이트 번호는 그 경주 당시 번호(`gatesFor`). 1초 시계(`useNow`)로 카운트다운 · 상태가 바뀐다.
- **시간표 편집**: 고친 목록(draft)을 따로 들고 있다가 [시간표 저장] → `updateRaceTimes`. 바꾼 내용이 있을 때만 [되돌리기] [시간표 저장]이 보인다(누를 수 없는 버튼을 두지 않는다). 검증(`validateRaceTimes`): 1~6개 · HH:MM · 중복 없음 · 23:50 전(LIVE 창이 자정을 넘지 않게) · 경주 사이 20분 이상(자정 넘어 이어지는 간격 포함 — LIVE 창 10분이 겹치면 무대가 앞 경주에 머문다) · 경계 간격(방금 출발했거나 곧 출발하는 경주와 새 시간표의 첫 경주 사이도 20분).
- **적용 시점(`changeEffectiveFrom`)**: 저장한 순간 뒤에 출발하는 경주부터. 다음 경주가 이미 마감(출발 10초 전)이면 그 경주가 출발한 직후부터 — 카운트다운 중인 경주가 사라지거나 다른 성향으로 다시 계산되지 않게. 이미 출발한 경주 · 기록 · 경주 번호는 바뀌지 않는다(지나간 경주 보충이 시간표 순서로 번호를 매기므로 과거를 바꾸면 번호가 밀린다). 지난 시각을 추가해도 오늘 그 경주가 생기지 않는다.
- **걸어 둔 경주**: 경주 번호는 "N번째 경주"라 시간표가 바뀌면 같은 번호의 경주 시각이 달라질 수 있다. 정산은 `getRaceResult(raceNo)` 가 시간표에서 그 번호의 실제 출발 시각을 찾아 받으므로 어긋나지 않는다(`RaceEntry.startsAt` 표시는 걸 때 값 그대로).
- **출전마 수정**: 7마리 고정(추가 · 삭제 없음, id 그대로). 폼 — 영문 이름(대문자로 보임 · 중복 금지) · 한글 이름 · 조끼 색(색 고르기 + #RRGGBB) · 색 이름 · 이미지(출전마 7장 중 — 트랙 장면이 같은 이미지를 쓴다) · 주행 성향(5가지, 경주에서 어떻게 달리는지 설명) · 성격 · 설명 + [기본값으로 채우기]. 성향을 바꾸면 "다음 경주부터 반영" 안내. 저장은 **버전**으로 쌓여(`horseStore`) 시뮬레이션은 그 경주 당시의 성향(`raceHorsesAt`) — 트랙(`useRaceRun`) · 정산 · 보충이 같은 순위를 낸다. 이름 · 색 · 이미지는 최근 버전(지난 기록에도 지금 이름).
- **경주 기록**: 읽기 전용, 10개씩 더 보기. 검색은 경주 번호(`13` · `#13`) 또는 1~3위 말 이름(영문 · 한글).
- 반영: 같은 브라우저의 `/race`(출전표 · 전광판 · 트랙) · 메인 히어로 시계 · Header SOON/LIVE · Footer · `/event` 의 DAILY RACE 시각 · `/my` 내 레이스 기록. 다른 탭은 storage 이벤트로 바로, 일정 계산은 1초 안에 따라간다.

### 8.12 `/admin/event` · `/admin/event/[id]` — 이벤트 관리 (16단계, 사용자 결정 2026-10-14)

```
이벤트 관리                                                     [+ 이벤트 등록]
전체 5개 · 진행 중 3개 · 손님 화면에 보이는 이벤트 3개
검색 [이름 · 설명 · 운영 안내]   상태 [전체 ▼]   손님 화면 [전체 ▼]
No. | 이벤트(이름 → 상세 · 운영 안내 · 시각) | 기간 | 상태(알약 · 자동/수동 · D-n) | 손님 화면([ON/OFF] 노출 허가 · ● 보임/○ 숨김) | 상세 수정 삭제
                                                                       [기본 이벤트로 되돌리기]
```

- 메뉴 관리처럼 등록 · 수정(모달 폼) · 삭제(확인창). 표에서 노출 허가를 바로 켜고 끈다. 숨겨진 이벤트 줄은 흐리게. 상태가 오늘 날짜에 달려 있어 시계를 읽은 뒤에 그린다.
- **상태**: 날짜 자동 + 관리자 지정 우선. 자동 — 시작일 전 예정 · 종료일이 지나면 종료(종료일 당일까지 진행 중) · 날짜가 없으면 진행 중(상시). 지정하면 날짜보다 우선(예: 조기 종료).
- **노출**: 손님 화면 = 진행 중 ∪ 노출 허가. 노출 허가는 예정 이벤트를 미리 알리거나 종료 이벤트를 남겨 둘 때 켠다.
- **폼**: 이벤트 이름(중복 금지 · 30자) · 운영 안내(10자) · 시작일 · 종료일(각각 [비우기] — 비우면 이미 시작 / 상시, 종료일 ≥ 시작일) · 진행 상태(자동(지금 무엇인지) · 진행 중 · 예정 · 종료) · 노출 허가 · 시각 표시(없음 · 직접 입력 · 경주 시간표 따라가기) · 설명(필수 · 120자) · 참여 방법 · 유의 사항(한 줄에 하나 · 6줄 · 줄당 80자) · 버튼 문구 + 이동할 페이지(사이트 페이지 고르기 또는 / 로 시작하는 직접 입력, 둘 다 있거나 둘 다 없거나).
- **상세(`/admin/event/[id]`)**: `← 이벤트 관리 / 이름` · `EVENT No.04` · 이름 · 상태 · 손님 화면 표시 + [손님 화면에서 보기 ↗](보일 때만, 새 탭) [수정] [삭제]. 두 패널 — **진행 상태**(이유 문구 `statusReason` + 자동 · 진행 중 · 예정 · 종료 붙은 라디오 칸, 고르면 바로 저장) · **손님 화면 노출**(이유 문구 `visibilityReason` + 노출 허가 스위치). 아래 정보 표(기간 · 운영 안내 · 시각 표시 · 설명 · 참여 방법 · 유의 사항 · 이동 버튼). 삭제하면 목록으로. 없는 id 는 "이벤트를 찾을 수 없습니다" + 목록 링크.
- [기본 이벤트로 되돌리기]: Mock 전용 — 확인창 뒤 저장값을 지운다(`resetEvents`).

---

## 9. 반응형 기준

| 구간 | 폭 | 주요 변화 |
|---|---|---|
| Desktop (기준) | ≥ 1200px | 최대 폭 1200px 중앙 정렬, `/seat` 3단 |
| Tablet | 768–1199px | 카드 2열, `/seat` 필터 상단 + 상세 모달 |
| Mobile | < 768px | 1열, 햄버거 내비, Bottom Sheet |

- **경마 트랙(경기 화면)**: 캔버스가 컨테이너 폭을 채우고 높이는 `clamp(260px, 32vw, 440px)`(모바일 `clamp(240px, 62vw, 320px)`). 장면의 치수가 모두 폭 · 높이 비율이라 가로 스크롤이 없다. 말 폭은 PC 12% · 모바일 15%, 번호 배지는 모바일 0.78배.
- **좌석 배치도**: 평면도(900×702)를 캔버스 폭에 맞춰 통째로 배율 조정하고, 좁은 화면은 `720px` 폭을 유지한 채 가로 스크롤 + 왼쪽 위 미니맵(보이는 영역 사각형)이 스크롤 가능함을 알린다. 확대(+)하면 PC 도 스크롤 + 미니맵. ≤1023px 는 한 열 — 일정 선택 · 완료 패널은 배치도 위, 좌석 고르기는 화면 아래 고정 바 + Bottom Sheet.
- 좌석·버튼 터치 영역 최소 44px.

---

## 10. 이번 단계에서 하지 않는 것

DB 연결 · Spring Boot API 연결 · 로그인/회원가입 · 실제 결제 · 실제 쿠폰 발급 · 실제 좌석 예약 API · WebSocket 실시간 통신.
→ 모두 Mock Data + React State 로 "동작하는 것처럼" 보여준다. 현금·실제 금전 배팅은 어떤 형태로도 구현하지 않는다.
→ 관리자 페이지도 인증 없이 열린다. 접근 제어는 로그인 기능을 붙일 때 함께 넣는다.
→ 경주 · 이벤트 관리 변경은 그 브라우저의 localStorage 에만 남는다(다른 사람 · 다른 기기에는 보이지 않음). 출전마 추가 · 삭제, 보상 수량(`RACE_PAYOUT`) 변경, 이벤트 순서 직접 바꾸기, 이벤트 이미지는 하지 않는다.
→ 장바구니는 담기·수량·삭제·합계와 목업 "주문하기"(주문 내역 기록 · 쿠폰 +1 · 장바구니 비우기)까지만 한다. 결제는 없고, 장바구니 · 주문 내역 · 찜 · 내 레이스 기록은 저장하지 않는다(새로고침 시 비워짐 — 걸어 둔 경주도 함께 사라진다).
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
- 관리자 경주 · 이벤트 저장소(`lib/raceSchedule.ts` · `race/_lib/horseStore.ts` · `event/_lib/eventStore.ts` · `lib/localStore.ts`)는 지운다. 시간표 · 출전마는 서버도 **버전(적용 시각)**으로 남겨야 지난 경주 기록 · 번호가 바뀌지 않는다 — 서버가 경주를 만들 때 그 시각의 시간표 · 출전마로 확정해 두면 프론트의 `raceTimesAt` · `raceHorsesAt` 은 필요 없어진다. 훅(`useRaceTimes` · `useRaceHorses` · `useEvents`)은 Service 를 불러오는 훅으로 바꾸고, 관리자 저장 뒤에는 `revalidateTag` 로 `/race` · `/event` 캐시를 갱신한다.
- 쿠폰 차감·정산도 그때 서버로 옮긴다. `placeBet` 이 서버에서 1장을 빼고, 결과 확정 시 서버가 `RACE_PAYOUT` 만큼 돌려준 뒤, 프론트는 `UserProvider` 를 서버 값으로 다시 불러온다. 그러면 `RaceSettlement` 는 `earnCoupons` 대신 "결과가 나오면 쿠폰 · 내 레이스 기록을 다시 불러오기"만 하고(1초 polling → 이후 SSE/WebSocket), 결과 모달 알림 구조(`resultSeenUpTo`)는 그대로 쓴다. 참여 횟수 제한을 더 두기로 하면 그것도 서버에서 건다.

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
| 16 | (관리자) 경주 관리 · 이벤트 관리 + `/event/[id]` | 5, 9, 2 |

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
- [x] **게이트 번호를 지난 경주 도착 순서로 매기기(팀 협의 2026-10-13, 9단계 뒤 구현)** — 8.2 "게이트 번호 규칙" 대로 말 id 와 게이트 번호를 나눴다: `Gates` 타입 · `records.gatesFor` · `byGate` · `simulation.seededShuffle`, `useRace` 의 `gates` · `stageGates` · `gatesOf`, `GateBadge`(`gate` prop) · `HorseCard` · `BetConfirmModal` · `HorseTrack`(머리띠 · HUD · 캔버스 배지 · 원근 줄) · `RaceResult` · `RaceHistory` · `RaceResultModal`, 출전표 카드는 게이트 번호 순, 쿠폰 내역 · 내 레이스 기록은 걸 때의 번호. 사용자 결정(2026-10-13): 결과 · 기록은 **그 경주 당시 번호** / 기록이 없는 경주는 `RaceProvider` 저장 대신 **경주 번호로 시드한 섞기**

**완료 확인**
- [x] Race #13 출전표의 게이트 번호가 Race #12 도착 순서(1번 COOKIE · 2번 LATTE · 3번 THUNDER · 4번 MOCHA · 5번 CARAMEL · 6번 ESPRESSO · 7번 VANILLA)와 같고 카드도 그 순서로 놓이며, 경주가 끝나면 다음 경주 번호가 그 결과대로 다시 매겨진다 — E2E(10/13 12:29:30): 1번 COOKIE 에 걸어 확인창 · READY · 쿠폰 내역 · `/my` 모두 "1번 COOKIE", #13 이 끝나자 결과 섹션 · 모달 1~3위 · FINISHED HUD 는 #13 번호(1위 4번 MOCHA · 2위 3번 THUNDER · 3위 1번 COOKIE), #14 출전표는 1번 MOCHA · 2번 THUNDER · 3번 COOKIE · 4번 CARAMEL · 5번 LATTE · 6번 VANILLA · 7번 ESPRESSO 순으로 다시 놓임, RECENT RACES 는 카드마다 그 경주 번호, 결승 직후 캔버스가 다시 만들어지지 않음
- [x] 기록이 없으면 무작위 순서로 번호가 매겨지고, 다시 그리거나 다른 페이지를 다녀와도 그 순서가 그대로다(빌드 · 하이드레이션 경고 없음) — RECENT RACES #8(#7 기록 없음)이 정적 셸 HTML 과 하이드레이션 뒤 모두 "1위 5번 LATTE · 2위 7번 THUNDER · 3위 6번 VANILLA", 콘솔 오류 · 경고 0, 순수 함수: 같은 경주는 늘 같은 순서 · 7,000경주에서 말마다 1번 게이트 확률 13.4~14.8%
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
- [x] (버그 수정 2026-10-13, 사용자 제보 "2배속 → 일시정지 뒤 속도 이상 · 새로고침하면 3에서 시작 안 됨") 위 API 변경 때 실험실 재생 루프가 매 프레임 `run.elapsed + 프레임 시간 × 배속`을 목표로 삼아, 20ms(`STEP_MS`)보다 짧은 나머지가 매 프레임 버려졌다 — 배속이 화면 주사율에 따라 틀어지고(40fps 에서 ×1 → 0.77, ×0.5 → 0.07) 60Hz 화면의 ×1 · ×0.5 는 카운트다운 "3"에서 멈췄다. 소수점까지 쌓는 가상 시계(`clockRef`)를 따로 두고 시뮬레이션은 그 시각까지 따라잡게 바꿨고, 그리기는 `/race` 와 같은 `toFrame`(useRace 에서 export)으로 스텝 사이를 보간한다. 확인: 새로고침 직후 3 → 2 → 1 → GO!, 경주 중 ×2 1.92 → 일시정지 0 → 재생 2.03 · ×1 1.03 · ×0.25 0.29(선두 진행도가 110ms 마다 올라감) · +20ms 정확히 한 스텝

**완료 확인**
- [x] 두 탭(참여자 A · 관람자 B)의 시계를 17:59:30 으로 맞춰 실행: 들어오자마자 지나간 12:30 경주가 "Race #13 순위"로 보충돼 있고 출전표는 #14 · 17:59:50 마감 뒤 B 의 버튼 7개 비활성("DISABLED") · 18:00 에 두 탭 모두 NOW RACING(같은 순위 진행) · 18:00:20 쯤 두 탭 모두 FINISH, **결과 섹션의 1~7위가 두 탭에서 같음**(5 · 2 · 6 · 7 · 1 · 4 · 3) · 끝나면 출전표가 #15 로 바뀌고 버튼이 다시 열림 · 콘솔 오류 0
- [x] 백그라운드 탭(rAF 정지)은 경주가 끝난 뒤 자동 보충 결과로 FINISHED 무대 · 결과 섹션을 보여 준다(처음에는 멈춘 프레임의 순위를 머리띠 · HUD 에 썼던 문제를 고침)
- [x] 순수 함수: 시드 결정성 300/300 · 시드가 다르면 다른 경주 · 보충 40경주 25ms
- [x] (9단계) 결과 섹션에 쿠폰 정산 문구 · 내 레이스 기록 — 9단계에서 함께 함

---

### 9단계 — 경주 결과 · 쿠폰 정산 · 기록 (`/race` FINISHED)

설계: 7(쿠폰 규칙 · 정산), 8.2 화면 구성 4-1 · 5 · 6, 8.10.

사용자 결정(2026-10-13): 정산은 **어느 페이지에 있든 경주가 끝나면**(루트에서 — 결과 모달은 `/race` 에서 한 번) / 결과 모달은 **정산 알림**(건 경주에서만, 1~3위 confetti, 관람자는 결과 섹션만).

**구현**
- [x] `_data/raceHistory.ts`, `raceService.getRaceHistory` (7단계에서 함께 — 최근 성적 · 경주 번호 계산에 필요)
- [x] 끝난 경주를 `RaceProvider.results` 맨 앞에 추가(출전표 최근 성적 · 다음 경주 번호가 함께 바뀐다) — 8단계 `recordResult` + 9단계 `RaceSettlement` 가 내가 건 경주의 결과를 받아 기록
- [x] `RaceBet.startsAt` · `raceService.placeBet(raceNo, startsAt, horseId)` · `getRaceResult(raceNo, startsAt)`(확정 전 null)
- [x] 내 레이스 기록 — `types/common.ts` `RaceEntry` · `UserState.races` · `joinRace` · `settleRace`(ref 로 경주당 한 번). 7~8단계의 `RaceProvider.bets` · `placeBet` 을 여기로 옮김(7절)
- [x] `components/RaceSettlement.tsx` — 결과 받기(1초 polling, 동적 import) + 정산 `earnCoupons(payoutFor(rank), "RACE_PAYOUT", payoutLabel(…))`, `settleRace` 가 true 일 때만 / `payout.ts` `payoutBreakdown` · `payoutLabel`
- [x] `RaceResultModal.tsx` — YOUR HORSE + 순위, WIN! / PLACE! / SHOW! / NEXT TIME!, 돌려받은 쿠폰(원금 + 추가) · 보유 수 · 1~3위 줄, `resultSeenUpTo` 로 한 번만
- [x] 1~3위 confetti(CSS, reduced-motion 이면 없음)
- [x] `RaceResult.tsx` — 내 말 줄 아래 정산 줄
- [x] `RaceHistory.tsx` — RECENT RACES 최근 5경기(출전표 아래), 방금 경주가 맨 앞, 내가 건 경주는 MY PICK
- [x] 다시 하기 → **[다음 경주 출전표 보기]**로 바꿈(시간 기반이라 경주를 다시 시작하지 않는다 — 모달을 닫고 출전표 제목으로 포커스)
- [x] `/my` 의 MY RACES 를 `PlannedSection` 에서 `MyRaces`(실제 목록)로 교체, `formatRaceDate` 를 `lib/time.ts` 로(두 라우트 공용)

**완료 확인**
- [x] 결과 모달의 순위가 트랙 도착 순서와 같다 — E2E(10/13 17:59:30): HUD 순위 = 결과 섹션 1~7위 = 모달 1~3위(5 · 2 · 6), 순수 함수: 루트 정산의 `getRaceResult` = 지나간 경주 보충 = 프레임 단위 트랙 300/300
- [x] 경주가 끝나면 `/my` 내 레이스 기록 맨 위에 그 경주가 생긴다 — `RACE #14 · 5번 CARAMEL · 쿠폰 4장 돌려받음 · 1위`
- [x] 내 말이 1·2·3위면 쿠폰이 각각 4·3·2장 늘고(건 1장 포함 순증 +3·+2·+1), 4위 이하면 건 1장만 빠진 채로 끝난다 — 1위 5 → 4 → 8, 3위 5 → 4 → 6, 7위 5 → 4 → 4(confetti 없음)
- [x] 결과 모달을 다시 열거나 다른 페이지에 갔다 와도 두 번 지급되지 않는다 — `/my` 를 다녀와도 8장 그대로 · 모달 다시 안 뜸, 닫은 뒤 `/menu` → `/race` 에도 6장 그대로
- [x] 다른 페이지에 있어도 정산된다 — 걸고 `/menu` 로 간 사이 12:30:20 에 Header 쿠폰 4 → 6(출발 + 19.5초 확정 뒤 · 그 전에는 그대로), `/race` 로 돌아오자 SHOW! 모달 한 번
- [x] `/my` 내역에 참가 `−1` 과 정산 `+N` 이 순서대로 남는다 — 맨 위 `Race #14 · 1위 (원금 1 + 추가 3) +4`, 그 아래 `Race #14 · 5번 CARAMEL 참가 −1`
- [x] 다시 하기 후 새 경주의 번호가 1 늘어난다 — [다음 경주 출전표 보기] 뒤 포커스가 출전표 제목, `Race #15`
- [x] `npm run build`(`/race` · `/my` 정적) · `npm run lint` · `tsc` 통과, 콘솔 오류 · 경고 0, 시뮬레이션 청크는 `/race` 만 처음부터 받는다(다른 페이지는 정산 때 동적 로드) · PC(1440) · 모바일(390)에서 모달 · 결과 섹션 · RECENT RACES · `/my` 확인
- [ ] (조율) 몇 경주 돌려 본 뒤 `RACE_PAYOUT` 수량과 참여 횟수 제한 여부를 다시 정한다 — 지금은 경주당 1회(시각 기반이라 하루 경주 수만큼), 수량 `{ 1: 4, 2: 3, 3: 2 }` 그대로

---

### 10단계 — 좌석 현황 & 배치도 (`/seat`) ✅ 2026-10-13

설계: 8.3(2026-10-13 재설계 — 날짜 · 지점 · 시간대 → 의자 단위 예약).

**구현**
- [x] `app/(site)/seat/_types.ts`, `_data/seats.ts`(30자리 = 의자 71석), `_data/floorPlan.ts`(구역 4 · 구조물), `_data/branches.ts`(지점 3), `_data/schedule.ts`(1시간 블록 13개 · 14일 · 최대 8명)
- [x] `_lib/seatService.ts` — `getBranches` · `getSeats` · `getFloorPlan` · `getTimeBlocks` · `getChairStatuses` · `getSlotAvailability` · `getSeatSummary` (+ `_lib/mockStatus.ts` 결정적 Mock)
- [x] `_lib/labels.ts`, `_lib/summary.ts`, `_lib/geometry.ts`, `_lib/schedule.ts`, `lib/kst.ts`
- [x] `BookingBar.tsx` + `SeatSummary.tsx` — 고른 일정 칩 + AVAILABLE SEATS n/71 전광판 + 빈 테이블 인원별 수 + 마지막 업데이트
- [x] `SeatLegend.tsx` — 색 + SVG 아이콘 + 텍스트 범례(상태별 의자 수)
- [x] `SeatCanvas.tsx` + `CafeFloorPlan.tsx` — 어두운 캔버스 · 창문 · 바 · 카운터 · 화장실 · 출입구 · 통로 · 구역 알약 · 배율 · 확대/축소 · 미니맵 · 덮개 안내
- [x] `Chair.tsx` — 의자 버튼: 상태별 모양(테두리 · 흰 채움 · 짙은 채움 · 빗금 · 점선), 바석은 원, `::before` 히트 영역
- [x] `SchedulePanel.tsx` + `DatePicker.tsx` — 달력 · 지점 칩 · 인원 1~8 · 시간대 범위 필터 + 1시간 카드(잔여석 · 진행 중 · 매진 · 마감)
- [x] 2026-10-13 후속 수정: 2시간 6개 → 1시간 13개, 오늘 시간대가 다 지났으면 기본 날짜 내일, 시간대만 고르면 의자를 바로 누를 수 있음(일정 선택 → 선택 좌석 자동 전환), 고른 날짜 · 지점 · 시간대 재클릭은 무시

**완료 확인**
- [x] 요약 숫자(53/71 등)가 시간대 의자 상태에서 계산된 값과 같고, 시간대 카드의 잔여석과도 같다
- [x] `seats.ts` 의 x, y 만 바꿔도 배치도 위치가 바뀐다(테이블 크기 · 의자 자리는 인원수로 자동)
- [x] HTML `<table>` 없이 평면도로 그려진다
- [x] 상태를 색 없이도(아이콘 · aria-label · title 로) 구분할 수 있다
- [x] 오늘 지나간 시간대는 "마감", 진행 중이면 "진행 중"(사용 중 의자가 보인다), 자정이 지나면 날짜가 오늘로 돌아온다

---

### 11단계 — 좌석 상세 & 예약 ✅ 2026-10-13

설계: 8.3 선택 좌석 · 예약 · 예약대기, 8.10 좌석 예약 내역.

**구현**
- [x] 의자 클릭 → 선택 상태(인원 수만큼, 넘기면 안내 · 찬 자리는 안내) — `useSeatBooking.toggleChair`
- [x] `SelectionPanel.tsx` — 선택 좌석 카드(ID · 구역 · 테이블 · 특징 · ×) · 전체삭제 · [예약하기], PC 사이드 패널 / ≤1023px 아래 고정 바 + Bottom Sheet(`SelectionBar`)
- [x] `ReserveConfirmModal.tsx`("예약 안내") → `seatService.reserveChairs` → `addSeatReservation` → `ReservationDone.tsx` "예약되었습니다." RESERVED 스탬프, 배치도에 "내 예약"
- [x] `WaitlistModal.tsx` — 매진 · 원하는 자리가 없을 때 예약대기(무료) → `joinWaitlist` → `/my` 에 "대기 중"
- [x] 좌석 예약 내역 — `UserState.seatReservations`(루트), `/my` 의 MY SEATS 를 `PlannedSection` 에서 `MySeats.tsx`(목록 · 취소 · 이용 완료)로 교체, `PlannedSection` · `ComingSoon` 삭제

**완료 확인**
- [x] 예약하면 배치도 · 요약 숫자 · 시간대 잔여석이 즉시 바뀐다(53 → 51)
- [x] 예약한 좌석이 `/my` 좌석 예약 내역에 보이고, 취소하면 `/seat` 에서 그 자리가 풀려 있다
- [x] 사용 중 · 예약 · 수리 중 · 내 예약 자리는 고를 수 없다(안내 문구)
- [x] 모바일에서 시트가 열리고 ESC · 배경 탭으로 닫힌다
- [x] 다른 페이지를 다녀와도 날짜 · 지점 · 인원은 남고, 완료 화면이었으면 일정 선택으로 돌아온다(`Activity` 숨김 때 되돌림)
- [x] `npm run build` · `npm run lint` 통과, headless Chrome E2E(PC 1440 · 모바일 390) 31/31

---

### 12단계 — 좌석 필터 & 추천 ✅ 2026-10-14

설계: 8.3 필터 · 추천(지시서 19 · 20절 원안 기준). **의자 단위 예약 위에서 동작한다** — 필터는 자리(의자의 `seat`) 단위로 판정해 맞지 않는 의자를 반투명하게, 추천은 고른 시간대에 인원만큼 빈 의자가 있는 자리를 고른다(`statuses` 는 `useSeatBooking` 에서 받는다).

**구현**
- [x] `_lib/filter.ts` — `matchesFilter`(이용 가능만 · 일정 인원 · 특징 AND) · `freeChairIds` · `fitsPeople`
- [x] `_lib/recommend.ts` — 점수 계산, 상위 3개, 바석 나란히 묶음, 추천 사유 문구, 특징을 뺀 대안 1개
- [x] `_hooks/useSeatFilter.ts`
- [x] `SeatFilter.tsx` — [전체]/[이용 가능만] · 특징 칩 4개 · "N명 기준" · 초기화(배치도 카드 위쪽 줄)
- [x] `RecommendedSeat.tsx` — 추천 카드 3개(누르면 그 의자들 선택 → 선택 좌석 단계), 시간대 · 인원 전 안내, 결과 없음 + 대안 1개
- [x] 배치도: 불일치 자리 반투명(`.tableDim` · `.chairDim`), 추천 테이블 금색 glow + ★ + pulse, 추천 바석 금색 테두리

**완료 확인**
- [x] "이용 가능만 + 콘센트 + 2명"에서 맞는 자리만 선명하게 보인다(E2E: 흐려진 의자엔 콘센트가 없고, 선명한 빈 의자엔 모두 콘센트가 있다)
- [x] 맞지 않는 자리도 사라지지 않고 흐리게 남는다(의자 71개 그대로)
- [x] 추천 항목을 누르면 그 의자들이 선택되고 선택 좌석 패널(상세 카드)이 열린다
- [x] "4명" 조건에서 4인석이 6·8인석보다 먼저 추천된다
- [x] 추천도 필터를 따른다(콘센트 필터면 콘센트 있는 자리만)

---

### 13단계 — 좌석 상태 관리 (개발용)

추후 관리자 좌석 관리의 미리보기. 설계: 8.3 관리자 대비 구조. 좌석 상태가 시간대 단위(결정적 Mock)이므로, 개발용 변경은 **고른 시간대의 덮어쓰기**(`slotKey → { chairId → status }`)를 서버 상태 위에 겹치는 방식으로 둔다.

**구현**
- [ ] `seatService.updateSeatStatus(slot, chairId, status)`
- [ ] `SeatStatusDevTool.tsx` — 의자 선택 + 상태 라디오, 개발 모드에서만 렌더

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
- [ ] `app/(site)/page.tsx` — `getSeatSummary(now)`(10단계에서 만듦 — 본점 · 지금 시간대의 빈 의자 수, 영업 전이면 첫 시간대), `getTodayWinnerMenu` 를 각 라우트 Service 에서 가져와 조립

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

---

### 16단계 — (관리자) 경주 관리 · 이벤트 관리 ✅ 2026-10-14

경주 · 이벤트를 관리자 화면에서 바꾸고, 같은 브라우저의 손님 화면에 바로 보이게 한다(사용자 결정 2026-10-14). 설계: 6절 "Mock 단계의 한계", 8.5, 8.11, 8.12.

**구현**
- [x] `lib/localStore.ts` — localStorage JSON 외부 저장소(서버 렌더 · 하이드레이션 = 기본값, storage 이벤트로 다른 탭 동기화)
- [x] `lib/raceSchedule.ts` + `lib/useRaceTimes.ts` — 시간표 버전 · `raceTimesAt` · `announcedRaceTimes`, `lib/time.ts` 가 시간표로 일정 계산 · `changeEffectiveFrom`
- [x] `race/_lib/horseStore.ts` + `race/_hooks/useRaceHorses.ts` — 출전마 버전, 시뮬레이션은 그 경주 당시 출전마(`useRaceRun` · `backfillHistory` · `getRaceResult`)
- [x] `getRaceResult(raceNo)` — 시간표에서 N번째 경주의 출발 시각을 찾는다(`records.raceStartAt`), `RaceSettlement` 갱신
- [x] Footer(`RaceTimesText`) · `/race` 전광판 · 히어로 문구가 `formatRaceTimes(times)` 로 시간표를 받는다
- [x] 이벤트 타입 확장(기간 · 상태 · 노출 허가 · 시각 표시 · 참여 방법 · 유의 사항) + `eventStatus.ts` · `eventStore.ts` · `useEvents.ts` · Service 쓰기 함수
- [x] `/event` 목록(`EventList`) · `/event/[id]` 상세(`EventDetail`, CLOSED 안내)
- [x] `/admin/race` — 현황 카드 · 오늘/내일 경주표 · 시간표 편집 · 출전마 표 + 수정 폼 · 경주 기록 검색
- [x] `/admin/event` · `/admin/event/[id]` — 목록(필터 · 노출 허가 스위치) · 등록/수정 폼 · 삭제 · 상태 지정 · 기본 이벤트로 되돌리기
- [x] `AdminNav` 4개 메뉴(≤960px 줄바꿈) · MOCK ADMIN 띠 문구

**완료 확인**
- [x] 출전마 이름 · 성향을 바꾸면 `/race` 카드에 바로 보이고, 지난 경주 순위는 그대로다(순수 함수 테스트)
- [x] 시간표에 시각을 추가하면 `/race` 다음 경주 · Footer · `/event` DAILY RACE 시각이 바뀌고, 열려 있던 다른 탭도 따라간다. 이미 출발한 경주 · 번호는 그대로, 마감 뒤 변경은 그 경주 다음부터(순수 함수 테스트)
- [x] 너무 가까운 시각(20분 미만)은 저장되지 않는다
- [x] 예정 이벤트의 노출 허가를 켜면 `/event` 에 "예정 D-n" 으로 보인다. 상태를 '종료'로 지정하면 `/event/[id]` 가 CLOSED, 자동으로 되돌리면 다시 보인다
- [x] 이벤트 등록 · 삭제가 새로고침 뒤에도 유지된다(같은 브라우저)
- [x] 390px 에서 관리자 · 이벤트 화면에 가로 넘침이 없다
- [x] `npm run build` · `npx eslint .` · `npx tsc --noEmit` 통과, 콘솔 오류 · 하이드레이션 경고 없음
