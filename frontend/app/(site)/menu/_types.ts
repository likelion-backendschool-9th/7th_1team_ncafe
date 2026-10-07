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

export interface Menu {
  id: number;
  categoryId: number;
  name: string; // 한글명
  engName: string;
  price: number;
  description: string;
  image: string; // /images/menus/xxx.svg
  badge?: MenuBadge;
  status: MenuStatus; // HIDDEN 은 /menu 에 안 보임, SOLD_OUT 은 "품절" 표시
}

/** 등록·수정 폼 값 */
export type MenuInput = Omit<Menu, "id">;
export type CategoryInput = Pick<Category, "name" | "engName" | "visible">;
