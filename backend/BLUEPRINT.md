# NCafe Backend 청사진

> 근거: 루트 `backend-지시서.txt` / 프론트 연동 기준: `frontend/lib/types.ts`, `frontend/lib/mock.ts`

## 1. 프로젝트 기본 정보

| 항목 | 값 |
|---|---|
| 프로젝트명 (rootProject.name) | `backend` |
| Group | `com.new-cafe` |
| 기본 패키지 | `com.newcafe.backend` ※ `com.new-cafe.backend`는 하이픈 때문에 Java 패키지로 쓸 수 없음 |
| Java | 21 (Gradle toolchain) |
| Spring Boot | 4.1.1 (2026-10-06 기준 최신 안정판) |
| 빌드 도구 | Gradle (Groovy DSL) + Gradle Wrapper |
| 포트 | 8080 |

### 의존성 (최소 구성)
```groovy
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-webmvc'   // REST API (Boot 4의 web 스타터, Jackson 포함)
    implementation 'org.springframework.boot:spring-boot-starter-data-jpa' // JPA (Hibernate)
    runtimeOnly 'org.postgresql:postgresql'                                // PostgreSQL 드라이버
    testImplementation 'org.springframework.boot:spring-boot-starter-webmvc-test'
    testRuntimeOnly 'org.junit.platform:junit-platform-launcher'
}
```
- 넣지 않는 것: Lombok, Validation, Security, DevTools
- 그래서 DTO는 `record`, 도메인은 생성자와 getter를 직접 쓴 클래스, 입력 검증은 Service에서 직접 함

## 2. 아키텍처 — 3계층

```
[Client: Next.js :3000]
        │ HTTP/JSON
┌───────▼────────┐  Presentation  : 요청/응답 변환, 인증 헤더 확인, HTTP 상태 코드
│  Controller    │
├───────▼────────┤  Business      : 규칙, 검증, 금액 계산, 집계, 트랜잭션 단위 로직
│  Service       │
├───────▼────────┤  Data Access   : 저장/조회만 함 (규칙 없음)
│  Repository    │  ← JpaRepository를 상속한 interface (Spring Data가 구현 생성)
└────────────────┘
```
규칙
- Controller는 Service만, Service는 Repository만 의존한다. 계층을 건너뛰어 호출하지 않는다.
- Controller는 domain 객체를 그대로 반환하지 않는다. 항상 `dto`로 변환해서 반환한다(변환은 Service가 맡음).
- 의존성은 생성자 주입으로 받는다.

## 3. 패키지 구조

