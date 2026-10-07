"use client";

import type { ReactNode } from "react";
import Modal from "@/components/Modal";
import styles from "./admin.module.css";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** 되돌릴 수 없는 동작(삭제 등)을 한 번 더 묻는 확인창 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "확인",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} label={title}>
      <div className={styles.confirm}>
        <h2 className={styles.dialogTitle}>{title}</h2>
        <div className={styles.confirmMessage}>{message}</div>
        <div className={styles.dialogActions}>
          <button type="button" className="btn btn-outline" onClick={onCancel}>
            취소
          </button>
          <button
            type="button"
            className={`btn ${tone === "danger" ? "btn-danger" : ""}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
