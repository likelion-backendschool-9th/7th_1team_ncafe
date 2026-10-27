import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import AdminNav from "./_components/AdminNav";
import styles from "./_components/admin.module.css";
import AdminAccess from "./_components/AdminAccess";

export const metadata: Metadata = {
  title: { default: "관리자", template: "%s · 관리자 · manhattaN cafe" },
  robots: { index: false, follow: false },
};

// 관리자 전용 레이아웃 — 사용자 사이트의 Header/Footer 를 쓰지 않는다.
// 로그인한 관리자의 역할에 따라 화면과 내비게이션을 제한한다.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p role="status">관리자 화면을 준비하고 있습니다…</p>}><AdminAccess><div className={styles.shell}>
      <AdminNav />
      <div className={styles.workspace}>
        <p className={styles.mockBand} role="note">
          <strong>관리자 안내</strong> — 지점 · 메뉴 · 카테고리 변경은 서버에 저장됩니다.
          경주 · 이벤트 변경은 이 브라우저에만 저장됩니다.
        </p>
        <main className={styles.content}>{children}</main>
      </div>
    </div></AdminAccess></Suspense>
  );
}