```
backend/
├─ build.gradle
├─ settings.gradle
├─ gradlew, gradlew.bat, gradle/wrapper/
└─ src/
   ├─ main/
   │  ├─ java/com/newcafe/backend/
   │  │  ├─ BackendApplication.java
   │  │  ├─ config/
   │  │  │  ├─ WebConfig.java              // CORS(localhost:3000), 인터셉터 등록
   │  │  │  └─ SeedDataLoader.java         // 시작 시 mock.ts와 같은 데이터를 넣음 (ApplicationRunner)
   │  │  ├─ common/
   │  │  │  ├─ auth/LoginMember.java       // 현재 회원 정보(record)
   │  │  │  ├─ auth/AuthInterceptor.java   // X-Member-Id → LoginMember, /api/my·/api/admin 접근 제어
   │  │  │  ├─ auth/LoginMemberArgumentResolver.java
   │  │  │  ├─ exception/ApiException.java (+ NotFound/Conflict/BadRequest/Unauthorized/Forbidden)
   │  │  │  ├─ exception/GlobalExceptionHandler.java  // @RestControllerAdvice
   │  │  │  └─ dto/ErrorResponse.java, PageResponse.java
   │  │  ├─ controller/
   │  │  │  ├─ AuthController.java
   │  │  │  ├─ LandingController.java
   │  │  │  ├─ CategoryController.java
   │  │  │  ├─ MenuController.java
   │  │  │  ├─ my/MyDashboardController.java
   │  │  │  ├─ my/BasketController.java
   │  │  │  ├─ my/OrderController.java
   │  │  │  ├─ my/FavoriteController.java
   │  │  │  ├─ admin/AdminDashboardController.java
   │  │  │  ├─ admin/AdminMenuController.java
   │  │  │  └─ admin/AdminOrderController.java
   │  │  ├─ service/
   │  │  │  ├─ AuthService, LandingService, CategoryService, MenuService
   │  │  │  ├─ BasketService, OrderService, FavoriteService
   │  │  │  ├─ MyDashboardService, AdminDashboardService, AdminMenuService, AdminOrderService
   │  │  ├─ repository/
   │  │  │  ├─ MemberRepository, CategoryRepository, MenuRepository, MenuHistoryRepository
   │  │  │  └─ BasketItemRepository, OrderRepository, FavoriteRepository      (JpaRepository 상속 interface)
   │  │  ├─ domain/   // @Entity — PostgreSQL 테이블과 매핑 (enum은 @Enumerated(STRING))
   │  │  │  ├─ Member, Role(MEMBER/ADMIN)
   │  │  │  ├─ Category, Menu, MenuStatus(ON/SOLDOUT/HIDDEN), MenuOption, OptionKind, Nutrition, MenuHistory
   │  │  │  ├─ BasketItem, Favorite
   │  │  │  └─ Order, OrderItem, OrderStatus(WAITING/PREPARING/DONE/CANCELED)
   │  │  └─ dto/   // frontend/lib/types.ts와 1:1 대응 (record)
   │  │     ├─ MemberResponse, CategoryResponse
   │  │     ├─ MenuSummary, MenuDetail, MenuOptionDto, NutritionDto, MenuForm, MenuStatusRequest
   │  │     ├─ FavoriteResponse, BasketResponse, BasketItemResponse, BasketAddRequest, BasketUpdateRequest
   │  │     ├─ OrderResponse, OrderItemResponse, OrderCreateRequest, OrderStatusRequest
   │  │     ├─ LandingResponse, MyDashboardResponse, AdminDashboardResponse, AdminMenuDetail, MenuHistoryDto
   │  │     └─ LoginRequest
   │  └─ resources/application.properties
   └─ test/java/com/newcafe/backend/
      ├─ BackendApplicationTests.java
      └─ service/  (OrderServiceTest, BasketServiceTest 등 — 순수 단위 테스트)
```

### application.properties
```properties
spring.application.name=backend
server.port=8080
spring.jackson.time-zone=Asia/Seoul
```

## 4. 공통 규약

- Base URL: `/api`
- JSON 필드: camelCase. DTO는 record로 만들어서 `isNew` 같은 이름이 그대로 직렬화되게 함
- enum: JSON에서는 소문자 (`on|soldout|hidden`, `waiting|preparing|done|canceled`, `temperature|size`, `member|admin`). `@JsonValue`/`@JsonCreator`로 변환
- 날짜/시간: `OffsetDateTime`, ISO-8601 형식, `+09:00` (예: `2026-09-16T08:36:00+09:00`)
- 페이지네이션: `?page=1&size=12` (page는 1부터 시작) → `{ items, page, size, total, totalPages }`
- 에러 응답: `{ "status": 404, "code": "MENU_NOT_FOUND", "message": "메뉴를 찾을 수 없습니다." }`

| 상황 | 상태 코드 |
|---|---|
| 조회 성공 / 수정 성공 | 200 |
| 생성 성공 | 201 (+ Location) |
| 삭제 성공 | 204 |
| 입력값 오류 | 400 |
| 로그인 필요 (헤더 없음/잘못됨) | 401 |
| 권한 없음 (회원이 /api/admin 호출) | 403 |
| 대상 없음 | 404 |
| 중복/상태 충돌 (slug 중복, 취소 불가 상태 등) | 409 |

### 인증 (임시 방식 — Security 미사용)
- `POST /api/auth/login`이 회원 정보를 돌려주면, 클라이언트는 이후 요청 헤더에 `X-Member-Id: {id}`를 넣는다.
- `AuthInterceptor`
  - `/api/my/**` → 헤더가 꼭 있어야 하고 존재하는 회원이어야 함 (아니면 401)
  - `/api/admin/**` → 위 조건에 더해 role이 ADMIN이어야 함 (아니면 403)
  - 공개 API는 헤더가 있으면 읽기만 한다 (메뉴 상세의 `favorite` 표시에 사용)
- Controller는 `LoginMember loginMember` 파라미터로 현재 사용자를 받는다 (ArgumentResolver).
- 비밀번호는 DB에 평문으로 저장한다. 학습용이며 실제 서비스에서는 Security와 해시로 바꿔야 한다.

