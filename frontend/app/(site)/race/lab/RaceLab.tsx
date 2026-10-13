"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import RaceEventMessage from "../_components/RaceEventMessage";
import raceStyles from "../_components/race.module.css";
import { HORSES } from "../_data/horses";
import { lineupFrame, toFrame } from "../_hooks/useRace";
import { messageFor } from "../_lib/messages";
import { byGate, gatesAfter, TRAIT_LABEL, textOn } from "../_lib/records";
import { advanceTo, BASE_FINISH_MS, createRace, RACE_MAX_MS, seedFor, step, STEP_MS } from "../_lib/simulation";
import { cameraFor, COURSE, TrackScene, type SceneHorse } from "../_lib/trackScene";
import type { Gates, RaceEventMessage as Message, RaceEventType, RaceRun } from "../_types";
import styles from "./lab.module.css";

const SPEEDS = [0.25, 0.5, 1, 2, 4];
const COUNTDOWN_MS = 3000;
const TOAST_MS = 1500;
const UI_INTERVAL_MS = 100;
const NAMES = (id: number) => HORSES.find((h) => h.id === id)?.name.toUpperCase() ?? String(id);
/** 실험실의 "시드" 는 가짜 출발 시각(분)으로 넣는다 — simulation.ts 가 경주 번호 + 출발 시각으로 시드를 만들기 때문 */
const seedRace = (seed: number) => createRace(HORSES, 1, seed * 60000);
/**
 * 실험 경주의 게이트 번호(BLUEPRINT 8.2 "게이트 번호 규칙"을 실험실 안에서 재현 — 사용자 결정 2026-10-13):
 * 직전 실험 경주(끝까지 돌렸거나 결과까지 건너뛴 경주)의 도착 순서대로 1번부터, 없으면 그 시드로 섞은 순서.
 * 시뮬레이션에는 늘 말 id 순(HORSES)으로 넘기므로 같은 시드면 번호와 상관없이 같은 경주다.
 */
const labGates = (lastRanking: number[] | null, seed: number): Gates => gatesAfter(lastRanking, HORSES, seedFor(1, seed * 60000));

/** simulation.ts 의 EVENT_EFFECT 와 같은 값 — 강제 발생 버튼용 */
const FORCE = {
  BOOST: { multiplier: 1.35, durationMs: 1000 },
  SLOW: { multiplier: 0.7, durationMs: 800 },
  STUMBLE: { multiplier: 0.4, durationMs: 500 },
  SPURT: { multiplier: 1.3, durationMs: 1200 },
} as const;
type ForceType = keyof typeof FORCE;
const FORCE_TYPES = Object.keys(FORCE) as ForceType[];

interface Snapshot {
  run: RaceRun | null;
  clock: number; // 그 순간의 가상 시계(ms) — 스텝 사이 보간용
  log: Message[];
  toast: Message | null;
}

