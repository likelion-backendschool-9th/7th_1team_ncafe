# 회원 백엔드 개발

## 지점 관리자 배정

`branch_admins(branch_id, member_no)` 복합 기본키로 여러 지점·관리자를 연결한다. 동일 배정은 중복 저장하지 않는다. `BRANCH_ADMIN` 역할과 지점 배정은 별개이며, 배정 API는 역할을 자동 변경하지 않는다. 본사 관리자는 모든 지점을 조회하고 배정을 관리한다.

- 본사: `GET /api/v1/admin/branches/{branchId}/admins` 배정 목록, `PUT .../admins/{memberNo}` 배정, `DELETE .../admins/{memberNo}` 해제. 변경 요청은 CSRF가 필요하다.
- 관리자: `GET /api/v1/branch-admin/branches` 담당 지점 목록, `GET .../branches/{branchId}` 담당 지점 조회. 본사는 전체 지점을 조회한다.
- 화면: `/admin/branches/assigned`에서 본사는 배정·해제하고 지점 관리자는 본인의 담당 지점 목록을 확인한다.
- 서버의 `BranchAdminService.requireAccess`는 매번 회원 역할·탈퇴 여부·배정을 확인한다. 미배정 지점 접근은 403이며 해제된 배정과 변경된 역할은 다음 요청부터 반영한다. 기존 회원 조회 권한은 유지한다.
- `/admin/branches/operations`에서 담당 지점의 메뉴 판매 상태(판매 중·품절·판매 종료/숨김), 좌석 수리 상태, 날짜별 예약 조회·방문 확인·노쇼 처리를 제공한다. 서버에서도 지점 배정을 검사하며 예약 ID로 요청해도 예약의 소속 지점을 검사한다. 기존 방문 확인 시간·노쇼 시간 규칙은 유지한다. 메뉴 기본정보·가격·카테고리·지점 관리자 배정은 본사만 변경한다.
- 지점 운영의 기본 화면은 좌석·예약이며 메뉴 판매 화면은 버튼으로 전환한다. 고객 예약 화면과 같은 배치도·확대/축소·범례를 사용한다. 관리자 배치도의 좌석 위치는 `/api/v1/seats`, 시간대는 `/api/v1/seats/time-blocks`, 실제 의자 상태는 `/api/v1/seats/status`에서 조회한다. 날짜·시간대별 상태를 15초마다 갱신하고 조회 실패 시 상태를 가려 빈자리로 오인하지 않도록 한다. 수리 설정은 좌석 선택 후 적용하며 예약 목록은 해당 날짜 전체를 표시한다.
- 기존 PostgreSQL에는 `migrations/20261027-branch-admins.sql`을 한 번 적용한다. 자동 실행하지 않았으며 실제 DB에도 적용하지 않았다. 개발의 `ddl-auto=update`에서는 테이블이 생성된다.

테스트는 개발용 초기 SQL을 실행하지 않는 별도 H2 DB를 사용한다.

H2 프로필은 `branch_admins_data.sql`로 아래 테스트 계정과 지점 배정을 생성한다. 공통 비밀번호는 `branch-admin-pass`이며 운영 환경에서는 실행하지 않는다. 같은 아이디가 있으면 덮어쓰지 않는다.

| 지점 | 테스트 아이디 |
| --- | --- |
| 마포 | `test_mapo_admin` |
| 강남 | `test_gangnam_admin` |
| 성수 | `test_seongsu_admin` |

본사 테스트 계정은 기존 `e2eadmin` / `e2e-admin-pass`다. H2 재시작 시 계정·매핑이 다시 생성되며 테스트 중 변경한 배정·상태는 메모리 DB와 함께 초기화된다. 현재 실행 중인 백엔드는 새 코드 적용을 위해 재시작해야 한다.

Java 21을 사용한다. H2로 바로 실행하거나 PostgreSQL을 연결할 수 있다. 고객·관리자 회원 화면을 연결했다.

공통 경주 설정은 `src/main/resources/application.yaml`에 있다. `RACE_RANKING_URL`의 기본값은 `http://127.0.0.1:3000/api/race-ranking`이다. `h2`·`dev` 프로필은 Next 개발 서버와 같은 개발용 공유 키를 사용한다. 운영에서는 백엔드와 프론트에 동일한 `RACE_RANKING_KEY`를 설정한다.

