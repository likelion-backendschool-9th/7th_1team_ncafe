"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RacePhaseBadge from "@/components/RacePhaseBadge";
import Scoreboard from "@/components/Scoreboard";
import { useRaceSession } from "@/components/RaceProvider";
import { finishedFrame, lineupFrame, useRaceRun } from "../_hooks/useRace";
import { payoutSummary } from "../_lib/payout";
import { textOn } from "../_lib/records";
import { TrackScene, type SceneHorse } from "../_lib/trackScene";
import type { Horse, RacePhase } from "../_types";
import GateBadge from "./GateBadge";
import RaceEventMessage from "./RaceEventMessage";
import styles from "./race.module.css";

/** HUD 의 남은 거리(m) 환산용 트랙 길이 */
const COURSE_M = 1200;
/** 출발 직후 "GO!" 를 보여 주는 시간 */
const GO_FLASH_MS = 800;

interface HorseTrackProps {
  horses: Horse[];
  raceNo: number;
  myHorse: Horse;
  phase: RacePhase;
  headingId: string;
  onStart: () => void;
}

/**
 * 트랙 무대(READY · RUNNING · FINISHED) — 머리띠(상태 · 내 말 · [경주 시작]) + 경기 화면(PixiJS 캔버스) + 하단 HUD(순위 · 남은 거리).
 * BLUEPRINT 8.2 화면 구성 3-1 · 4. 7단계의 출발 대기 패널을 이것으로 바꿨다.
 * 캔버스는 보일 때마다 만들고(Activity 로 숨겨지면 effect 정리로 지운다) 매 프레임은 useRaceRun 이 직접 그린다.
 * 카운트다운 · 토스트는 캔버스 위에 DOM 으로 겹친다(사용자 결정: 경기 화면만 캔버스).
 */
