"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useCart } from "@/components/CartProvider";
import QuantityStepper from "@/components/QuantityStepper";
import type { CartLine, Order } from "@/types/common";
import MenuBranchPicker from "../../menu/_components/MenuBranchPicker";
import { getMenuBranches, getMenuStatuses } from "../../menu/_lib/menuService";
import type { MenuStatus } from "../../menu/_types";
import type { Branch } from "../../seat/_types";
import {
  ORDER_COUPON_REWARD,
  createOrder,
  errorMessage,
  isPaymentCancel,
  openPaymentWindow,
  preparePayment,
} from "../_lib/orderService";
import styles from "./cart.module.css";

// 테스트 키(test_…)로는 실제로 돈이 나가지 않는다 — 그때만 안내한다 (안내 문구와 함께 주석 처리)
// const TEST_PAYMENT = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY?.startsWith("test_") ?? false;

/**
 * 장바구니 목록 + 주문 요약. 같은 메뉴라도 사이즈가 다르면 다른 줄이다.
 * 줄을 지우거나 전체 삭제하면 포커스를 제목으로 옮긴다(지운 버튼이 사라져 포커스가 길을 잃지 않게) —
 * 목록 제목과 빈 상태 제목은 동시에 보이지 않으므로 같은 id 를 쓴다.
 *
 * 주문은 지점 단위다 — 요약에서 지점을 고르면 그 지점의 품절 · 판매하지 않는 메뉴를 줄에 표시한다.
 * [결제하기] → 서버에 주문(결제 대기)을 만들고 토스 결제창을 띄운다. 결제하면 토스가 /cart/success 로,
 * 실패하면 /cart/fail 로 옮긴다. 결제창을 닫았다가 같은 장바구니로 다시 누르면 만들어 둔 주문을 그대로 쓴다.
 * 주문은 로그인 회원만 — 비로그인이면 [로그인하고 주문하기]가 로그인 뒤 이 화면으로 돌아오게 한다(담아 둔 줄은 서버로 합쳐진다).
 */
