# 지점 운영·회원 화면 연결 검증

## 변경 범위

- `branch_admins` 매핑과 본사의 지점 관리자 배정·해제, 담당 지점별 API 접근 제어.
- 메뉴 판매/품절/숨김, 실제 DB 좌석 배치도·예약, 방문 확인·노쇼 처리.
- 테이블·개별 의자 수리, 진행 중·예정 예약 확인, 잔여석·예약대기 계산 반영.
- 지점별 최근 100건의 작업자·대상·변경 전후 상태·시각 기록.
- H2 전용 테스트 계정과 자동 테스트 예약 생성.
- 관리자 회원관리 이전 URL 자동 이동, 마이페이지 실제 회원 설정 연결,
  헤더 hydration 일치, 빈 메뉴 DB의 상세 페이지 빌드 지원,
  백엔드 주소 환경 변수 호환 및 CSRF 실패 상태 보존.

## 검증 결과

- 백엔드 전체 테스트 34개 통과(최신 main 통합 전).
- 프론트 production build, TypeScript, 변경 파일 ESLint 통과.
- 실제 H2 API를 사용한 PC·모바일 지점 운영/신규 기능 브라우저 테스트 8개 통과.
- 작업 이력 API 404 및 이전 좌석 응답을 재현한 PC·모바일 테스트 4개 통과.
- 두 관리자 권한 × 1440/900/390px 배치 검증 6개 통과. 배치도는 기본 배율에서
  가로·세로 잘림 없이 전체 표시하고, 시간대/새로고침 간격과 의자 선택을 확인했다.
  이 배치 검증은 실제 좌석 좌표를 가져와 응답을 고정한 화면 검증이다.
- H2 시작 시 마포 47/71, 강남 43/71, 성수 44/71 예약 자동 생성 확인.
  초기화 재실행 시 중복 생성과 취소 예약 복원 방지를 통합 테스트로 검증했다.

## 재현

백엔드: `./gradlew test`.

프론트 API: `node --test tests/api.test.mjs`.

브라우저 검증은 별도 H2 DB와 해당 서버를 향하는 프론트를 실행한 뒤 수행한다.
기존 테스트 예약을 변경할 수 있으므로 개발자가 쓰는 DB 대신 검증용 인스턴스를 사용한다.

```powershell
$env:MEMBER_TEST_URL='http://127.0.0.1:13006'
$env:BRANCH_OPERATIONS_TEST='1'
$env:BRANCH_SEAT_MANAGEMENT_TEST='1'
npx.cmd playwright test tests/browser/branch-operations.spec.ts tests/browser/branch-seat-management.spec.ts
npx.cmd playwright test tests/browser/branch-operations-loading.spec.ts
```

## 적용과 한계

- PostgreSQL 배포 전 `backend/migrations/`의 매핑·수리·작업 이력 SQL 적용 필요.
- 새 API 적용에는 백엔드 재시작이 필요하다. H2는 기본 테스트 예약을 다시 생성하며,
  메모리 DB에서 변경한 수리 상태와 작업 이력 자체를 영구 보존하지 않는다.
- 고객 `/seat` 화면의 데이터 창구는 기존 Mock이다. 이번 연결 범위는 관리자와 실제 좌석 API다.
- 로컬 `application.yaml`, IDE 설정, 일회성 예약 manifest와 임시 빌드 자료는 PR에 포함하지 않는다.
