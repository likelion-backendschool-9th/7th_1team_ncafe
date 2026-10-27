// 주문 · 결제 — 백엔드 /api/v1/orders (로그인 필요)와 토스페이먼츠 결제창형(구 결제위젯, 클라이언트 키 test_gck_…).
//   1) createOrder: 장바구니 줄 + 지점 → 주문(결제 대기). 단가 · 합계는 서버가 메뉴 가격으로 다시 계산한다
//   2) openPaymentWindow: 그 주문의 금액 · 토스 orderId(pgOrderId)로 결제창을 띄운다 → 구매자가 결제하면 /cart/success 로 이동
//   3) completePayment: /cart/success 가 토스가 붙여 준 paymentKey · orderId · amount 로 서버 승인을 요청한다
//      (금액 대조 · 토스 승인 · 쿠폰 적립 · 장바구니에서 주문한 줄 빼기는 서버가 한다)
import { ANONYMOUS, loadTossPayments, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { ApiError, api } from "@/lib/api";
import { lineKey } from "@/lib/cart";
import { FALLBACK_IMAGE } from "@/app/(site)/menu/_lib/menuService";
import type { CartLine, Order } from "@/types/common";
import { toMenuSize } from "./cartService";

/** 주문 1회당 적립 쿠폰 수 — 결제를 마치면 서버가 준다(PaymentService.ORDER_COUPON_REWARD). 담은 수량과 무관하다 */
export const ORDER_COUPON_REWARD = 1;

/** 주문 응답(dto/order/OrderResponse) */
interface OrderResponse {
  id: number;
  branchId: string;
  branchName: string;
  totalPrice: number;
  totalQuantity: number;
  summary: string;
  createdDate: string;
  payment: { pgOrderId: string; status: "READY" | "PAID"; paidDate: string | null };
  items: {
    menuId: number;
    nameKor: string;
    nameEng: string;
    image: string | null;
    size: string;
    quantity: number;
    unitPrice: number; // 주문할 때 가격
  }[];
}

function toOrder(r: OrderResponse): Order {
  const paid = r.payment.status === "PAID";
  return {
    orderNo: r.id,
    branchName: r.branchName,
    orderedAt: r.createdDate,
    lines: r.items.map((i) => {
      const size = toMenuSize(i.size);
      return {
        key: lineKey(i.menuId, size),
        menuId: i.menuId,
        size,
        name: i.nameKor,
        engName: i.nameEng,
        image: i.image || FALLBACK_IMAGE,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      };
    }),
    count: r.totalQuantity,
    total: r.totalPrice,
    summary: r.summary,
    paid,
    pgOrderId: r.payment.pgOrderId,
    couponReward: paid ? ORDER_COUPON_REWARD : 0,
  };
}

/** GET /api/v1/orders — 내 주문(결제 대기 포함), 최신순 */
export async function getOrders(): Promise<Order[]> {
  return (await api<OrderResponse[]>("/orders")).map(toOrder);
}

/** POST /api/v1/orders — 그 지점에서 주문(결제 대기). 품절 409 · 잠긴 메뉴 403 · 영업하지 않는 지점 409 */
export async function createOrder(branchId: string, lines: CartLine[]): Promise<Order> {
  const items = lines.map((l) => ({ menuId: l.menuId, size: l.size, quantity: l.quantity }));
  return toOrder(await api<OrderResponse>("/orders", { method: "POST", body: { branchId, items } }));
}

// ───────── 토스 결제창 ─────────

/** 토스 결제창에서 구매자가 결제를 그만뒀는가(결제창 닫기 등) — 오류로 보여 주지 않는다 */
export function isPaymentCancel(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && e.code === "USER_CANCEL";
}

export function errorMessage(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

// 위젯은 한 번 만들어 계속 쓴다 — 결제창을 닫았다가 다시 띄울 때도 같은 위젯이다(실패하면 다음에 다시 만든다)
let widgetsPromise: Promise<TossPaymentsWidgets> | null = null;

function loadWidgets(): Promise<TossPaymentsWidgets> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) return Promise.reject(new Error("결제 설정(NEXT_PUBLIC_TOSS_CLIENT_KEY)이 없어 결제창을 열 수 없어요."));
  widgetsPromise ??= loadTossPayments(clientKey)
    // 결제수단을 저장해 두는 기능(customerKey)은 쓰지 않는다
    .then((tossPayments) => tossPayments.widgets({ customerKey: ANONYMOUS }))
    .catch((e: unknown) => {
      widgetsPromise = null;
      throw e;
    });
  return widgetsPromise;
}

