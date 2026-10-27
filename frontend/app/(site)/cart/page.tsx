import type { Metadata } from "next";
import CartView from "./_components/CartView";

export const metadata: Metadata = { title: "CART" };

/**
 * 장바구니 — /cart. 메뉴 상세(/menu/[id])에서 담은 메뉴를 사이즈별 줄로 보여 주고 수량·삭제·합계를 다룬 뒤 지점을 골라 결제한다.
 * 담은 내용은 로그인 회원은 서버, 비로그인은 이 브라우저에 있어(CartProvider) 정적 셸에는 불러오는 중 상태가 들어가고,
 * 브라우저가 불러온 뒤 목록을 그린다. 결제 결과는 /cart/success · /cart/fail.
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
