"use client";

import Link from "next/link";
import { useEffect, useId, useState, useSyncExternalStore, type SubmitEvent } from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatRaceDate } from "@/lib/time";
import adminStyles from "../../_components/admin.module.css";
import AdminToast, { useToast } from "../../_components/AdminToast";
import {
  LOSING_STREAK_LIMITS,
  losingStreakStore,
  parseLosingStreak,
  updateLosingStreak,
  type LosingStreakAdmin,
  type LosingStreakErrors,
  type LosingStreakField,
} from "../_lib/losingStreak";
import styles from "./couponAdmin.module.css";

type Draft = Record<LosingStreakField, string> & { enabled: boolean };

const toDraft = (p: LosingStreakAdmin): Draft => ({
  enabled: p.enabled,
  loseStreak: String(p.loseStreak),
  coupons: String(p.coupons),
  delayMinutes: String(p.delayMinutes),
});

/**
 * 쿠폰 관리 화면 — 연패 위로 쿠폰(사용자 결정 2026-10-27): 정책(몇 연패 · 몇 장 · 몇 분 뒤 · 사용 여부) · 지급 예정 · 지급 내역.
 * 값은 서버(GET · PUT /api/v1/admin/coupons/losing-streak)에 저장하고, 지급은 서버 스케줄러가 한다. ADMIN 으로 로그인해야 쓸 수 있다.
 */
export default function CouponAdmin() {
  const { member, loaded } = useAuth();

  return (
    <>
      <header className={adminStyles.pageHead}>
        <div>
          <span className="eyebrow">Coupon Management</span>
          <h1 className={adminStyles.pageTitle}>쿠폰 관리</h1>
          <p className="subtitle">연패 위로 쿠폰의 지급 조건을 정하고, 지급 예정 · 지급 내역을 확인합니다.</p>
        </div>
      </header>

      {member?.role === "ADMIN" ? (
        <LosingStreakManager key={member.no} />
      ) : (
        loaded && (
          <div className={adminStyles.empty}>
            <p>{member ? "관리자 계정만 쿠폰을 관리할 수 있어요." : "관리자 계정으로 로그인해야 쿠폰을 관리할 수 있어요."}</p>
            <Link href={`/login?next=${encodeURIComponent("/admin/coupons")}`} className="btn btn-outline btn-sm">
              {member ? "다른 계정으로 로그인" : "로그인"}
            </Link>
          </div>
        )
      )}
    </>
  );
}

