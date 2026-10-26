import type { Metadata } from "next";
import { CartProvider } from "@/components/CartProvider";
import { RaceProvider } from "@/components/RaceProvider";
import RaceSettlement from "@/components/RaceSettlement";
import { UserProvider } from "@/components/UserProvider";
import "./globals.css";

// 루트 레이아웃 — 폰트 · 전역 Provider 만. 사용자 사이트의 Header/Footer 는 (site)/layout.tsx,
// 관리자 화면은 admin/layout.tsx 가 각각 붙인다. RaceSettlement 는 화면 없이 레이스 정산 결과를 받는다(어느 페이지에 있든).

// 폰트: Pretendard(가변) 하나로 통일한다. 한글 동적 서브셋을 CDN 에서 받는 방식이라
// next/font 가 아닌 <link> 로 연결한다(폰트 스택은 globals.css 의 --font-sans).
const PRETENDARD_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export const metadata: Metadata = {
  title: { default: "manhattaN cafe", template: "%s · manhattaN cafe" },
  description: "경마장을 테마로 한 감성 카페 — 오늘의 Daily Race 에 참가하고 쿠폰 보상을 받아보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={PRETENDARD_CSS} />
      </head>
      <body>
        <UserProvider>
          <CartProvider>
            <RaceProvider>
              <RaceSettlement />
              {children}
            </RaceProvider>
          </CartProvider>
        </UserProvider>
      </body>
    </html>
  );
}