## 5. 기능별 API 명세

### 5.0 인증
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| POST | `/api/auth/login` | `{username, password}` | `Member` |
| GET | `/api/auth/me` | 현재 회원 (헤더 기준) | `Member` |

### 5.1 사용자용 랜딩페이지 (공개)
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| GET | `/api/landing` | 홈 화면 데이터 한 번에 | `LandingResponse` |

```
LandingResponse { categories: Category[], popular: MenuSummary[4], newMenus: MenuSummary[] }
```
- popular: 공개 메뉴(hidden 제외)를 favoriteCount 내림차순, 같으면 id 내림차순으로 정렬해 4개
- newMenus: `isNew == true`인 공개 메뉴, 최신 등록순

### 5.2 사용자가 메뉴를 조회하는 기능 (공개)
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| GET | `/api/categories` | 카테고리 목록. count는 공개 메뉴 수 | `Category[]` |
| GET | `/api/menus` | 공개 메뉴 목록 | `Page<MenuSummary>` |
| GET | `/api/menus/{slug}` | 메뉴 상세 | `MenuDetail` |

- `/api/menus` 쿼리: `category`(id), `q`(한글/영문 이름 검색), `minPrice`, `maxPrice`, `sort`(`latest` 기본 \| `priceAsc` \| `priceDesc` \| `popular`), `page`=1, `size`=12
- hidden 메뉴는 목록에 안 나오고 상세는 404. soldout은 노출함
- 상세의 `related`: 같은 카테고리의 다른 공개 메뉴 최신순 4개, `favorite`: 로그인 회원이 좋아요했는지 여부

### 5.3 관리자가 메뉴를 관리하는 기능 (ADMIN)
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| GET | `/api/admin/menus` | 전체 메뉴 (hidden 포함, id 내림차순) | `Page<MenuSummary>` |
| GET | `/api/admin/menus/{id}` | 상세 + 통계 + 변경 이력 | `AdminMenuDetail` |
| POST | `/api/admin/menus` | 등록 (`MenuForm`) | 201 `MenuDetail` |
| PUT | `/api/admin/menus/{id}` | 전체 수정 (`MenuForm`) | `MenuDetail` |
| PATCH | `/api/admin/menus/{id}/status` | `{status}` 판매/품절/비공개 전환 | `MenuSummary` |
| DELETE | `/api/admin/menus/{id}` | 삭제 | 204 |

- `/api/admin/menus` 쿼리: `category`, `status`, `q`, `page`=1, `size`=10
- 검증: slug(영소문자·숫자·하이픈, 중복이면 409), korName/engName 필수, price ≥ 0, categoryId 존재, options의 kind별 isDefault는 최대 1개
- 이력(MenuHistory) 자동 기록: 등록 시 "메뉴 등록", 가격 변경 시 "가격 변경 4,300원 → 4,500원", 상태 변경 시 "상태 변경 판매중 → 품절", 그 외 수정 시 "메뉴 정보 수정"
- 삭제: 주문 이력이 있으면 409 (대신 hidden 처리하도록 안내). 삭제되면 그 메뉴의 장바구니 항목과 좋아요도 같이 지움
- stats: orderCount(취소 제외한 주문 건수), weekOrderCount(최근 7일), favoriteCount, basketCount
- 이미지 업로드는 범위 밖. `imgSrc`는 `/images/menus/{slug}.svg` 규칙으로 정함

### 5.4 회원이 메뉴를 장바구니에 관리하는 기능 (MEMBER)
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| GET | `/api/my/basket` | 내 장바구니 | `Basket` |
| POST | `/api/my/basket` | `{menuId, temperature, size, quantity}` 담기 | `Basket` |
| PATCH | `/api/my/basket/{itemId}` | `{quantity}` 수량 변경 | `Basket` |
| DELETE | `/api/my/basket/{itemId}` | 항목 삭제 | `Basket` |
| DELETE | `/api/my/basket` | 비우기 | 204 |

