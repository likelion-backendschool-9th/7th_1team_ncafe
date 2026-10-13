"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import RacePhaseBadge from "@/components/RacePhaseBadge";
import Scoreboard from "@/components/Scoreboard";
import { formatCountdown, RACE_GATE_CLOSE_MS, RACE_SOON_MS } from "@/lib/time";
import { useNow } from "@/lib/useCountdown";
import { finishedFrame, lineupFrame, useRaceRun } from "../_hooks/useRace";
import { payoutSummary } from "../_lib/payout";
import { byGate, textOn } from "../_lib/records";
import { TrackScene, type SceneHorse } from "../_lib/trackScene";
import type { Gates, Horse, RaceStage } from "../_types";
import GateBadge from "./GateBadge";
import RaceEventMessage from "./RaceEventMessage";
import styles from "./race.module.css";

/** HUD 의 남은 거리(m) 환산용 트랙 길이 */
const COURSE_M = 1200;
/** 출발 직후 "GO!" 를 보여 주는 시간 */
const GO_FLASH_MS = 800;

interface HorseTrackProps {
  horses: Horse[]; // 말 id 순 — 시뮬레이션에 이 순서 그대로 넘긴다(바꾸면 순위가 달라진다)
  gates: Gates; // 이 무대 경주의 게이트 번호 — 배지 · 원근 줄 · 문구
  stage: RaceStage;
  headingId: string;
}

/**
 * 트랙 무대(WAIT · RUNNING · FINISHED) — 머리띠(상태 · 내 말 또는 관람 · 출발까지 남은 시간) + 경기 화면(PixiJS 캔버스) + 하단 HUD(순위 · 남은 거리).
 * BLUEPRINT 8.2 화면 구성 3-1 · 4. 출발은 버튼이 아니라 경주 시각(stage.startedAt)에 모두 함께다.
 * 캔버스는 보일 때마다 만들고(Activity 로 숨겨지면 effect 정리로 지운다) 매 프레임은 useRaceRun 이 직접 그린다.
 * 카운트다운 · 토스트는 캔버스 위에 DOM 으로 겹친다(사용자 결정: 경기 화면만 캔버스).
 * 말은 게이트 번호 순으로 줄을 서고(1번이 맨 뒤 줄) 번호 배지 · HUD · 문구도 그 경주의 게이트 번호다.
 */
