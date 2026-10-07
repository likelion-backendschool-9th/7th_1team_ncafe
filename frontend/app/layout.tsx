import type { Metadata } from "next";
import { Noto_Sans_KR, Oswald, Playfair_Display } from "next/font/google";
import { UserProvider } from "@/components/UserProvider";
import "./globals.css";

// 루트 레이아웃 — 폰트 · 전역 Provider 만. 사용자 사이트의 Header/Footer 는 (site)/layout.tsx,
// 관리자 화면은 admin/layout.tsx 가 각각 붙인다.

const display = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

const board = Oswald({
  variable: "--font-board",
  subsets: ["latin"],
});

const body = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "NCafe Racecourse", template: "%s · NCafe Racecourse" },
  description: "경마장을 테마로 한 감성 카페 — 오늘의 Daily Race 에 참가하고 쿠폰 보상을 받아보세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${display.variable} ${board.variable} ${body.variable}`}>
      <body>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