- `unitPrice` = 메뉴 가격 + 선택한 옵션 extraPrice 합, `price` = unitPrice × quantity, `itemTotal` = orderable 항목 price 합
- 같은 메뉴 + 같은 옵션을 다시 담으면 기존 항목 수량에 더함
- 옵션 검증: 메뉴에 해당 kind 옵션이 있으면 그중 하나를 골라야 하고(안 보내면 isDefault 적용), 없으면 null이어야 함
- quantity는 1~99. hidden/soldout 메뉴는 담을 수 없음(409). 이미 담긴 항목이 품절이 되면 `orderable=false`
- 다른 회원의 itemId에 접근하면 404

### 5.5 회원이 메뉴 주문을 관리하는 기능 (MEMBER)
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| POST | `/api/my/orders` | `{basketItemIds?}` 장바구니로 주문 (생략하면 orderable 항목 전체) | 201 `Order` |
| GET | `/api/my/orders` | `?months=1\|3\|6\|12` 기간별 주문 내역, 최신순 | `Order[]` |
| GET | `/api/my/orders/{id}` | 주문 상세 | `Order` |
| PATCH | `/api/my/orders/{id}/cancel` | 주문 취소 | `Order` |

- 주문 생성: 주문할 항목이 없거나 orderable이 아니면 409. 주문 시점의 메뉴명/단가를 OrderItem에 복사해 둠. 주문한 장바구니 항목은 삭제
- `orderNo` = `yyyyMMdd-` + 그날 순번 6자리 (예: `20260916-000128`)
- `discount`=0, `couponCode`=null (쿠폰은 범위 밖. 필드만 유지)
- 취소는 `waiting` 상태일 때만 가능. 그 외 상태면 409 ("제조 시작 이후에는 취소 불가")

### 5.6 회원용 대시보드 (MEMBER)
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| GET | `/api/my/dashboard` | 마이페이지 헤더/요약 | `MyDashboardResponse` |

```
MyDashboardResponse {
  member: Member,
  counts: { orders, favorites, basket },
  activeOrders: Order[],     // waiting·preparing
  recentOrders: Order[3],    // 최신 3건
  totalSpent: number         // 취소 제외 누적 결제액
}
```

### 5.7 관리자용 대시보드 (ADMIN)
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| GET | `/api/admin/dashboard` | 통계 | `Dashboard` (types.ts) |
| GET | `/api/admin/orders` | `?status=&page=&size=` 전체 주문 | `Page<Order>` |
| PATCH | `/api/admin/orders/{id}/status` | `{status}` 상태 변경 | `Order` |

- todayOrders: 오늘 주문 건수(취소 포함), todaySales: 오늘 주문 중 취소를 뺀 total 합
- preparing: 상태가 preparing인 주문 수, newMembersThisWeek: 최근 7일 가입자 수
- menusOn/Soldout/Hidden: 상태별 메뉴 수
- recentOrders: 최신 5건. summary = "첫 메뉴명 외 N" (항목이 하나면 메뉴명만)
- ranks: 취소를 뺀 order_items 수량 합 상위 5개, ratio = count × 100 / 1위 count
- 관리자 주문 상태 변경 허용 흐름: `waiting → preparing → done`, `waiting → canceled` (그 외는 409)

### 5.8 좋아요 (프론트 `/my/favorites` 연동용 — 지시서 외 추가)
| Method | URL | 설명 | 응답 |
|---|---|---|---|
| GET | `/api/my/favorites` | 최신순 | `Favorite[]` |
| PUT | `/api/my/favorites/{menuId}` | 좋아요 (멱등) | 204 |
| DELETE | `/api/my/favorites/{menuId}` | 좋아요 취소 | 204 |

## 6. 시드 데이터 (SeedDataLoader)
`frontend/lib/mock.ts`와 같은 값으로 넣는다.
- 회원: admin/관리자(ADMIN, id=1), hong/홍길동(MEMBER, id=2), 김민수, 이서연, 박지훈, 최유진 — 비밀번호는 모두 `1234`
- 카테고리 4개, 메뉴 12개(id 20~31, 레몬에이드 hidden, 크루아상 soldout, 스무디 2개 isNew), 메뉴별 옵션/영양정보
- 홍길동의 장바구니 3개, 좋아요 4개, 주문 5건 + 다른 회원 주문
- 날짜는 고정 값이 아니라 실행 시점(`now`) 기준 상대값으로 넣는다 → 대시보드의 "오늘" 집계가 항상 보이게

## 7. 구현 순서