function LosingStreakManager() {
  const { data, loaded, error } = useSyncExternalStore(losingStreakStore.subscribe, losingStreakStore.get, losingStreakStore.getServer);
  const [draft, setDraft] = useState<Draft | null>(null); // null = 서버 값 그대로
  const [errors, setErrors] = useState<LosingStreakErrors>({});
  const [busy, setBusy] = useState(false);
  const { toast, show } = useToast();
  const uid = useId();

  // 들어올 때마다 새로 불러온다
  useEffect(() => {
    void losingStreakStore.refresh();
  }, []);

  if (!data) {
    return (
      <p className={error ? adminStyles.error : adminStyles.note} role={error ? "alert" : "status"}>
        {error ? `연패 위로 쿠폰 설정을 불러오지 못했어요 — ${error.message}` : loaded ? "설정이 없어요." : "불러오는 중이에요…"}
      </p>
    );
  }

  const form = draft ?? toDraft(data);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft({ ...form, [key]: value });
    if (key !== "enabled") setErrors((prev) => ({ ...prev, [key]: undefined }));
  };
  const parsed = parseLosingStreak(form);
  const valid = Object.keys(parsed.errors).length === 0;
  const reset = () => {
    setDraft(null);
    setErrors({});
  };

  async function save(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (!valid) {
      setErrors(parsed.errors);
      return;
    }
    setBusy(true);
    try {
      await updateLosingStreak({ ...parsed.value, enabled: form.enabled });
      await losingStreakStore.refresh();
      setDraft(null);
      setErrors({});
      show("연패 위로 쿠폰 설정을 저장했어요.");
    } catch (err) {
      show(err instanceof ApiError ? err.message : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.", "error");
    } finally {
      setBusy(false);
    }
  }

  const field = (key: LosingStreakField, label: string, unit: string, hint: string) => {
    const { min, max } = LOSING_STREAK_LIMITS[key];
    const id = `${uid}-${key}`;
    return (
      <div className={adminStyles.field}>
        <label htmlFor={id} className={adminStyles.label}>
          {label}
        </label>
        <span className={styles.unitInput}>
          <input
            id={id}
            type="number"
            inputMode="numeric"
            min={min}
            max={max}
            step={1}
            className={adminStyles.input}
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
            aria-invalid={errors[key] ? true : undefined}
            aria-describedby={`${id}-help`}
          />
          <span aria-hidden>{unit}</span>
        </span>
        <span id={`${id}-help`} className={errors[key] ? adminStyles.error : adminStyles.hint}>
          {errors[key] ?? `${hint} (${min}~${max})`}
        </span>
      </div>
    );
  };

  return (
    <>
      <section className={styles.section} aria-labelledby={`${uid}-policy`}>
        <div className={styles.sectionHead}>
          <h2 id={`${uid}-policy`} className={styles.sectionTitle}>
            연패 위로 쿠폰
          </h2>
          <p className={styles.sectionDesc}>마지막 수정 {formatRaceDate(data.updatedTime)}</p>
        </div>

        <form className={styles.policy} onSubmit={save} noValidate>
          <div className={styles.switchRow}>
            <button
              type="button"
              role="switch"
              aria-checked={form.enabled}
              aria-labelledby={`${uid}-enabled`}
              className={adminStyles.switch}
              onClick={() => set("enabled", !form.enabled)}
            >
              <span className={adminStyles.switchKnob} aria-hidden />
              <span className={adminStyles.switchText}>{form.enabled ? "ON" : "OFF"}</span>
            </button>
            <span id={`${uid}-enabled`} className={adminStyles.label}>
              위로 쿠폰 지급 {form.enabled ? "사용" : "사용 안 함"}
            </span>
          </div>

          <div className={styles.policyGrid}>
            {field("loseStreak", "연패 수", "연패 이상", "3위 밖(4~7위)으로 연속해서 들어온 경주 수")}
            {field("coupons", "지급 장수", "장", "한 번에 주는 쿠폰 수")}
            {field("delayMinutes", "지급 시점", "분 뒤", "마지막 경주가 끝나고(정산) 지급까지")}
          </div>

          <p className={styles.summary} aria-live="polite">
            {!form.enabled
              ? "지금은 위로 쿠폰을 주지 않아요. 켜면 아래 조건으로 다시 지급해요."
              : valid
                ? `${parsed.value.loseStreak}연패 이상이고 쿠폰이 0장인 회원에게, 마지막 경주가 끝나고 ${parsed.value.delayMinutes}분 뒤 쿠폰 ${parsed.value.coupons}장을 줘요. 연패 한 번에 한 번만 주고, 3위 안에 들면 다시 대상이 돼요.`
                : "입력값을 확인해 주세요."}
          </p>

          <div className={styles.actions}>
            <button type="button" className="btn btn-outline" onClick={reset} disabled={busy || draft === null}>
              되돌리기
            </button>
            <button type="submit" className="btn btn-gold" disabled={busy || draft === null}>
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>
        </form>
      </section>

      <section className={styles.section} aria-labelledby={`${uid}-pending`}>
        <div className={styles.sectionHead}>
          <h2 id={`${uid}-pending`} className={styles.sectionTitle}>
            지급 예정
          </h2>
          <p className={styles.sectionDesc}>지금 조건을 채운 회원 — 지급 시각이 되면 서버가 줘요. 그 전에 쿠폰이 생기거나 다시 걸면 빠져요.</p>
        </div>
        {data.pending.length === 0 ? (
          <div className={adminStyles.empty}>
            <p>{data.enabled ? "지급을 기다리는 회원이 없어요." : "위로 쿠폰이 꺼져 있어요."}</p>
          </div>
        ) : (
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th scope="col">회원</th>
                <th scope="col">연패</th>
                <th scope="col">마지막 경주</th>
                <th scope="col">지급 예정</th>
              </tr>
            </thead>
            <tbody>
              {data.pending.map((p) => (
                <tr key={p.memberNo}>
                  <td data-label="회원">
                    <MemberCell nickname={p.nickname} loginId={p.loginId} />
                  </td>
                  <td data-label="연패" className="font-board">
                    {p.loseStreak}연패
                  </td>
                  <td data-label="마지막 경주" className="font-board">
                    {p.raceNo !== null ? `Race #${p.raceNo}` : "—"}
                  </td>
                  <td data-label="지급 예정" className="font-board">
                    {formatRaceDate(p.dueTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={styles.section} aria-labelledby={`${uid}-grants`}>
        <div className={styles.sectionHead}>
          <h2 id={`${uid}-grants`} className={styles.sectionTitle}>
            지급 내역
          </h2>
          <p className={styles.sectionDesc}>최근 100건 · 쿠폰 내역(coupons_log)에 남은 위로 쿠폰</p>
        </div>
        {data.grants.length === 0 ? (
          <div className={adminStyles.empty}>
            <p>아직 지급한 위로 쿠폰이 없어요.</p>
          </div>
        ) : (
          <table className={adminStyles.table}>
            <thead>
              <tr>
                <th scope="col">지급 시각</th>
                <th scope="col">회원</th>
                <th scope="col">장수</th>
                <th scope="col">내용</th>
              </tr>
            </thead>
            <tbody>
              {data.grants.map((g) => (
                <tr key={g.id}>
                  <td data-label="지급 시각" className="font-board">
                    {formatRaceDate(g.createdDate)}
                  </td>
                  <td data-label="회원">
                    <MemberCell nickname={g.nickname} loginId={g.loginId} />
                  </td>
                  <td data-label="장수" className="font-board">
                    +{g.coupons}장
                  </td>
                  <td data-label="내용">{g.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <AdminToast toast={toast} />
    </>
  );
}

function MemberCell({ nickname, loginId }: { nickname: string; loginId: string }) {
  return (
    <span className={adminStyles.nameBlock}>
      <strong>{nickname}</strong>
      <span>{loginId}</span>
    </span>
  );
}