export default function CartView() {
  const { lines, count, total, loaded, error, setQuantity, remove, clear } = useCart();
  const { member } = useAuth();
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const headingId = useId();

  // 지점 — 처음엔 첫 지점. 품절 · 숨김(그 지점에서 팔지 않음) 상태는 고른 지점 것만 들고 있는다
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [pickedBranch, setPickedBranch] = useState("");
  const [statuses, setStatuses] = useState<{ branchId: string; byMenu: Map<number, MenuStatus> } | null>(null);
  const branchId = branches?.some((b) => b.id === pickedBranch) ? pickedBranch : (branches?.[0]?.id ?? "");

  // 결제 버튼은 다음 렌더부터 막히므로 같은 틱의 두 번째 클릭은 ref 로 막는다(주문이 두 번 생기지 않게).
  // 결제창을 닫고 같은 지점 · 같은 장바구니로 다시 결제하면 만들어 둔 주문을 다시 쓴다(결제 대기 주문이 쌓이지 않게)
  const submitting = useRef(false);
  const pendingOrder = useRef<{ signature: string; order: Order } | null>(null);

  useEffect(() => {
    let ignore = false;
    getMenuBranches()
      .then((list) => !ignore && setBranches(list))
      .catch(() => !ignore && setBranches([]));
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!branchId) return;
    let ignore = false;
    getMenuStatuses(branchId)
      .then((byMenu) => !ignore && setStatuses({ branchId, byMenu }))
      .catch(() => !ignore && setStatuses(null));
    return () => {
      ignore = true;
    };
  }, [branchId]);

  // 결제창을 빨리 띄우려고 결제할 수 있는 상태(로그인 · 담은 메뉴 있음)가 되면 토스 SDK · 위젯을 미리 준비한다
  const canPay = member !== null && lines.length > 0;
  useEffect(() => {
    if (canPay) preparePayment(total);
  }, [canPay, total]);

  // Cache Components 는 다른 페이지로 가도 이 화면을 언마운트하지 않고 <Activity> 로 숨겨 두므로 State 가 남는다.
  // 결제 오류 · 전체 삭제 확인 · 결제 중 표시는 그 순간의 안내라, 숨겨질 때 처음 상태로 되돌린다.
  useLayoutEffect(() => {
    return () => {
      setPayError("");
      setConfirmingClear(false);
      setPaying(false);
      submitting.current = false;
    };
  }, []);

  const focusHeading = () => requestAnimationFrame(() => document.getElementById(headingId)?.focus());

  // 고른 지점에서 주문할 수 없는 줄 — 상태를 아직 못 불러왔으면 표시하지 않는다(주문할 때 서버가 다시 확인한다)
  const branchStatuses = statuses?.branchId === branchId ? statuses.byMenu : null;
  const unavailableOf = (line: CartLine): MenuStatus | null => {
    if (!branchStatuses) return null;
    const status = branchStatuses.get(line.menuId) ?? "HIDDEN"; // 응답에 없으면 그 지점에서 숨긴 메뉴
    return status === "ON_SALE" ? null : status;
  };
  const blockedCount = lines.filter((l) => unavailableOf(l) !== null).length;

  const handleCheckout = async () => {
    if (submitting.current || lines.length === 0) return;
    if (!branchId) {
      setPayError("주문할 지점을 골라 주세요.");
      return;
    }
    if (blockedCount > 0) {
      setPayError("이 지점에서 주문할 수 없는 메뉴를 빼거나 다른 지점을 골라 주세요.");
      return;
    }
    submitting.current = true;
    setPaying(true);
    setPayError("");
    const finish = () => {
      submitting.current = false;
      setPaying(false);
    };

    const signature = `${branchId}|${lines.map((l) => `${l.key}x${l.quantity}`).join(",")}`;
    let order = pendingOrder.current?.signature === signature ? pendingOrder.current.order : null;
    try {
      if (!order) {
        order = await createOrder(branchId, lines);
        pendingOrder.current = { signature, order };
      }
    } catch (e) {
      setPayError(errorMessage(e, "주문하지 못했어요. 잠시 후 다시 시도해 주세요."));
      finish();
      return;
    }

    try {
      await openPaymentWindow(order, {
        onCancel: finish,
        onError: (message) => {
          setPayError(message);
          finish();
        },
      });
    } catch (e) {
      if (!isPaymentCancel(e)) setPayError(errorMessage(e, "결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요."));
      finish();
    }
  };

  if (!loaded) {
    return (
      <div className={styles.empty} aria-busy="true">
        <p>장바구니를 불러오는 중…</p>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className={styles.empty}>
        <h2 id={headingId} tabIndex={-1} className={styles.emptyTitle}>
          장바구니가 비어 있어요
        </h2>
        <p>메뉴판에서 오늘 트랙에 오른 메뉴를 골라 담아 보세요.</p>
        {error && (
          <p className={styles.summaryError} role="alert">
            {error}
          </p>
        )}
        <Link href="/menu" className="btn">
          메뉴판 보러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <section aria-labelledby={headingId}>
        <div className={styles.listHead}>
          <h2 id={headingId} tabIndex={-1} className={styles.listTitle}>
            담은 메뉴 <span className={styles.listCount}>{lines.length}</span>
          </h2>
          {confirmingClear ? (
            <p className={styles.clearConfirm}>
              모두 삭제할까요?
              <button
                type="button"
                className={`${styles.textButton} ${styles.textButtonDanger}`}
                onClick={() => {
                  clear();
                  setConfirmingClear(false);
                  focusHeading();
                }}
              >
                삭제
              </button>
              {/* 확인 문구로 바뀌면서 누른 버튼이 사라지므로 취소에 포커스를 둔다 */}
              <button type="button" className={styles.textButton} autoFocus onClick={() => setConfirmingClear(false)}>
                취소
              </button>
            </p>
          ) : (
            <button type="button" className={styles.textButton} onClick={() => setConfirmingClear(true)}>
              전체 삭제
            </button>
          )}
        </div>

        {error && (
          <p className={styles.listError} role="alert">
            {error}
          </p>
        )}

        <ul className={styles.list}>
          {lines.map((line) => (
            <CartRow
              key={line.key}
              line={line}
              unavailable={unavailableOf(line)}
              onQuantity={(q) => setQuantity(line.key, q)}
              onRemove={() => {
                remove(line.key);
                focusHeading();
              }}
            />
          ))}
        </ul>
      </section>

      <aside className={styles.summary} aria-labelledby={`${headingId}-summary`}>
        <h2 id={`${headingId}-summary`} className={styles.summaryTitle}>
          주문 요약
        </h2>

        {branches && branches.length > 0 && (
          <MenuBranchPicker branches={branches} selected={branchId} onSelect={setPickedBranch} />
        )}
        {branches && branches.length === 0 && <p className={styles.summaryHint}>지금 주문할 수 있는 지점이 없어요.</p>}

        <dl className={styles.summaryList}>
          <div>
            <dt>총 수량</dt>
            <dd>{count}개</dd>
          </div>
          <div className={styles.summaryTotal}>
            <dt>합계</dt>
            <dd>
              {total.toLocaleString("ko-KR")}
              <span className={styles.won}>원</span>
            </dd>
          </div>
        </dl>
        <p className={styles.summaryCoupon}>
          <span>결제하면 쿠폰</span>
          <strong>+{ORDER_COUPON_REWARD}장</strong>
        </p>

        {blockedCount > 0 && (
          <p className={styles.summaryHint}>
            이 지점에서 주문할 수 없는 메뉴가 {blockedCount}개 있어요. 빼거나 다른 지점을 골라 주세요.
          </p>
        )}

        {member ? (
          <button
            type="button"
            className="btn btn-gold btn-block"
            disabled={paying}
            // aria-describedby={TEST_PAYMENT ? `${headingId}-note` : undefined} — 테스트 결제 안내를 주석 처리해 함께 막음
            onClick={handleCheckout}
          >
            {paying ? "결제 진행 중…" : "결제하기"}
          </button>
        ) : (
          <Link href={`/login?next=${encodeURIComponent("/cart")}`} className="btn btn-gold btn-block">
            로그인하고 주문하기
          </Link>
        )}
        {/* 테스트 결제 안내 — 주석 처리
        {TEST_PAYMENT && (
          <p id={`${headingId}-note`} className={styles.summaryNote}>
            토스페이먼츠 테스트 결제예요. 실제로 돈이 나가지 않아요.
          </p>
        )}
        */}
        {payError && (
          <p className={styles.summaryError} role="alert">
            {payError}
          </p>
        )}
        <Link href="/menu" className="btn btn-outline btn-block">
          메뉴 더 담기
        </Link>
      </aside>
    </div>
  );
}

