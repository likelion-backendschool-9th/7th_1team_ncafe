import type { Metadata } from "next";
import type { ReactNode } from "react";
import AdminNav from "./_components/AdminNav";
import styles from "./_components/admin.module.css";

export const metadata: Metadata = {
  title: { default: "관리자", template: "%s · 관리자 · manhattaN cafe" },
  robots: { index: false, follow: false },
};

// 관리자 전용 레이아웃 — 사용자 사이트의 Header/Footer 를 쓰지 않는다.
// 이번 단계는 로그인이 없으므로 누구나 들어올 수 있다(주소로 직접 진입).
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <AdminNav />
      <div className={styles.workspace}>
        <p className={styles.mockBand} role="note">
          <strong>MOCK ADMIN</strong> — 메뉴 · 카테고리 변경은 새로고침하면 초기화됩니다. 경주 · 쿠폰 · 이벤트 관리는 서버에 저장됩니다(관리자 로그인 필요).
        </p>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