export default function HorseTrack({ horses, raceNo, myHorse, phase, headingId, onStart }: HorseTrackProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TrackScene | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const { ranking } = useRaceSession();
  const { frame, message } = useRaceRun(horses, raceNo, sceneRef);

  const sceneHorses = useMemo<SceneHorse[]>(
    () => horses.map((h) => ({ id: h.id, image: h.image, color: h.color, textColor: textOn(h.color), mine: h.id === myHorse.id })),
    [horses, myHorse.id],
  );

  // READY · FINISHED(루프가 돌지 않을 때) 장면에 보여 줄 프레임 — RUNNING 중에는 루프가 매 프레임 직접 넘긴다.
  // FINISHED 인데 스냅샷이 없으면(페이지가 다시 마운트됨) 확정 순위로 결승선 장면을 만든다.
  const staticFrame = useMemo(
    () => frame ?? (phase === "FINISHED" && ranking ? finishedFrame(horses, ranking) : lineupFrame(horses)),
    [frame, phase, ranking, horses],
  );
  const staticFrameRef = useRef(staticFrame);
  useEffect(() => {
    staticFrameRef.current = staticFrame;
    if (phase !== "RUNNING") sceneRef.current?.update(staticFrame);
  }, [staticFrame, phase]);

  // 장면 만들기 — WebGL 을 쓸 수 없으면 안내 문구(순위는 HUD 로 계속 볼 수 있다)
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let created: TrackScene | null = null;
    TrackScene.create(host, sceneHorses)
      .then((scene) => {
        if (cancelled) {
          scene.destroy();
          return;
        }
        created = scene;
        sceneRef.current = scene;
        scene.update(staticFrameRef.current);
      })
      .catch(() => {
        if (!cancelled) setSceneFailed(true);
      });
    return () => {
      cancelled = true;
      sceneRef.current = null;
      created?.destroy();
    };
  }, [sceneHorses]);

  const order = staticFrame.order;
  const leader = staticFrame.leader;
  const elapsed = frame?.elapsed ?? null;
  const countdown =
    phase === "RUNNING" && elapsed !== null && elapsed < GO_FLASH_MS ? (elapsed < 0 ? String(Math.ceil(-elapsed / 1000)) : "GO!") : null;
  const remaining = Math.max(0, Math.round((1 - leader) * COURSE_M));
  const myRank = order.indexOf(myHorse.id) + 1;
  const myLabel = `${myHorse.id}번 ${myHorse.name.toUpperCase()}`;
  const byId = (id: number) => horses.find((h) => h.id === id) ?? myHorse;

  return (
    <section className={styles.stage} aria-labelledby={headingId}>
      <div className={styles.stageHead}>
        <div className={styles.stageText}>
          <span className={styles.stageLabel}>
            {phase === "READY" && (
              <>
                READY · 게이트 입장 완료 <RacePhaseBadge phase="SOON" />
              </>
            )}
            {phase === "RUNNING" && (
              <>
                NOW RACING <RacePhaseBadge phase="LIVE" />
              </>
            )}
            {phase === "FINISHED" && "FINISH · 경주 종료"}
          </span>
          <h2 id={headingId} tabIndex={-1} className={styles.stageTitle}>
            Race #{raceNo} ·{" "}
            {phase === "READY" && `${myLabel}에 쿠폰 1장을 걸었어요`}
            {phase === "RUNNING" && `${myLabel} 응원 중`}
            {phase === "FINISHED" && `${myLabel} ${myRank}위로 들어왔어요`}
          </h2>
          <p className={styles.stageNote}>
            {phase === "READY" && `${payoutSummary()} 돌려받기 — 4위 이하면 돌아오지 않아요.`}
            {phase === "RUNNING" && (elapsed !== null && elapsed < 0 ? "곧 출발합니다" : `현재 ${myRank}위`)}
            {phase === "FINISHED" && "결과를 정리하고 있어요."}
          </p>
        </div>
        {phase === "READY" && (
          <div className={styles.stageAction}>
            <button type="button" className="btn btn-gold" onClick={onStart}>
              경주 시작
            </button>
            <span className={styles.stageHint}>누르면 3초 뒤 출발해요</span>
          </div>
        )}
      </div>

      <div className={styles.field}>
        <div ref={hostRef} className={styles.fieldCanvas} aria-hidden />
        {sceneFailed && <p className={styles.fieldFallback}>이 브라우저에서는 경기 화면을 그릴 수 없어요. 아래 순위로 경주를 따라가 주세요.</p>}
        {countdown && (
          <div className={styles.count} aria-hidden>
            <span key={countdown} className={styles.countNum}>
              {countdown}
            </span>
          </div>
        )}
        <RaceEventMessage message={message} />
      </div>

      <div className={styles.hud}>
        <div className={styles.hudBlock}>
          <span className={styles.hudLabel}>RACE</span>
          <strong className={styles.hudValue}>#{raceNo}</strong>
        </div>
        <ol className={styles.hudOrder} aria-label="현재 순위">
          {order.map((id, i) => {
            const horse = byId(id);
            const mine = id === myHorse.id;
            return (
              <li key={id} className={`${styles.hudSlot} ${i < 3 ? styles.hudTop : ""} ${mine ? styles.hudMine : ""}`}>
                <span className={styles.hudRank} aria-hidden>
                  {i + 1}
                </span>
                <GateBadge horse={horse} size="sm" />
                <span className="visually-hidden">
                  {i + 1}위 {horse.id}번 {horse.name.toUpperCase()}
                  {mine && " (내 말)"}
                </span>
              </li>
            );
          })}
        </ol>
        <div className={styles.hudBlock}>
          <span className={styles.hudLabel}>REMAINING</span>
          <span className={styles.hudDistance}>
            <Scoreboard value={String(remaining).padStart(4, "0")} size="sm" onDark label={`결승까지 ${remaining}m`} />
            <span className={styles.hudUnit} aria-hidden>
              m
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