지시서의 7개 기능을 의존 관계 순서로 나눈다. 앞 단계가 끝나야 다음 단계를 시작한다.

| 단계 | 기능 (지시서) | API | 선행 단계 | 프론트 화면 |
|---|---|---|---|---|
| 0 | 공통 기반 | — | — | — |
| 1 | 사용자가 메뉴를 조회하는 기능 | 5.2 | 0 | `/menus`, `/menus/[slug]` |
| 2 | 사용자용 랜딩페이지 | 5.1 | 1 | `/` |
| 3 | 관리자가 메뉴를 관리하는 기능 (+ 인증) | 5.0, 5.3 | 1 | `/admin/menus/**` |
| 4 | 회원이 메뉴를 장바구니에 관리하는 기능 | 5.4 | 3 | `/my/basket` |
| 5 | 회원이 메뉴 주문을 관리하는 기능 | 5.5 | 4 | `/my/orders` |
| 6 | 회원용 대시보드 기능 (+ 좋아요) | 5.6, 5.8 | 5 | `/my` 레이아웃, `/my/favorites` |
| 7 | 관리자용 대시보드 기능 (+ 주문 상태 관리) | 5.7 | 5 | `/admin` |

### 0단계 — 공통 기반
- Gradle 프로젝트 생성 (`settings.gradle`, `build.gradle`, wrapper), `BackendApplication`, `application.properties`
- 공통: `ApiException` 계열, `GlobalExceptionHandler`, `ErrorResponse`, `PageResponse`, `WebConfig`(CORS)
- domain 클래스 전체(Entity 매핑), JpaRepository 인터페이스 전체, `SeedDataLoader`
**완료 체크**
- [x] `./gradlew build` 성공
- [x] `./gradlew bootRun`으로 8080 포트에서 기동
- [x] 없는 URL 호출 시 `{status, code, message}` 형식의 404 응답
- [ ] `build.gradle`에 `spring-boot-starter-data-jpa`와 PostgreSQL 드라이버 추가
- [ ] `application.properties`에 datasource와 JPA 설정 (url, `ddl-auto`, `show-sql`)
- [ ] domain 클래스를 `@Entity`로 매핑 (enum은 `@Enumerated(STRING)`, 연관관계 설정)
- [ ] Repository를 `JpaRepository`를 상속한 인터페이스로 작성
- [ ] 기동 로그에서 테이블 생성(`create table ...`) 확인
- [ ] 시드 데이터 적재 확인 (기동 로그에 회원 6 · 카테고리 4 · 메뉴 12 건수 출력)

### 1단계 — 사용자 메뉴 조회
- `CategoryController`/`CategoryService`, `MenuController`/`MenuService`
- 공개 여부 판단(`Menu.isPublic()`), 검색/필터/정렬/페이지, 관련 메뉴, `MenuSummary` 변환 정착 (이후 모든 단계가 재사용)
- 이 단계에서 `favorite`는 항상 `false` (인증은 3단계)
**완료 체크**
- [ ] `GET /api/categories` → 4개, count가 커피 5 · 티 2 · 에이드·스무디 2 · 디저트 2 (hidden 제외)
- [ ] `GET /api/menus` → total 11 (레몬에이드 제외), size 12
- [ ] `?category=1` → 커피만 / `?q=라떼` → 이름 검색 / `?minPrice=4000&maxPrice=5000` → 가격 범위
- [ ] `?sort=priceAsc`·`priceDesc`·`popular` 정렬 동작
- [ ] `?page=2&size=5` → page·total·totalPages 값이 맞음
- [ ] `GET /api/menus/latte` → options 4개, nutrition, related 최대 4개 (같은 카테고리, 자기 자신 제외)
- [ ] `GET /api/menus/lemonade`(hidden) → 404, 없는 slug → 404
- [ ] 품절 메뉴(croissant)는 목록과 상세에 노출됨
- [ ] 프론트 `/menus`, `/menus/[slug]`를 API로 바꿔도 화면 정상, CORS 오류 없음
- [ ] 단위 테스트: 공개 여부, 필터·정렬

