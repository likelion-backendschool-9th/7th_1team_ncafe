"use client";

import Image from "next/image";
import { recentRanks, TRAIT_LABEL } from "@/app/(site)/race/_lib/records";
import type { Horse, RaceResult } from "@/app/(site)/race/_types";
import Modal from "@/components/Modal";
import adminStyles from "../../_components/admin.module.css";
import type { ToastMessage } from "../../_components/AdminToast";
import { useHorseAdmin } from "../_hooks/useHorseAdmin";
import HorseForm from "./HorseForm";
import styles from "./raceAdmin.module.css";

type Show = (text: string, tone?: ToastMessage["tone"]) => void;

/** 출전마 7마리 — 이미지 · 이름 · 조끼 색 · 성향 · 성격/설명 · 최근 성적 + [수정](모달). 추가 · 삭제는 없다(7마리 고정) */
export default function HorseAdminTable({ horses, history, show }: { horses: Horse[]; history: RaceResult[]; show: Show }) {
  const a = useHorseAdmin(horses, show);

  return (
    <>
      <table className={adminStyles.table}>
        <thead>
          <tr>
            <th scope="col">이미지</th>
            <th scope="col">이름</th>
            <th scope="col">조끼 색</th>
            <th scope="col">주행 성향</th>
            <th scope="col">성격 · 설명</th>
            <th scope="col">최근 성적</th>
            <th scope="col">
              <span className="visually-hidden">관리</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {horses.map((h) => {
            const recent = recentRanks(history, h.id);
            return (
              <tr key={h.id}>
                <td className={adminStyles.cellImage}>
                  <Image src={h.image} alt="" width={72} height={52} className={styles.horseThumb} />
                </td>
                <td data-label="이름" className={adminStyles.cellName}>
                  <div className={adminStyles.nameBlock}>
                    <strong>{h.name.toUpperCase()}</strong>
                    <span>{h.nameKo}</span>
                  </div>
                </td>
                <td data-label="조끼 색">
                  <span className={styles.swatch}>
                    <span className={styles.swatchDot} style={{ background: h.color }} aria-hidden />
                    {h.colorName}
                    <span className={styles.hex}>{h.color}</span>
                  </span>
                </td>
                <td data-label="주행 성향">
                  <span className={styles.traitTag}>{TRAIT_LABEL[h.trait]}</span>
                </td>
                <td data-label="성격 · 설명">
                  <span className={styles.blurb}>
                    <strong>{h.personality}</strong>
                    {h.description}
                  </span>
                </td>
                <td data-label="최근 성적">
                  {recent.length ? (
                    <span className={styles.ranks}>
                      <span className="visually-hidden">최근 경기부터 {recent.map((r) => `${r}위`).join(", ")}</span>
                      {recent.map((r, i) => (
                        <span key={i} className={`${styles.rank} ${r === 1 ? styles.rankWin : ""}`} aria-hidden>
                          {r}위
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span className={adminStyles.dash}>—</span>
                  )}
                </td>
                <td className={adminStyles.cellActions}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => a.open(h)}>
                    수정<span className="visually-hidden"> {h.name.toUpperCase()}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal open={a.editing !== null} onClose={a.close} label="출전마 수정" size="lg" variant="sheet" dismissible={false}>
        {a.editing && (
          <HorseForm key={a.editing.id} horse={a.editing} errors={a.errors} busy={a.busy} onSubmit={a.save} onCancel={a.close} />
        )}
      </Modal>
    </>
  );
}
