"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RaceEventMessage from "../_components/RaceEventMessage";
import raceStyles from "../_components/race.module.css";
import { HORSES } from "../_data/horses";
import { lineupFrame, type RaceFrame } from "../_hooks/useRace";
import { messageFor } from "../_lib/messages";
import { TRAIT_LABEL, textOn } from "../_lib/records";
import { advanceTo, BASE_FINISH_MS, createRace, leaderProgress, liveOrder, RACE_MAX_MS, step } from "../_lib/simulation";
import { cameraFor, COURSE, TrackScene, type SceneHorse } from "../_lib/trackScene";
import type { RaceEventMessage as Message, RaceEventType, RaceRun } from "../_types";
import styles from "./lab.module.css";

const SPEEDS = [0.25, 0.5, 1, 2, 4];
const COUNTDOWN_MS = 3000;
const TOAST_MS = 1500;
const UI_INTERVAL_MS = 100;
const STEP_MS = 50;
const NAMES = (id: number) => HORSES.find((h) => h.id === id)?.name.toUpperCase() ?? String(id);

/** simulation.ts 의 EVENT_EFFECT 와 같은 값 — 강제 발생 버튼용 */
const FORCE = {
  BOOST: { multiplier: 1.35, durationMs: 1000 },
  SLOW: { multiplier: 0.7, durationMs: 800 },
  STUMBLE: { multiplier: 0.4, durationMs: 500 },
  SPURT: { multiplier: 1.3, durationMs: 1200 },
} as const;
type ForceType = keyof typeof FORCE;
const FORCE_TYPES = Object.keys(FORCE) as ForceType[];

/** 시드 고정 난수(mulberry32) — 같은 시드면 같은 경주가 나와 되감기 · 비교가 된다 */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toFrame(run: RaceRun): RaceFrame {
  return {
    elapsed: run.elapsed,
    leader: leaderProgress(run.runners),
    runners: run.runners.map((r) => ({ horseId: r.horseId, progress: r.progress, finishedAt: r.finishedAt })),
    running: run.elapsed >= 0 && run.doneAt === null,
    order: liveOrder(run.runners),
    doneAt: run.doneAt,
  };
}

interface Snapshot {
  run: RaceRun | null;
  log: Message[];
  toast: Message | null;
}

/**
 * 경주 실험실 — RaceProvider · 쿠폰 없이 simulation.ts + TrackScene 을 직접 돌린다.
 * 실제 /race 의 Date.now 기준 시계 대신 "실제 경과 × 배속"의 가상 시계를 쓰므로 느리게 · 빠르게 · 한 스텝씩 · 되감기가 된다.
 */