### 2단계 — 사용자용 랜딩페이지
- `LandingController`/`LandingService`: categories + popular 4개 + newMenus
- 1단계의 조회 로직과 변환을 재사용하고 새 규칙은 정렬 기준만 추가
**완료 체크**
- [ ] `GET /api/landing` 응답에 categories · popular · newMenus 포함
- [ ] popular = 치즈케이크, 딸기 스무디, 카페라떼, 아이스 아메리카노 (좋아요 수 동률 → id 내림차순)
- [ ] newMenus = 망고 스무디, 딸기 스무디 (최신순)
- [ ] 프론트 `/` 홈이 이 API 하나로 그려짐
- [ ] 단위 테스트: popular 정렬

### 3단계 — 관리자 메뉴 관리 (+ 인증 도입)
- 인증: `AuthController`/`AuthService`(login, me), `AuthInterceptor`, `LoginMemberArgumentResolver` — `/api/my/**` 401, `/api/admin/**` 403까지 이 단계에서 완성
- `AdminMenuController`/`AdminMenuService`: 목록(hidden 포함), 상세(통계·이력), 등록/수정/상태 변경/삭제
- 검증(slug 중복 409 등), `MenuHistory` 자동 기록
- 1단계에 로그인 회원의 `favorite` 표시 연결
**완료 체크 — 인증**
- [ ] `POST /api/auth/login` admin/1234 → role `admin`, 비밀번호가 틀리면 401
- [ ] `GET /api/auth/me` → 헤더가 있으면 회원 정보, 없으면 401
- [ ] `/api/admin/menus` → 헤더 없음 401 / `X-Member-Id: 2` 403 / `X-Member-Id: 1` 200
- [ ] 존재하지 않는 회원 id 헤더 → 401
- [ ] `X-Member-Id: 2`로 `GET /api/menus/latte` → `favorite: true`, 헤더가 없으면 `false`

**완료 체크 — 메뉴 관리**
- [ ] 목록: hidden 포함 12개, id 내림차순, size 10 → totalPages 2 / `?status=hidden` 필터
- [ ] `GET /api/admin/menus/23` → stats와 history 포함
- [ ] 등록 → 201 + Location, history에 "메뉴 등록"
- [ ] slug 중복 409 / 필수값 누락·가격 음수·없는 categoryId 400
- [ ] 가격 수정 → history에 "가격 변경 a원 → b원"
- [ ] soldout 전환 → 사용자 상세 status 반영 / hidden 전환 → 사용자 목록에서 빠지고 categories count 감소
- [ ] 삭제: 주문 이력이 있는 메뉴(latte) 409 / 새로 등록한 메뉴 204, 이후 조회 404
- [ ] 프론트 `/admin/menus` 목록·상세·등록·수정 연동
- [ ] 단위 테스트: 입력 검증, 이력 기록

### 4단계 — 장바구니
- `BasketController`/`BasketService`
- 금액 계산(`unitPrice` = 가격 + 옵션 추가금), 같은 메뉴·옵션 합치기, 옵션 기본값, 수량 1~99, `orderable`
**완료 체크**
- [ ] `/api/my/basket` 헤더 없음 → 401
- [ ] 회원 2 조회 → 항목 3개, itemTotal 19,500
- [ ] 아이스 아메리카노 ICE + Large 담기 → unitPrice 4,300 (3,800 + 500)
- [ ] 같은 메뉴·옵션을 다시 담기 → 새 항목 없이 수량만 증가
- [ ] 옵션 생략 → 기본 옵션 적용 / 옵션 없는 메뉴(cheesecake)에 옵션을 보내면 400
- [ ] quantity 0 또는 100 → 400
- [ ] 품절(croissant)·비공개(lemonade) 담기 → 409
- [ ] 담긴 메뉴를 관리자가 품절 처리 → 그 항목 `orderable=false`, itemTotal에서 제외
- [ ] 수량 변경, 항목 삭제, 비우기(204) 동작
- [ ] 다른 회원의 itemId 수정·삭제 → 404
- [ ] 프론트 `/my/basket` 연동
- [ ] 단위 테스트: 금액 계산, 항목 합치기, 옵션 검증

