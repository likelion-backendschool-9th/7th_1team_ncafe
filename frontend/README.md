This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 회원 화면과 백엔드 연결

프로젝트 루트에서 Bash 터미널 두 개를 열고 실행한다.

첫 번째 터미널:

```bash
cd backend
./gradlew bootRun --args='--spring.profiles.active=h2'
```

두 번째 터미널:

```bash
cd frontend
npm run dev
```

- 회원가입: http://localhost:3000/signup
- 로그인: http://localhost:3000/login
- 내 정보 수정·비밀번호 변경·탈퇴·로그아웃: http://localhost:3000/my

이제 브라우저 화면에서 회원 기능을 사용할 수 있다. API는 Next.js의 `/api/v1/*` 프록시를
통해 기본 `http://127.0.0.1:8080`으로 전달한다. 서버 주소가 다르면 프론트 실행 전에
`BACKEND_URL` 환경변수를 지정한다. 운영 빌드는 빌드 시에도 같은 값을 지정한다.
세션 쿠키와 CSRF 토큰은 자동 처리하고, 새로고침하면 현재 세션의 회원정보를 다시 조회한다.
브라우저에서 로그인할 때 localhost와 127.0.0.1을 섞어 사용하지 않는다.

마이페이지는 실제 회원 정보와 서버의 쿠폰 수를 표시한다. 기존 모의 프로필·모의 주문 및
경주 내역은 회원정보 화면에서 표시하지 않는다. 주문·예약·경주 등 다른 도메인은 기존
프로토타입 상태이며 이번 회원 연동으로 서버 저장 기능이 추가되는 것은 아니다.
H2 서버를 종료하면 가입 데이터가 초기화된다.

## Getting Started

### 관리자 회원관리

본사·지점 역할 부여 방법은 `../backend/README.md`의 등급과 권한 절을 참고한다.
역할 변경 후 다시 로그인하면 `/admin/branches/members`로 이동한다.

- 본사: 회원 목록 검색·상세·추가·수정·삭제, 기존 경주관리 화면 접근
- 지점: 회원 목록 검색·상세 조회만 가능. 쓰기 버튼을 숨기고 직접 URL 접근도 제한
- 일반 회원: 관리자 화면 접근 불가

API도 같은 권한으로 보호하므로 화면을 우회해 지점 계정으로 쓰기를 요청하면 403을 반환한다.
좌석·재고 지점 운영은 이번 변경에서 구현하지 않았다.

관리자 브라우저 검증은 테스트 전용 본사·지점 계정을 준비한 뒤 Bash에서 실행한다.

```bash
ADMIN_TEST_HQ_ID='본사_테스트_아이디' \
ADMIN_TEST_BRANCH_ID='지점_테스트_아이디' \
ADMIN_TEST_PASSWORD='테스트_계정_비밀번호' \
npm run test:member
```

두 테스트 계정의 비밀번호는 이 검증 명령에서 같은 값을 사용한다.
관리자 테스트 환경변수가 없으면 관리자 시나리오만 건너뛰고 기존 회원 시나리오는 실행한다.
실제 운영 계정 대신 개발용 테스트 계정을 사용한다.

### 회원 화면 브라우저 자동 검증

백엔드와 프론트 개발 서버를 켜고 프론트 폴더의 별도 Bash 터미널에서 실행한다.
설치된 Google Chrome을 사용하며 데스크톱과 모바일 화면 크기로 같은 흐름을 검사한다.

```bash
npm run test:member
```

가입·로그인 실패 안내·정보 수정·새로고침 후 세션 유지·비밀번호 변경·로그아웃·
탈퇴 취소 및 완료를 확인한다. 실행마다 고유 테스트 계정을 만들고 성공 시 탈퇴한다.
중간 실패 시 해당 테스트 계정이 남을 수 있으므로 개발 서버에서만 실행한다.
모바일 검증은 Chrome의 모바일 화면 에뮬레이션이며 실제 iOS Safari 검증은 아니다.
기본 주소는 `http://localhost:3000`이며 다른 주소는 `MEMBER_TEST_URL`로 지정한다.
캡처와 실패 추적 파일은 Git에서 제외되는 `test-results/`에 저장한다.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