프론트 API 주소는 `API_BASE_URL`로 설정하며 `API_ORIGIN`·`BACKEND_URL`도 호환한다. 기본값은 `http://127.0.0.1:8080`이다. 현재 메뉴 페이지는 빌드 시 API를 조회하므로 백엔드를 먼저 실행한다. 빈 메뉴 DB에서도 빌드할 수 있다. API 헬퍼 회귀 테스트는 frontend에서 `node --test tests/api.test.mjs`로 실행한다.

## H2 메모리 DB로 바로 실행 (PowerShell)

별도의 DB 설치 없이 실행한다.

```powershell
cd backend
.\gradlew.bat bootRun --args='--spring.profiles.active=h2'
```

- API 주소: `http://localhost:8080`
- DB 콘솔: `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:mem:security`
- 사용자: `sa`, 비밀번호: 비워둔다.

콘솔 로그인 화면에서 JDBC URL을 위 값으로 입력한다. 회원가입 API를 호출한 뒤
`SELECT * FROM members;`로 저장된 회원을 확인할 수 있다.
서버 종료 시 데이터가 사라지고 다음 실행 시 빈 테이블로 시작한다.
`ddl-auto=update`는 테이블 구조 갱신 설정이며 메모리 DB를 파일로 저장하는 설정은 아니다.
실행 SQL은 콘솔에 표시된다(`show-sql`, `format_sql`).
H2 프로필은 로컬 접속만 허용한다. 콘솔은 이 프로필에서만 활성화되며,
회원 API에는 기존 로그인 권한 검사와 CSRF 토큰이 그대로 적용된다.

## 로컬 실행 (PowerShell)

Docker Desktop이 설치되고 실행 중인 환경에서 아래 명령을 실행한다.
DB_PASSWORD에는 로컬에서 사용할 비밀번호를 입력한다. 저장소에 비밀번호를 커밋하지 않는다.

```powershell
cd backend
$env:DB_PASSWORD = '본인이 정한 개발용 비밀번호'
docker compose up -d
.\gradlew.bat bootRun --args='--spring.profiles.active=dev'
```

Docker 없이 설치한 PostgreSQL도 사용할 수 있다. `ncafe` DB와 사용자를 만든 뒤
`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`를 설정하고 dev 프로필로 실행한다.
기본 URL은 `jdbc:postgresql://localhost:5432/ncafe`, 사용자는 `ncafe`다.
dev 프로필의 `ddl-auto=update`는 로컬 개발용이다. 운영 DB에는 별도의 마이그레이션이 필요하다.

```powershell
.\gradlew.bat test
```

테스트는 H2 PostgreSQL 호환 모드를 사용하며 실제 개발 DB를 변경하지 않는다.
실제 PostgreSQL 연결 검증은 별도로 필요하다.

## API

### 실제 서버에서 전체 회원 흐름 확인

H2 서버를 실행한 상태에서 다른 PowerShell 터미널에서 아래 명령을 실행한다.

```powershell
cd backend
.\scripts\verify-member.ps1
```

Windows 실행 정책으로 차단되면 아래처럼 해당 PowerShell 프로세스에만 적용해 실행한다.
시스템의 실행 정책은 변경하지 않는다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\verify-member.ps1
```

실행마다 고유한 테스트 회원을 만들고 가입·로그인·수정·비밀번호 변경·로그아웃·탈퇴를 검증한다.
성공 시 테스트 계정은 탈퇴 상태로 남는다. 도중 실패 시 오류를 표시하고 즉시 중단하므로
테스트 계정이 활성 상태로 남을 수 있다. 개발용 서버에서 사용한다.
포트가 다르면 `-BaseUrl http://127.0.0.1:18080`을 지정한다.

### 개별 요청 실행

`requests/member.http`에 회원가입부터 탈퇴까지 순서대로 실행할 수 있는 요청 예시가 있다.
VS Code REST Client 확장의 Send Request로 실행하며 쿠키 저장 기능을 활성화한다.
비밀번호 변경 후에는 파일의 password 변수를 수정하고 안내된 순서로 다시 로그인한다.

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET | /api/v1/auth/csrf | CSRF 토큰 발급 |
| POST | /api/v1/auth/signup | 회원가입 |
| POST | /api/v1/auth/login | 로그인 |
| POST | /api/v1/auth/logout | 로그아웃 |
| GET | /api/v1/auth/me | 로그인 회원 조회 |
| GET | /api/v1/me/{memberId} | 본인 정보 조회 |
| PATCH | /api/v1/me/{memberId} | 본인 정보 수정 |
| PATCH | /api/v1/me/{memberId}/password | 비밀번호 변경 |
| DELETE | /api/v1/me/{memberId} | 본인 탈퇴 |
| GET | /api/v1/admin/members | 관리자 회원 목록 |
| GET | /api/v1/admin/members/{id} | 관리자 회원 조회 |
| POST | /api/v1/admin/members/create | 관리자 회원 추가 |
| PATCH | /api/v1/admin/members/{id} | 관리자 회원 수정 |
| DELETE | /api/v1/admin/members/{id} | 관리자 회원 탈퇴 처리 |

