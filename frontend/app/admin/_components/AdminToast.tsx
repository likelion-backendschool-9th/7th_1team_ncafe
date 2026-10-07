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
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function show(text: string, tone: ToastMessage["tone"] = "success") {
    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    setToast({ id: seq.current, text, tone });
    timer.current = setTimeout(() => setToast(null), SHOW_MS);
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
