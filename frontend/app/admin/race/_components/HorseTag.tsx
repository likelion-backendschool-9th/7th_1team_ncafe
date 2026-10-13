import { textOn } from "@/app/(site)/race/_lib/records";
import type { Horse } from "@/app/(site)/race/_types";
import styles from "./raceAdmin.module.css";

/** 관리자 표의 말 표시 — 그 경주의 게이트 번호 점(조끼 색) + 이름. 말 정보가 없으면 id 만 */
export default function HorseTag({ horse, gate, id }: { horse: Horse | undefined; gate: number | undefined; id: number }) {
  if (!horse) return <span className={styles.horseTag}>말 #{id}</span>;
  return (
    <span className={styles.horseTag}>
      <span className={styles.gateDot} style={{ background: horse.color, color: textOn(horse.color) }} aria-hidden>
        {gate ?? "–"}
      </span>
      {gate !== undefined && <span className="visually-hidden">{gate}번 </span>}
      {horse.name.toUpperCase()}
    </span>
  );
}
