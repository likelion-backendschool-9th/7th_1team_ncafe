import type { Metadata } from "next";
import CartView from "./_components/CartView";

export const metadata: Metadata = { title: "CART" };

/**
 * 장바구니 — /cart. 메뉴 상세(/menu/[id])에서 담은 메뉴를 사이즈별 줄로 보여 주고 수량·삭제·합계를 다룬다.
 * 담은 내용은 CartProvider(React State)에만 있어 정적 셸에는 빈 장바구니가 들어가고,
 * 사이트 안에서 이동해 오면 담아 둔 내용이 바로 보인다. 새로고침하면 비워진다.
 */
export default function CartPage() {
  return (
    <div className="container page">
      <div className="section-head">
        <span className="eyebrow">My Order</span>
        <h1 className="title-xl">CART</h1>
        <p className="subtitle">담아 둔 메뉴의 사이즈와 수량을 확인하세요.</p>
      </div>
      <CartView />
    </div>
  );
}
