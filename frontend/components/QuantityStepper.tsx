import { CART_MAX_QUANTITY } from "@/lib/cart";
import styles from "./ui.module.css";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** 묶음 이름 — "아메리카노 M 수량" */
  label: string;
  max?: number;
  disabled?: boolean;
  size?: "md" | "sm";
}

/** 수량 − / + — 1 ~ max(기본 장바구니 최대 수량). /menu/[id] 담기 · /cart 공용. */
export default function QuantityStepper({
  value,
  onChange,
  label,
  max = CART_MAX_QUANTITY,
  disabled = false,
  size = "md",
}: QuantityStepperProps) {
  return (
    <div className={`${styles.stepper} ${size === "sm" ? styles.stepperSm : ""}`} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.stepperBtn}
        aria-label="수량 줄이기"
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
      >
        −
      </button>
      <output className={styles.stepperValue} aria-live="polite">
        {value}
      </output>
      <button
        type="button"
        className={styles.stepperBtn}
        aria-label="수량 늘리기"
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
      >
        +
      </button>
    </div>
  );
}