memberId와 id 경로 변수는 회원 관리번호 `members.no`다.
로그인 아이디는 요청의 `loginId`이며 DB에서는 `members.id`에 저장된다.

회원가입 예시:

```json
{"loginId":"tester01","password":"password123","nickname":"테스터","birth":"2000-01-01","gender":"F","phoneNumber":"010-1234-5678","email":"tester@example.com","postcode":"12345","address1":"서울","address2":"상세주소"}
```

로그인은 `loginId`, `password`, 비밀번호 변경은 `currentPassword`, `newPassword`,
탈퇴는 `password`를 JSON 본문으로 전송한다. 변경과 탈퇴는 현재 비밀번호 확인이 필요하다.
프로필 PATCH에서 null/누락은 유지하고 빈 문자열은 값을 비운다. 닉네임은 비울 수 없고,
생일은 null로 초기화하는 API를 아직 제공하지 않는다.

세션 쿠키를 유지하고, 먼저 GET `/api/v1/auth/csrf`에서 받은 `headerName`과 `token`을
모든 POST/PATCH/DELETE 요청 헤더에 포함한다. 로그인 후에는 토큰을 다시 조회한다.
로그아웃·비밀번호 변경·탈퇴 후 재로그인할 때에도 새 토큰을 조회한다.
프론트 연동 시 동일 출처 프록시 또는 명시적인 CORS 설정이 필요하다.

비밀번호는 BCrypt로 해시하며 8~64자, UTF-8 72바이트 이하만 허용한다.
변경 시 현재 세션은 종료되고 다른 기존 세션은 다음 요청에서 거부된다.
탈퇴는 회원번호를 보존하면서 개인정보를 제거하는 논리 삭제다.
관리자가 탈퇴시킨 계정의 기존 세션도 다음 요청에서 거부된다.

## 등급과 권한

`grade(id INT, name VARCHAR(20), min_total_coupons INT)`와 `members.grade_id`를 연결했다.
등급 정책이 미정이므로 신규 회원의 gradeId는 null이다. 임의의 기본 등급이나 자동 승급은 없다.
쿠폰 수·연패 수·역할·등급은 프로필 수정 요청으로 변경할 수 없다.

신규 회원은 USER다. 공개 가입 API에서는 관리자 역할을 지정할 수 없다.

| 역할 | 회원 조회 | 회원 추가·수정·삭제 | 경주 관리 |
| --- | --- | --- | --- |
| USER | 본인만 | 본인 정보 수정·탈퇴 | 불가 |
| HQ_ADMIN (본사) | 전체 | 가능 | 기존 관리자 화면 접근 가능 |
| BRANCH_ADMIN (지점) | 전체 | 불가 | 담당 지점 메뉴 판매 상태·좌석·예약 운영 가능 |

기존 ADMIN 값은 본사 관리자와 같은 권한을 유지한다. 초기 관리자 계정은 일반 회원으로
가입한 뒤 로컬 DB에서 의도한 계정의 역할만 변경한다. 예시 아이디는 실제 가입한 아이디로 바꾼다.

```sql
UPDATE members SET role = 'HQ_ADMIN' WHERE id = '본사_로그인아이디' AND deleted = false;
UPDATE members SET role = 'BRANCH_ADMIN' WHERE id = '지점_로그인아이디' AND deleted = false;
```

역할 변경 후 다시 로그인한다. 등급 운영, 이메일 인증, 비밀번호 찾기·재설정,
다른 도메인의 쿠폰 정산은 이번 구현 범위에 포함하지 않는다.

프론트 관리자 주소는 `/admin/branches/members`다. 경로 이름과 무관하게 회원 CRUD는
본사만 할 수 있고 지점은 조회 전용이다. 경주 백엔드 API와 좌석·재고의 지점별 운영 기능은
이번 회원관리 구현에 포함하지 않는다. 기존 경주 화면은 본사만 접근하도록 제한했다.

## 지점 좌석 운영 확장 (2026-10-27)

현재 `/admin/branches/operations`에서 담당 지점의 메뉴 판매 상태, 좌석·예약,
작업 이력을 관리할 수 있다. 위 회원관리 초기 구현 범위 설명과 달리 지점 운영 API도 연결되어 있다.

