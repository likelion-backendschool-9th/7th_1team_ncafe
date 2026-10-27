"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useUser } from "@/components/UserProvider";
import styles from "./menuDetail.module.css";

/**
 * 메뉴 찜 토글(상세 전용) — 찜한 메뉴는 마이페이지 "찜한 메뉴"에 최근 찜한 순으로 모인다.
 * 품절이어도 찜할 수 있다. 토글 버튼이라 글자는 "찜하기" 로 두고, 찜 여부는 채운 하트와 aria-pressed 로 나타낸다.
 * 찜은 서버에 저장되므로 로그인이 필요하다 — 로그아웃 상태에서 누르면 로그인 화면으로 보낸다.
 */
export default function FavoriteButton({ menuId, menuName }: { menuId: number; menuName: string }) {
  const { favorites, toggleFavorite } = useUser();
  const { member } = useAuth();
  const router = useRouter();
  const on = favorites.includes(menuId);

  return (
    <button
      type="button"
      className={`${styles.favorite} ${on ? styles.favoriteOn : ""}`}
      aria-pressed={on}
      title={member ? undefined : "로그인하면 찜할 수 있어요"}
      onClick={() => (member ? toggleFavorite(menuId) : router.push("/login"))}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z"
          fill={on ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        <span className="visually-hidden">{menuName} </span>찜하기
      </span>
    </button>
  );
}
