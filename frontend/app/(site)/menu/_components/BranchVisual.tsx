"use client";

import Image from "next/image";
import { useBranchMenuStatus } from "../_hooks/useMenuBranch";
import type { Menu } from "../_types";
import styles from "./menuDetail.module.css";

/**
 * 메뉴 상세의 일러스트 — 고른 지점에서 품절이면 그림을 흐리게 하고 품절 도장을 찍는다(판매 상태 줄과 같은 기준).
 * 상세 페이지는 모두에게 같은 내용으로 캐시하므로, 지점 상태는 화면이 뜬 뒤 브라우저에서 받아 바꾼다.
 */
export default function BranchVisual({ menu }: { menu: Menu }) {
  const { status } = useBranchMenuStatus(menu);
  const soldOut = status === "SOLD_OUT";

  return (
    <div className={`${styles.visual} ${soldOut ? styles.visualSoldOut : ""}`}>
      <Image src={menu.image} alt="" width={240} height={240} loading="eager" className={styles.visualImg} />
      {soldOut && (
        <span className={styles.stamp}>
          품절
          <small>SOLD OUT</small>
        </span>
      )}
    </div>
  );
}