/**
 * 결제창을 빨리 띄우려고 미리 준비한다 — 장바구니가 보이는 동안 토스 SDK 스크립트(약 500KB)를 받고 위젯을 만들어 금액을 넣어 둔다.
 * 처음 결제창을 열 때 [결제하기]를 누른 뒤 SDK 를 받는 시간이 사라진다. 실패해도 조용히 넘어간다(결제할 때 다시 시도한다).
 */
export function preparePayment(amount: number): void {
  loadWidgets()
    .then((widgets) => (amount > 0 ? widgets.setAmount({ currency: "KRW", value: amount }) : undefined))
    .catch(() => {});
}

/**
 * 결제창형 결제창을 띄운다. 구매자가 결제창에서 결제하기를 누르면 paymentRequest 이벤트가 오고,
 * 그때 requestPayment 로 결제를 요청하면 토스가 successUrl(성공) · failUrl(실패)로 이 페이지를 옮긴다.
 * 결제창을 닫으면 onCancel, 결제 요청이 거절되면 onError. 결제창을 띄우기 전의 실패는 그대로 던진다.
 */
export async function openPaymentWindow(
  order: Order,
  { onCancel, onError }: { onCancel: () => void; onError: (message: string) => void },
): Promise<void> {
  const widgets = await loadWidgets();
  // 금액은 서버가 계산한 주문 합계로 다시 맞춘다(미리 준비할 때는 장바구니 합계였다)
  await widgets.setAmount({ currency: "KRW", value: order.total });
  // orderName 은 requestPayment 와 같아야 한다(다르면 InvalidParametersError)
  const paymentWindow = await widgets.renderPaymentWindow({ orderName: order.summary });

  paymentWindow.on("paymentRequest", async () => {
    try {
      await widgets.requestPayment({
        orderId: order.pgOrderId,
        orderName: order.summary,
        successUrl: `${window.location.origin}/cart/success`,
        failUrl: `${window.location.origin}/cart/fail`,
      });
    } catch (e) {
      if (isPaymentCancel(e)) onCancel();
      else onError(errorMessage(e, "결제를 요청하지 못했어요."));
    }
  });
  paymentWindow.on("cancel", async () => onCancel());
}

// ───────── 결제 승인 (/cart/success) ─────────

// 같은 결제를 두 번 승인하지 않게 진행 중인 요청을 paymentKey 로 묶는다(개발 모드의 effect 두 번 실행 · 빠른 새로고침)
const completing = new Map<string, Promise<Order>>();

/**
 * 토스가 successUrl 에 붙여 준 값으로 결제를 마친다 — orderId(= pgOrderId)로 내 주문을 찾아 승인을 요청한다.
 * 이미 결제한 주문이면(새로고침) 승인하지 않고 그 주문을 돌려준다. 주문번호를 successUrl 에 따로 싣지 않으려고 목록에서 찾는다.
 */
export function completePayment(paymentKey: string, pgOrderId: string, amount: number): Promise<Order> {
  let pending = completing.get(paymentKey);
  if (!pending) {
    pending = confirm(paymentKey, pgOrderId, amount);
    completing.set(paymentKey, pending);
    pending.catch(() => completing.delete(paymentKey)); // 실패하면 다시 시도할 수 있게
  }
  return pending;
}

async function confirm(paymentKey: string, pgOrderId: string, amount: number): Promise<Order> {
  const order = (await getOrders()).find((o) => o.pgOrderId === pgOrderId);
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "결제한 주문을 찾을 수 없어요.");
  if (order.paid) return order;
  try {
    // POST /api/v1/orders/{orderId}/payment — 서버가 금액 · 주문번호를 대조하고 토스에 승인을 요청한다
    await api<unknown>(`/orders/${order.orderNo}/payment`, {
      method: "POST",
      body: { paymentKey, orderId: pgOrderId, amount },
    });
  } catch (e) {
    if (!(e instanceof ApiError && e.code === "ORDER_ALREADY_PAID")) throw e;
  }
  return { ...order, paid: true, couponReward: ORDER_COUPON_REWARD };
}
