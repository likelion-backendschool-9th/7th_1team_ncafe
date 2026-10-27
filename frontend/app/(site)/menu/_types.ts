// 카테고리는 관리자가 추가·수정하므로 enum 이 아니라 데이터로 관리한다.
export interface Category {
  id: number;
  name: string; // "커피"
  engName: string; // "Coffee"
  order: number; // 탭 노출 순서 (작을수록 앞)
  visible: boolean; // false 면 /menu 탭에서 숨김
}

export type MenuStatus = "ON_SALE" | "SOLD_OUT" | "HIDDEN";
export type MenuBadge = "BEST" | "WINNER" | "NEW";

/** 음료 사이즈 — 순서는 _lib/menuSize.ts 의 MENU_SIZES */
export type MenuSize = "S" | "M" | "L" | "XL";
export type SizePrices = Record<MenuSize, number>;

/** 회원 등급 — 지금까지 받은 쿠폰 수(누적) 기준. 메뉴의 해금 등급으로도 쓴다(GET /api/v1/grades) */
export interface GradeInfo {
  id: number;
  name: string; // "준마"
  minTotalCoupons: number; // 이 등급에 필요한 누적 쿠폰
}

export interface Menu {
  id: number;
  categoryId: number;
  name: string; // 한글명
  engName: string;
  price: number; // 대표 가격 — 사이즈가 없으면 그 가격, 있으면 S 가격과 같다(시작가)
  sizePrices: SizePrices | null; // 사이즈별 가격(음료). null 이면 사이즈 없이 단일 가격(디저트)
  description: string;
  image: string; // /images/menus/xxx.svg
  badge?: MenuBadge;
  status: MenuStatus; // HIDDEN 은 /menu 에 안 보임, SOLD_OUT 은 "품절" 표시
  requiredGrade?: GradeInfo | null; // 해금 등급 — 없으면 누구나 주문, 있으면 그 등급 이상만
}

/** 등록·수정 폼 값 */
export type MenuInput = Omit<Menu, "id">;
export type CategoryInput = Pick<Category, "name" | "engName" | "visible">;
