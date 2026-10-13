"use client";

import HorseAvatar from "@/components/HorseAvatar";
import Scoreboard from "@/components/Scoreboard";
import { useUser } from "@/components/UserProvider";
import { formatDate, serial } from "../_lib/format";
import type { UserProfile } from "../_types";
import styles from "./my.module.css";

/**
 * 내 정보 + 요약 — 위는 Mock 프로필, 절취선 아래는 쿠폰 · 찜 · 주문 수 전광판.
 * 숫자 칸을 누르면 같은 페이지의 해당 섹션으로 내려간다.
 */
export default function MyOverview({ profile }: { profile: UserProfile }) {
  const { coupons, favorites, orders } = useUser();

  const stats = [
    { href: "#coupons", label: "보유 쿠폰", value: coupons, unit: "장" },
    { href: "#favorites", label: "찜한 메뉴", value: favorites.length, unit: "개" },
    { href: "#orders", label: "주문 내역", value: orders.length, unit: "건" },
  ];

  return (
    <section className={styles.overview} aria-labelledby="my-info-title">
      <div className={styles.profile}>
        <HorseAvatar color="#c98a3a" number={profile.memberNo} emblem="☕" size={88} />
        <div className={styles.profileText}>
          <span className={styles.memberNo}>MEMBER No.{serial(profile.memberNo)}</span>
          <h2 id="my-info-title" className={styles.nickname}>
            {profile.nickname}
            <span className={styles.nicknameSuffix}>님</span>
          </h2>
          <p className={styles.profileMeta}>
            {formatDate(profile.joinedAt)} 가입 · 로그인 기능이 생기면 내 정보를 바꿀 수 있어요
          </p>
        </div>
      </div>

      <ul className={styles.stats}>
        {stats.map((s) => (
          <li key={s.href}>
            <a href={s.href} className={styles.stat}>
              <span className={styles.statLabel}>{s.label}</span>
              <span className={styles.statValue}>
                <Scoreboard value={serial(s.value, 2)} size="md" label={`${s.label} ${s.value}${s.unit}`} />
                <span className={styles.statUnit} aria-hidden>
                  {s.unit}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