/**
 * 경주 실험실 — RaceProvider · 쿠폰 없이 simulation.ts + TrackScene 을 직접 돌린다.
 * 실제 /race 의 Date.now 기준 시계 대신 "실제 경과 × 배속"의 가상 시계(clockRef)를 쓰므로 느리게 · 빠르게 · 한 스텝씩 · 되감기가 된다.
 * 가상 시계는 소수점까지 따로 쌓고 시뮬레이션은 그 시각까지 STEP_MS 단위로 따라잡는다 — run.elapsed(스텝 배수)에 프레임 시간을
 * 더해 목표로 삼으면 스텝보다 짧은 나머지가 매 프레임 버려져 배속이 틀어지고, 60Hz 화면의 ×1 · ×0.5 는 아예 멈춘다.
 * 그리기는 /race 와 같은 toFrame 으로 스텝 사이를 보간한다(×0.25 슬로모션도 부드럽게).
 * 게이트 번호는 경주를 시작할 때 정하고(labGates) 그 경주 동안은 바뀌지 않는다 — 되감아도 같은 번호.
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

  // 시뮬레이션 상태(난수 상태 포함) · 가상 시계는 매 프레임 바뀌므로 ref, 화면용 스냅샷은 100ms 마다
  const runRef = useRef<RaceRun | null>(null);
  const clockRef = useRef(0);
  const logRef = useRef<Message[]>([]);
  const playingRef = useRef(false);
  const speedRef = useRef(speed);
  const [snap, setSnap] = useState<Snapshot>({ run: null, clock: 0, log: [], toast: null });

  // 게이트 번호 — 직전 실험 경주의 도착 순서(lastRanking)로 다음 경주 번호(nextGates)를 정하고, 시작할 때 raceGates 로 고정한다
  const [lastRanking, setLastRanking] = useState<number[] | null>(null);
  const lastRankingKey = useRef("");
  const nextGates = useMemo(() => labGates(lastRanking, seed), [lastRanking, seed]);
  const [raceGates, setRaceGates] = useState<Gates>(nextGates);
  // 화면의 번호: 경주가 있으면 그 경주의 번호, 아직 시작 전이면 다음 경주 번호
  const gates = snap.run ? raceGates : nextGates;

  const sceneHorses = useMemo<SceneHorse[]>(
    () =>
      byGate(HORSES, gates).map((h) => ({ id: h.id, gate: gates[h.id], image: h.image, color: h.color, textColor: textOn(h.color), mine: h.id === myId })),
    [gates, myId],
  );

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  const publish = useCallback(() => {
    const run = runRef.current;
    const log = logRef.current;
    const last = log[log.length - 1];
    const toast = run && last && run.elapsed - last.at < TOAST_MS ? last : null;
    setSnap({ run, clock: clockRef.current, log: [...log], toast });
    // 7마리가 모두 들어온 경주는 "직전 실험 경주" — 다음 경주의 게이트 번호가 된다(지금 경주의 번호는 그대로)
    if (run && run.doneAt !== null && run.ranking.length === HORSES.length) {
      const key = run.ranking.join(",");
      if (key !== lastRankingKey.current) {
        lastRankingKey.current = key;
        setLastRanking(run.ranking);
      }
    }
  }, []);

  /** 번호 초기화 — 다음 경주부터 다시 시드로 섞은 순서 */
  const resetGates = useCallback(() => {
    lastRankingKey.current = "";
    setLastRanking(null);
  }, []);

  const draw = useCallback(() => {
    const run = runRef.current;
    sceneRef.current?.update(run ? toFrame(run, clockRef.current) : lineupFrame(HORSES));
  }, []);

  const setPlay = useCallback((v: boolean) => {
    playingRef.current = v;
    setPlaying(v);
  }, []);

  /** 처음부터 다시 — 같은 시드면 같은 경주. 새 경주이므로 게이트 번호를 다시 정한다 */
  const restart = useCallback(
    (autoplay: boolean) => {
      const created = seedRace(seed);
      runRef.current = { ...created, elapsed: withCountdown ? -COUNTDOWN_MS : 0 };
      clockRef.current = runRef.current.elapsed;
      logRef.current = [];
      setRaceGates(nextGates);
      setPlay(autoplay);
      draw();
      publish();
    },
    [seed, withCountdown, nextGates, setPlay, draw, publish],
  );

  /** 시각 t(ms)로 이동 — 같은 시드로 처음부터 다시 계산한다(강제 발생시킨 이벤트는 반영되지 않는다). 게이트 번호는 지금 경주 그대로 */
  const seekTo = useCallback(
    (t: number) => {
      if (!runRef.current) setRaceGates(nextGates); // 시작 전에 끌었다면 이것이 첫 경주
      const created = seedRace(seed);
      const start = { ...created, elapsed: withCountdown ? -COUNTDOWN_MS : 0 };
      const { run, events } = advanceTo(start, t, NAMES);
      runRef.current = run;
      clockRef.current = Math.max(t, start.elapsed);
      logRef.current = events;
      setPlay(false);
      draw();
      publish();
    },
    [seed, withCountdown, nextGates, setPlay, draw, publish],
  );

  const stepOnce = useCallback(() => {
    if (!runRef.current) restart(false);
    const run = runRef.current;
    if (!run) return;
    const result = step(run, NAMES);
    runRef.current = result.run;
    // 보간은 [elapsed − STEP, elapsed] 구간을 그리므로 한 스텝 앞으로 맞춰 방금 계산한 위치를 그대로 보여 준다
    clockRef.current = result.run.elapsed + STEP_MS;
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
        scene.update(run ? toFrame(run, clockRef.current) : lineupFrame(HORSES));
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

  // 가상 시계 rAF 루프 — 실제 경과 × 배속만큼 시계를 쌓고(탭이 멈췄다 오면 한 번에 100ms 까지만) 시뮬레이션은 그 시각까지 따라잡는다.
  // 일시정지 중에는 시계도 멈춘다
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    let lastUi = 0;
    const tick = (now: number) => {
      const dt = Math.min(100, now - prev);
      prev = now;
      const run = runRef.current;
      if (playingRef.current && run) {
        clockRef.current += dt * speedRef.current;
        const { run: next, events } = advanceTo(run, clockRef.current, NAMES);
        runRef.current = next;
        if (events.length) logRef.current = [...logRef.current, ...events];
        sceneRef.current?.update(toFrame(next, clockRef.current));
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

  const { run, clock, log, toast } = snap;
  const frame = run ? toFrame(run, clock) : null;
  const leader = frame?.leader ?? 0;
  const elapsed = run?.elapsed ?? 0;
  const countNum = run && run.elapsed < 0 ? String(Math.ceil(-run.elapsed / 1000)) : run && run.elapsed < 800 ? "GO!" : null;
  const byGateHorses = byGate(HORSES, gates);
  const order = frame?.order ?? byGateHorses.map((h) => h.id);
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
            {byGateHorses.map((h) => (
              <option key={h.id} value={h.id}>
                {gates[h.id]}번 {h.name}
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
        <div className={styles.row}>
          <span className={styles.label}>다음 경주 게이트</span>
          <span className={styles.hint}>
            {byGate(HORSES, nextGates)
              .map((h) => `${nextGates[h.id]}번 ${h.name.toUpperCase()}`)
              .join(" · ")}{" "}
            — {lastRanking ? "직전 실험 경주 도착 순서" : "직전 실험 경주가 없어 시드로 섞은 순서"} (&quot;처음부터 다시&quot;부터 적용)
          </span>
          <button type="button" className="btn" disabled={!lastRanking} onClick={resetGates}>
            번호 초기화
          </button>
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
                        {gates[id]}번 {horse.name}
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
              <dt>도착 순서(게이트 번호)</dt>
              <dd>{run && run.ranking.length ? run.ranking.map((id) => gates[id]).join(" → ") : "-"}</dd>
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