export default function HorseTrack({ horses, gates, stage, headingId }: HorseTrackProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TrackScene | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const now = useNow();
  const { frame, message } = useRaceRun(horses, stage, sceneRef);
  const { kind, raceNo, startedAt, bet, result } = stage;
  const myHorse = bet ? (horses.find((h) => h.id === bet.horseId) ?? null) : null;

  // 장면은 이 값이 바뀔 때만 다시 만든다. 게이트 표는 경주가 끝나는 순간 내용은 같아도 새 객체가 되므로(useRace — 출전표 경주가 넘어간다)
  // 내용(말 id 순의 번호들)을 문자열로 비교한다 — 그러지 않으면 결승 직후 캔버스가 한 번 지워졌다 다시 그려진다.
  const gateKey = horses.map((h) => gates[h.id]).join(",");
  const sceneHorses = useMemo<SceneHorse[]>(() => {
    const numbers = gateKey.split(",").map(Number);
    return horses
      .map((h, i) => ({ id: h.id, gate: numbers[i], image: h.image, color: h.color, textColor: textOn(h.color), mine: h.id === myHorse?.id }))
      .sort((a, b) => a.gate - b.gate);
  }, [horses, gateKey, myHorse?.id]);

  // 루프가 돌지 않을 때(출발 전 · 끝난 뒤) 장면에 보여 줄 프레임 — RUNNING 중에는 루프가 매 프레임 직접 넘긴다.
  // 끝난 경주인데 끝까지 본 스냅샷이 없으면(직접 보지 않았거나, 탭이 뒤에 있어 rAF 가 멈췄거나, 다시 마운트됨) 확정 순위로 결승선 장면을 만든다.
  // 출발선 프레임의 순위(HUD)는 게이트 번호 순.
  const staticFrame = useMemo(() => {
    if (kind === "FINISHED" && result && frame?.doneAt == null) return finishedFrame(horses, result.ranking);
    return frame ?? lineupFrame(byGate(horses, gates));
  }, [frame, kind, result, horses, gates]);
  const staticFrameRef = useRef(staticFrame);
  useEffect(() => {
    staticFrameRef.current = staticFrame;
    if (kind !== "RUNNING") sceneRef.current?.update(staticFrame);
  }, [staticFrame, kind]);

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
    kind !== "FINISHED" && elapsed !== null && elapsed < GO_FLASH_MS && elapsed > Number.NEGATIVE_INFINITY
      ? elapsed < 0
        ? String(Math.ceil(-elapsed / 1000))
        : "GO!"
      : null;
  const remaining = Math.max(0, Math.round((1 - leader) * COURSE_M));
  const untilStart = now === null ? null : startedAt - now;
  const soon = untilStart !== null && untilStart <= RACE_SOON_MS;
  const myRank = myHorse ? order.indexOf(myHorse.id) + 1 : 0;
  const gateLabel = (h: Horse) => `${gates[h.id]}번 ${h.name.toUpperCase()}`;
  const myLabel = myHorse ? gateLabel(myHorse) : "";
  const byId = (id: number) => horses.find((h) => h.id === id) ?? horses[0];
  const leaderHorse = byId(order[0]);

  // 머리띠 문구 — 단계 × 참여 여부
  let label: React.ReactNode;
  let title: string;
  let note: string;
  if (kind === "WAIT") {
    const left = untilStart === null ? "--:--:--" : formatCountdown(untilStart);
    if (bet) {
      label = (
        <>
          READY · 게이트 입장 완료 {soon && <RacePhaseBadge phase="SOON" />}
        </>
      );
      title = `Race #${raceNo} · ${myLabel}에 쿠폰 1장을 걸었어요`;
      note = `출발까지 ${left} · ${payoutSummary()} 돌려받기 — 4위 이하면 돌아오지 않아요.`;
    } else if (stage.gateClosed) {
      label = <>SPECTATOR · 마감 {soon && <RacePhaseBadge phase="SOON" />}</>;
      title = `Race #${raceNo} · 곧 출발합니다`;
      note = "이번 경주는 관람만 할 수 있어요. 끝나면 다음 경주에 걸 수 있어요.";
    } else {
      label = <>SPECTATOR · 관람 대기 {soon && <RacePhaseBadge phase="SOON" />}</>;
      title = `Race #${raceNo} · 출발까지 ${left}`;
      note = `지금 말을 고르면 참여할 수 있어요 — 출발 ${RACE_GATE_CLOSE_MS / 1000}초 전 마감.`;
    }
  } else if (kind === "RUNNING") {
    label = (
      <>
        NOW RACING <RacePhaseBadge phase="LIVE" />
      </>
    );
    const beforeGo = elapsed === null || elapsed < 0;
    title = bet ? `Race #${raceNo} · ${myLabel} 응원 중` : `Race #${raceNo} · 관람 중`;
    note = beforeGo ? "곧 출발합니다" : bet ? `현재 ${myRank}위` : `선두 ${gateLabel(leaderHorse)}`;
  } else {
    label = "FINISH · 경주 종료";
    title = bet ? `Race #${raceNo} · ${myLabel} ${myRank}위로 들어왔어요` : `Race #${raceNo} · 1위 ${gateLabel(leaderHorse)}`;
    note = bet ? "아래에서 순위를 확인하세요." : "다음 경주 출전표가 열렸어요.";
  }

  return (
    <section className={styles.stage} aria-labelledby={headingId}>
      <div className={styles.stageHead}>
        <div className={styles.stageText}>
          <span className={styles.stageLabel}>{label}</span>
          <h2 id={headingId} tabIndex={-1} className={styles.stageTitle}>
            {title}
          </h2>
          <p className={styles.stageNote}>{note}</p>
        </div>
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
            const mine = id === myHorse?.id;
            return (
              <li key={id} className={`${styles.hudSlot} ${i < 3 ? styles.hudTop : ""} ${mine ? styles.hudMine : ""}`}>
                <span className={styles.hudRank} aria-hidden>
                  {i + 1}
                </span>
                <GateBadge horse={horse} gate={gates[horse.id]} size="sm" />
                <span className="visually-hidden">
                  {i + 1}위 {gateLabel(horse)}
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
