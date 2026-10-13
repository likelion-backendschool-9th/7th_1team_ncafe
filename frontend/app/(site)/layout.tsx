import type { ReactNode } from "react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import styles from "@/components/layout.module.css";

// 사용자 사이트(/, /menu, /seat, /race, /event, /cart) 공통 레이아웃. route group 이라 URL 에는 영향이 없다.
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.site}>
      <Header />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}