### 5단계 — 주문
- `OrderController`/`OrderService`
- 장바구니 → 주문 생성(메뉴명·단가 스냅샷, `orderNo` 채번, 장바구니 정리), 기간 조회, 상세, 취소
- 상태 전이 규칙은 `Order` 도메인 메서드로 작성 (7단계 관리자 상태 변경이 재사용)
**완료 체크**
- [ ] 주문 생성 → 201, status `waiting`, orderNo `yyyyMMdd-NNNNNN`, itemTotal = 항목 price 합
- [ ] 주문한 항목만 장바구니에서 삭제됨 (`basketItemIds`를 지정하면 나머지는 남음)
- [ ] 빈 장바구니로 주문 → 409 / `orderable=false` 항목 지정 → 409
- [ ] 주문 뒤 관리자가 메뉴 가격을 바꿔도 기존 주문의 단가와 메뉴명은 그대로
- [ ] 같은 날 두 번 주문 → orderNo 순번이 1 증가
- [ ] `?months=1·3·12` 기간 필터, 최신순
- [ ] 다른 회원의 주문 상세 → 404
- [ ] `waiting` 주문 취소 → `canceled` / `preparing`·`done`·`canceled` 취소 → 409
- [ ] 프론트 `/my/orders` 연동
- [ ] 단위 테스트: 주문 생성, 채번, 상태 전이

### 6단계 — 회원용 대시보드 (+ 좋아요)
- `FavoriteController`/`FavoriteService`: 목록, 좋아요/취소 → `favoriteCount`, 랜딩 popular에 반영
- `MyDashboardController`/`MyDashboardService`: 회원 정보, counts, 진행 중 주문, 최근 주문, 누적 결제액
**완료 체크 — 좋아요**
- [ ] 회원 2 `GET /api/my/favorites` → 4개, 최신순
- [ ] `PUT` 좋아요 → 204, 두 번 해도 1개 (멱등) / `DELETE` → 204
- [ ] 좋아요 후 favoriteCount 증가, 상세 `favorite: true`, 랜딩 popular에 반영
- [ ] 없는 메뉴·hidden 메뉴 좋아요 → 404

**완료 체크 — 회원 대시보드**
- [ ] `GET /api/my/dashboard` → member와 counts. counts가 장바구니·좋아요·주문 API 결과 개수와 같음
- [ ] activeOrders는 `waiting`·`preparing`만, recentOrders는 최대 3건
- [ ] totalSpent = 취소를 뺀 주문 total 합
- [ ] 프론트 `/my` 레이아웃(이름, 탭 개수)과 `/my/favorites` 연동
- [ ] 단위 테스트: 대시보드 집계

### 7단계 — 관리자용 대시보드 (+ 주문 상태 관리)
- `AdminOrderController`/`AdminOrderService`: 전체 주문 목록, 상태 변경(5단계의 전이 규칙 재사용)
- `AdminDashboardController`/`AdminDashboardService`: 오늘 주문/매출, 제조 대기, 신규 회원, 메뉴 상태별 수, 최근 주문, 인기 순위
**완료 체크 — 주문 상태 관리**
- [ ] `GET /api/admin/orders?status=waiting` 필터, 페이지 동작
- [ ] `waiting → preparing → done` 변경 성공 / `done → waiting`, `canceled → preparing` → 409
- [ ] 관리자가 바꾼 상태가 회원의 `/api/my/orders`에도 반영됨

**완료 체크 — 관리자 대시보드**
- [ ] 회원 헤더로 `/api/admin/dashboard` → 403
- [ ] todayOrders는 취소 포함, todaySales는 취소 제외
- [ ] menusOn + menusSoldout + menusHidden = 전체 메뉴 수
- [ ] recentOrders 최신 5건, summary "카페라떼 외 1" 형식
- [ ] ranks 최대 5개, 1위 ratio 100, 취소 주문은 집계에서 제외
- [ ] 회원 주문 → 관리자 `preparing` → `done` 흐름에서 todayOrders·preparing·todaySales 숫자가 바뀜
- [ ] 프론트 `/admin` 연동
- [ ] 단위 테스트: 상태 전이, 대시보드 집계

### 단계 공통
- 각 단계마다 그 단계 Service의 규칙을 단위 테스트로 작성한다 (금액 계산, 상태 전이, 집계).
- 단계가 끝나면 `./gradlew bootRun`을 실행하고 curl/HTTP 파일로 완료 기준을 확인한 뒤, 해당 프론트 화면을 mock에서 API로 바꿔 확인한다.

## 8. 범위 밖 (추후)
Spring Security + 비밀번호 해시, 회원가입/비밀번호 찾기, 이미지 업로드, 쿠폰, Bean Validation