export default function RaceLab() {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TrackScene | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);

  const [seed, setSeed] = useState(1234);
  const [speed, setSpeed] = useState(1);
  const [withCountdown, setWithCountdown] = useState(true);
  const [myId, setMyId] = useState(3);
  const [playing, setPlaying] = useState(false);

  // 시뮬레이션 상태는 매 프레임 바뀌므로 ref, 화면용 스냅샷은 100ms 마다
  const runRef = useRef<RaceRun | null>(null);
  const rngRef = useRef<() => number>(Math.random);
  const logRef = useRef<Message[]>([]);
  const playingRef = useRef(false);
  const speedRef = useRef(speed);
  const [snap, setSnap] = useState<Snapshot>({ run: null, log: [], toast: null });

  const sceneHorses = useMemo<SceneHorse[]>(
    () => HORSES.map((h) => ({ id: h.id, image: h.image, color: h.color, textColor: textOn(h.color), mine: h.id === myId })),
    [myId],
  );

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const publish = useCallback(() => {
    const run = runRef.current;
    const log = logRef.current;
    const last = log[log.length - 1];
    const toast = run && last && run.elapsed - last.at < TOAST_MS ? last : null;
    setSnap({ run, log: [...log], toast });
  }, []);

  const draw = useCallback(() => {
    const run = runRef.current;
    sceneRef.current?.update(run ? toFrame(run) : lineupFrame(HORSES));
  }, []);

  const setPlay = useCallback((v: boolean) => {
    playingRef.current = v;
    setPlaying(v);
  }, []);

  /** 처음부터 다시 — 같은 시드면 같은 경주 */
  const restart = useCallback(
    (autoplay: boolean) => {
      const rng = seeded(seed);
      rngRef.current = rng;
      const created = createRace(HORSES, 1, 0, rng);
      runRef.current = { ...created, elapsed: withCountdown ? -COUNTDOWN_MS : 0 };
      logRef.current = [];
      setPlay(autoplay);
      draw();
      publish();
    },
    [seed, withCountdown, setPlay, draw, publish],
  );

  /** 시각 t(ms)로 이동 — 같은 시드로 처음부터 다시 계산한다(강제 발생시킨 이벤트는 반영되지 않는다) */
  const seekTo = useCallback(
    (t: number) => {
      const rng = seeded(seed);
      rngRef.current = rng;
      const created = createRace(HORSES, 1, 0, rng);
      const start = { ...created, elapsed: withCountdown ? -COUNTDOWN_MS : 0 };
      const { run, events } = advanceTo(start, t, rng, NAMES);
      runRef.current = run;
      logRef.current = events;
      setPlay(false);
      draw();
      publish();
    },
    [seed, withCountdown, setPlay, draw, publish],
  );

  const stepOnce = useCallback(() => {
    if (!runRef.current) restart(false);
    const run = runRef.current;
    if (!run) return;
    const result = step(run, STEP_MS, rngRef.current, NAMES);
    runRef.current = result.run;
    logRef.current = [...logRef.current, ...result.events];
    setPlay(false);
    draw();
    publish();
  }, [restart, setPlay, draw, publish]);

  const force = useCallback(
    (type: ForceType) => {
      const run = runRef.current;
      if (!run) return;
      const effect = FORCE[type];
      runRef.current = {
        ...run,
        runners: run.runners.map((r) =>
          r.horseId === myId && r.finishedAt === null
            ? { ...r, modifier: effect.multiplier, modifierUntil: run.elapsed + effect.durationMs, spurted: type === "SPURT" ? true : r.spurted }
            : r,
        ),
      };
      const msg: Message = {
        id: `force-${run.elapsed}`,
        horseId: myId,
        type: type as RaceEventType,
        text: messageFor(type as RaceEventType, NAMES(myId)),
        at: run.elapsed,
      };
      logRef.current = [...logRef.current, msg];
      draw();
      publish();
    },
    [myId, draw, publish],
  );

  // 장면 만들기(HorseTrack 과 같은 방식) — 내 말이 바뀌면 다시 만든다
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
        const run = runRef.current;
        scene.update(run ? toFrame(run) : lineupFrame(HORSES));
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

  // 가상 시계 rAF 루프 — 실제 경과 × 배속만큼 진행(탭이 멈췄다 오면 한 번에 100ms 까지만)
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      const dt = Math.min(100, now - prev);
      prev = now;
      const run = runRef.current;
      if (playingRef.current && run) {
        const target = run.elapsed + dt * speedRef.current;
        const { run: next, events } = advanceTo(run, target, rngRef.current, NAMES);
        runRef.current = next;
        if (events.length) logRef.current = [...logRef.current, ...events];
        sceneRef.current?.update(toFrame(next));
        const ended = next.doneAt !== null && next.elapsed - next.doneAt >= 1500;
        if (ended) {
          playingRef.current = false;
          setPlaying(false);
        }
        if (ended || events.length || now - lastUi >= UI_INTERVAL_MS) {
          lastUi = now;
          publish();
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [publish]);

  const { run, log, toast } = snap;
  const frame = run ? toFrame(run) : null;
  const leader = frame?.leader ?? 0;
  const elapsed = run?.elapsed ?? 0;
  const countNum = run && run.elapsed < 0 ? String(Math.ceil(-run.elapsed / 1000)) : run && run.elapsed < 800 ? "GO!" : null;
  const order = frame?.order ?? HORSES.map((h) => h.id);
  const finished = run?.doneAt != null;
  const scrubMin = withCountdown ? -COUNTDOWN_MS : 0;
  const positions = run?.runners.map((r) => r.progress) ?? [0];
  const gap = (Math.max(...positions) - Math.min(...positions)) * 100;

  return (
    <div className={styles.lab}>
      <section className={raceStyles.stage} aria-label="경기 화면">
        <div className={raceStyles.field}>
          <div ref={hostRef} className={raceStyles.fieldCanvas} aria-hidden />
          {sceneFailed && <p className={raceStyles.fieldFallback}>WebGL 을 쓸 수 없어 경기 화면을 그리지 못했어요.</p>}
          {countNum && (
            <div className={raceStyles.count} aria-hidden>
              <span key={countNum} className={raceStyles.countNum}>
                {countNum}
              </span>
            </div>
          )}
          <RaceEventMessage message={toast} />
        </div>
        <div className={styles.timeline}>
          <input
            type="range"
            min={scrubMin}
            max={RACE_MAX_MS}
            step={STEP_MS}
            value={Math.min(RACE_MAX_MS, Math.max(scrubMin, elapsed))}
            onChange={(e) => seekTo(Number(e.target.value))}
            aria-label="경과 시간으로 이동"
            className={styles.range}
          />
          <span className={styles.time}>{(elapsed / 1000).toFixed(2)}s</span>
        </div>
      </section>

      <section className={styles.panel} aria-label="조작">
        <div className={styles.row}>
          <button type="button" className="btn btn-gold" onClick={() => restart(true)}>
            {run ? "처음부터 다시" : "경주 시작"}
          </button>
          <button type="button" className="btn" disabled={!run || finished} onClick={() => setPlay(!playing)}>
            {playing ? "일시정지" : "재생"}
          </button>
          <button type="button" className="btn" disabled={finished} onClick={stepOnce}>
            +{STEP_MS}ms
          </button>
          <button type="button" className="btn" onClick={() => seekTo(RACE_MAX_MS)}>
            결과까지 건너뛰기
          </button>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>배속</span>
          {SPEEDS.map((s) => (
            <button key={s} type="button" aria-pressed={speed === s} className={`${styles.chip} ${speed === s ? styles.chipOn : ""}`} onClick={() => setSpeed(s)}>
              ×{s}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <label className={styles.label} htmlFor="lab-seed">
            시드
          </label>
          <input id="lab-seed" type="number" className={styles.input} value={seed} onChange={(e) => setSeed(Number(e.target.value) || 0)} />
          <button type="button" className="btn" onClick={() => setSeed(Math.floor(Math.random() * 100000))}>
            무작위 시드
          </button>
          <label className={styles.check}>
            <input type="checkbox" checked={withCountdown} onChange={(e) => setWithCountdown(e.target.checked)} /> 3·2·1 카운트다운
          </label>
          <span className={styles.hint}>같은 시드 + 같은 설정 = 같은 경주 (시드 · 옵션은 &quot;처음부터 다시&quot;부터 적용)</span>
        </div>
        <div className={styles.row}>
          <label className={styles.label} htmlFor="lab-my">
            내 말(MY 표식)
          </label>
          <select id="lab-my" className={styles.input} value={myId} onChange={(e) => setMyId(Number(e.target.value))}>
            {HORSES.map((h) => (
              <option key={h.id} value={h.id}>
                {h.id}번 {h.name}
              </option>
            ))}
          </select>
          <span className={styles.label}>내 말에 이벤트 강제</span>
          {FORCE_TYPES.map((t) => (
            <button key={t} type="button" className={styles.chip} disabled={!run || finished} onClick={() => force(t)}>
              {t}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel} aria-label="말별 상태">
          <h2 className={styles.h2}>말별 상태</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>순위</th>
                  <th>말</th>
                  <th>성향</th>
                  <th className={styles.barCol}>진행도</th>
                  <th>기본속도</th>
                  <th>흔들림</th>
                  <th>이벤트 배율</th>
                  <th>스퍼트</th>
                  <th>도착(s)</th>
                </tr>
              </thead>
              <tbody>
                {order.map((id, i) => {
                  const horse = HORSES.find((h) => h.id === id)!;
                  const r = run?.runners.find((x) => x.horseId === id);
                  const modActive = r && r.modifier !== 1 && elapsed < r.modifierUntil;
                  return (
                    <tr key={id} className={id === myId ? styles.mine : undefined}>
                      <td>{i + 1}</td>
                      <td>
                        <span className={styles.dot} style={{ background: horse.color }} />
                        {id} {horse.name}
                      </td>
                      <td>{TRAIT_LABEL[horse.trait]}</td>
                      <td className={styles.barCol}>
                        <div className={styles.bar}>
                          <div className={styles.barFill} style={{ width: `${Math.min(100, (r?.progress ?? 0) * 100)}%`, background: horse.color }} />
                        </div>
                      </td>
                      <td>{r ? `${(r.baseSpeed * BASE_FINISH_MS * 100).toFixed(1)}%` : "-"}</td>
                      <td>{r ? `×${r.drift.toFixed(3)}` : "-"}</td>
                      <td className={modActive ? styles.active : undefined}>{r && modActive ? `×${r.modifier.toFixed(2)}` : "×1.00"}</td>
                      <td>{r?.spurted ? "✔" : "-"}</td>
                      <td>{r?.finishedAt != null ? (r.finishedAt / 1000).toFixed(2) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className={styles.note}>기본속도: 완주 {BASE_FINISH_MS / 1000}초 기준 대비(말마다 ±7%) · 진행도 30% / 70% 지점에서 성향 배율이 바뀝니다.</p>
        </section>

        <div className={styles.side}>
          <section className={styles.panel} aria-label="카메라">
            <h2 className={styles.h2}>카메라 · 진행</h2>
            <dl className={styles.stats}>
              <dt>경과</dt>
              <dd>{(elapsed / 1000).toFixed(2)}s</dd>
              <dt>선두 진행도</dt>
              <dd>{(leader * 100).toFixed(1)}%</dd>
              <dt>카메라 x</dt>
              <dd>
                {cameraFor(leader).toFixed(1)}% / 트랙 {COURSE}%
              </dd>
              <dt>선두-꼴찌 간격</dt>
              <dd>{gap.toFixed(1)}%</dd>
              <dt>상태</dt>
              <dd>{!run ? "대기" : run.elapsed < 0 ? "카운트다운" : finished ? "전원 도착" : "경주 중"}</dd>
              <dt>도착 순서</dt>
              <dd>{run && run.ranking.length ? run.ranking.join(" → ") : "-"}</dd>
            </dl>
          </section>

          <section className={styles.panel} aria-label="이벤트 로그">
            <h2 className={styles.h2}>이벤트 로그 ({log.length})</h2>
            <ol className={styles.log}>
              {[...log].reverse().map((m) => (
                <li key={m.id}>
                  <span className={styles.logTime}>{(m.at / 1000).toFixed(1)}s</span>
                  <span className={styles.logType}>{m.type}</span>
                  {m.text}
                </li>
              ))}
              {log.length === 0 && <li className={styles.hint}>아직 이벤트가 없어요. (메시지는 1.5초 간격으로 제한됩니다)</li>}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
