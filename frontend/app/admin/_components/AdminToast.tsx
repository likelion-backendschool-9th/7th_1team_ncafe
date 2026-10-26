"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./admin.module.css";

export interface ToastMessage {
  id: number;
  text: string;
  tone: "success" | "error";
}

const SHOW_MS = 2_500;

/** 저장·삭제 결과 알림 상태 */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const seq = useRef(0);

  // 보이는 동안 SHOW_MS 뒤에 닫는다. 타이머를 effect 에 두어, 다른 페이지로 갔다가(<Activity> 로 숨으면 effect 가 정리된다)
  // 돌아와도 다시 걸린다 — show() 에서 걸면 숨는 순간 지워져 토스트가 남는다
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), SHOW_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  function show(text: string, tone: ToastMessage["tone"] = "success") {
    seq.current += 1;
    setToast({ id: seq.current, text, tone });
  }

  return { toast, show };
}

/** 화면 하단 결과 알림 */
export default function AdminToast({ toast }: { toast: ToastMessage | null }) {
  return (
    <div className={styles.toastSlot} role="status" aria-live="polite">
      {toast && (
        <p key={toast.id} className={`${styles.toast} ${toast.tone === "error" ? styles.toastError : ""}`}>
          <span aria-hidden>{toast.tone === "error" ? "⚠" : "✓"}</span> {toast.text}
        </p>
      )}
    </div>
  );
}