- 배치도에서 의자를 선택하면 해당 날짜·자리의 예약과 방문 확인·노쇼 버튼을 표시한다.
- 개별 의자 수리와 테이블 전체 수리를 구분한다. 전체 수리를 해제해도 개별 의자 수리는 유지된다.
- 수리 설정 전에 모든 날짜의 진행 중·예정된 예약을 조회하고 확인받는다. 서버는 확인한 예약 ID를
  재검증하므로 확인 도중 새 예약이 추가되면 다시 확인해야 한다. 기존 예약은 자동 취소하지 않는다.
- 수리 중 의자는 예약 API에서 거절하며, 잔여석·혼잡도·예약대기 알림 계산에서도 제외한다.
- 메뉴 상태, 전체·개별 의자 수리, 방문 확인·노쇼 변경은 변경 작업과 같은 트랜잭션으로 이력을 저장한다.
  이력은 작업자 로그인 ID, 대상, 변경 전후 상태, 시각을 보존하며 실제 상태가 바뀐 경우만 기록한다.
  지점 관리자는 담당 지점의 최근 100건만 조회할 수 있다. 과거 작업을 소급 생성하지 않는다.

추가 API:

| 메서드 | 경로 | 용도 |
| --- | --- | --- |
| GET | `/api/v1/admin/branches/{branchId}/seats/{code}/repair-conflicts?chairNo=1` | 수리 영향 예약; chairNo 생략 시 전체 |
| PATCH | `/api/v1/admin/branches/{branchId}/seats/{code}/chairs/{chairNo}/repair` | 개별 의자 수리 |
| GET | `/api/v1/admin/branches/{branchId}/operation-logs` | 최근 작업 이력 |

수리 PATCH 본문: `{"underRepair":true,"acknowledgedReservationIds":[123]}`.
영향 예약이 없거나 수리 해제 시에는 확인 ID를 생략할 수 있다.
수리와 예약은 같은 좌석 행을 잠그며, 여러 테이블을 예약할 때는 ID순으로 잠근다.

운영 DB에서 자동 DDL을 사용하지 않으면
`migrations/20261027-seat-chair-repairs-operation-logs.sql`을 먼저 적용한다.
H2 프로필은 Hibernate `update`로 새 테이블을 생성한다. 변경 적용에는 백엔드 재시작이 필요하다.
H2 메모리 DB는 서버 종료 시 테스트 예약이 사라진다.

현재 고객용 `/seat` 화면의 데이터 창구(`frontend/app/(site)/seat/_lib/seatService.ts`)는 기존 Mock이다.
이번 확장은 관리자 화면과 실제 예약·좌석 API에 적용된다. 고객 화면의 실시간 API 전환은 별도 작업이다.

검증: `BranchSeatManagementTests`, `BranchOperationsTests` 및
`frontend/tests/browser/branch-seat-management.spec.ts`(별도 H2 인스턴스에서
`BRANCH_SEAT_MANAGEMENT_TEST=1`, `MEMBER_TEST_URL` 지정).

### H2 테스트 좌석 자동 생성

`h2` 프로필에서 `H2SeatDemoData`가 SQL 초기 데이터 이후 테스트 예약을 생성한다.
마포 47자리, 강남 43자리, 성수 44자리를 일정하게 섞어 배치한다.
시작 시점의 다음 이용 가능 시간대(영업 중이면 현재 시간대)와 내일 09:00~10:00에 생성하며,
두 시간대가 같으면 한 번만 생성한다. 관리자에서 해당 날짜·시간대를 선택해 확인한다.

테스트 회원은 `sd_mapo_1`~`sd_mapo_6`, `sd_gangnam_1`~`sd_gangnam_6`,
`sd_seongsu_1`~`sd_seongsu_6`이며 일반 USER 권한이다. 테스트 비밀번호는 `Seat-Demo-2026!`다.
기존 회원·예약·수리 중인 의자는 덮어쓰지 않는다. 같은 DB에서 재실행하면 이미 생성한 예약은
중복 생성하지 않으며 취소·방문 확인·노쇼 상태도 유지한다.

H2 메모리 DB 자체를 영구 저장하는 방식은 아니다. 서버 재시작 시 기본 테스트 예약을 다시 만든다.
테스트 중 변경한 수리 상태·이력 등은 메모리 DB 종료 시 사라진다.
자동 생성을 끄려면 `H2_TEST_SEAT_DATA_ENABLED=false` 또는
`--app.test-seat-data.enabled=false`를 지정한다. `h2` 이외 프로필에서는 실행되지 않는다.
