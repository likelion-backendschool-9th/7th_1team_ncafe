# 회원 백엔드 개발

Java 21을 사용한다. H2로 바로 실행하거나 PostgreSQL을 연결할 수 있다. 프론트는 아직 연결하지 않았다.

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

신규 회원은 USER다. 초기 ADMIN은 로컬 DB에서 의도한 회원을 선택해 설정한다.
공개 가입 API에서는 관리자 역할을 지정할 수 없다.

```sql
UPDATE members SET role = 'ADMIN' WHERE id = '본인의_관리자_로그인아이디' AND deleted = false;
```

역할 변경 후 다시 로그인한다. 등급 운영, 이메일 인증, 비밀번호 찾기·재설정,
다른 도메인의 쿠폰 정산은 이번 구현 범위에 포함하지 않는다.
