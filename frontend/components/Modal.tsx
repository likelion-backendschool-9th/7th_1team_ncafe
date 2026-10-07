"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import styles from "./ui.module.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** 스크린리더용 제목. 화면에 보이는 제목은 children 안에 둔다. */
  label: string;
  children: ReactNode;
  /** center: 가운데 카드 / sheet: 모바일에서 Bottom Sheet */
  variant?: "center" | "sheet";
  /** 패널 너비 */
  size?: "sm" | "md" | "lg";
  /** 배경 클릭으로 닫기 허용 여부 */
  dismissible?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 공용 모달 — ESC 닫기, 포커스 트랩, 배경 클릭 닫기, 닫힐 때 원래 포커스로 복귀 */
export default function Modal({
  open,
  onClose,
  label,
  children,
  variant = "center",
  size = "sm",
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // 닫기(×) 버튼 다음의 첫 요소에 포커스
    const items = panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    (items[1] ?? items[0] ?? panel)?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const list = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={`${styles.backdrop} ${variant === "sheet" ? styles.backdropSheet : ""}`}
      onMouseDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${styles.modal} ${styles[`modal_${size}`]} ${variant === "sheet" ? styles.sheet : ""}`}
      >
        <span id={titleId} className="visually-hidden">
          {label}
        </span>
        <button type="button" className={styles.modalClose} aria-label="닫기" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