function CartRow({
  line,
  unavailable,
  onQuantity,
  onRemove,
}: {
  line: CartLine;
  unavailable: MenuStatus | null; // 고른 지점에서 품절(SOLD_OUT) · 팔지 않음(HIDDEN)
  onQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  const label = line.size ? `${line.name} ${line.size}` : line.name;

  return (
    <li className={styles.row}>
      <div className={styles.thumb}>
        <Image src={line.image} alt="" width={72} height={72} className={styles.thumbImg} />
      </div>

      <div className={styles.info}>
        <p className={styles.name}>
          <Link href={`/menu/${line.menuId}`}>{line.name}</Link>
          {line.size && (
            <span className={styles.sizeTag}>
              <span className="visually-hidden">사이즈 </span>
              {line.size}
            </span>
          )}
          {unavailable && (
            <span className={styles.unavailableTag}>{unavailable === "SOLD_OUT" ? "품절" : "이 지점 미판매"}</span>
          )}
        </p>
        <p className={styles.eng}>{line.engName}</p>
        <p className={styles.unitPrice}>{line.unitPrice.toLocaleString("ko-KR")}원</p>
      </div>

      <div className={styles.qty}>
        <QuantityStepper value={line.quantity} onChange={onQuantity} label={`${label} 수량`} size="sm" />
      </div>

      <p className={styles.lineTotal}>
        <span className="visually-hidden">{label} 금액 </span>
        {(line.unitPrice * line.quantity).toLocaleString("ko-KR")}
        <span className={styles.won}>원</span>
      </p>

      <button type="button" className={styles.remove} aria-label={`${label} 삭제`} onClick={onRemove}>
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
          <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>
    </li>
  );
}
