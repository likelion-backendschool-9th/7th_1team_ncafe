import type { RaceEventMessage as Message } from "../_types";
import styles from "./race.module.css";

/**
 * 경주 중 이벤트 토스트 — 트랙 상단 가운데에 1.5초 보였다 사라진다(한 번에 하나, 순서는 useRaceRun 의 큐).
 * key 를 메시지 id 로 두어 새 메시지마다 등장 애니메이션이 다시 돈다.
 */
export default function RaceEventMessage({ message }: { message: Message | null }) {
  return (
    <div className={styles.toastArea} role="status" aria-live="polite">
      {message && (
        <p key={message.id} className={styles.toast}>
          {message.text}
        </p>
      )}
    </div>
  );
}
