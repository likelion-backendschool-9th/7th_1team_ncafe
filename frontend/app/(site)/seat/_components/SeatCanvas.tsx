"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { FLOOR } from "../_lib/geometry";
import type { SeatSummaryData } from "../_lib/summary";
import type { Chair as ChairModel, ChairStatusMap, FloorPlan, Seat } from "../_types";
import CafeFloorPlan from "./CafeFloorPlan";
import { BellIcon, FitIcon, MinusIcon, PlusIcon } from "./icons";
import styles from "./seat.module.css";
import SeatLegend from "./SeatLegend";

/** 확대 단계(기본 배율의 배수) */
const ZOOMS = [1, 1.35, 1.75, 2.25];
/** 좁은 화면에서도 평면도는 이 폭을 유지하고 가로로 스크롤한다(BLUEPRINT 9) */
const MIN_STAGE = 720;
/** 미니맵 배율 */
const MINI = 0.16;

interface SeatCanvasProps {
  plan: FloorPlan;
  seats: Seat[];
  chairs: ChairModel[];
  statuses: ChairStatusMap | null;
  mine: Set<string>;
  selected: Set<string>;
  interactive: boolean;
  branchName: string | null;
  summary: SeatSummaryData | null;
  /** 제목 아래 작은 안내("미리보기 …") */
  caption: string | null;
  /** 상태를 모를 때 배치도를 덮는 안내 */
  dimmed: string | null;
  waitlist: { enabled: boolean; done: boolean; onOpen: () => void };
  /** 제목과 배치도 사이 — 필터 줄 + 추천 줄(12단계) */
  toolbar?: ReactNode;
  dimSeats?: ReadonlySet<string>;
  recommendedSeats?: ReadonlySet<string>;
  recommendedChairs?: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

interface View {
  x: number;
  y: number;
  w: number;
  h: number;
  overflow: boolean;
}

/**
 * 좌석 배치도 캔버스 — 어두운 면(전광판 · 트랙 무대처럼 포인트 면) 위에 평면도를 배율로 맞춰 그린다.
 * 폭에 맞춘 기본 배율 × 확대 단계로 scale 하고, 넘치면 스크롤 + 왼쪽 위 미니맵(보이는 영역 사각형).
 * 오른쪽 위 [예약대기], 오른쪽 아래 확대 · 축소 · 원래 크기, 아래 범례.
 */
export default function SeatCanvas({
  plan,
  seats,
  chairs,
  statuses,
  mine,
  selected,
  interactive,
  branchName,
  summary,
  caption,
  dimmed,
  waitlist,
  toolbar,
  dimSeats,
  recommendedSeats,
  recommendedChairs,
  onToggle,
}: SeatCanvasProps) {
  const titleId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState(MIN_STAGE / FLOOR.width);
  const [zoomIdx, setZoomIdx] = useState(0);
  const [view, setView] = useState<View>({ x: 0, y: 0, w: FLOOR.width, h: FLOOR.height, overflow: false });
  const scale = fit * ZOOMS[zoomIdx];
  const scaleRef = useRef(scale);
  // 확대 · 축소 뒤에도 화면 가운데가 같은 자리를 보게 — 바꾸기 전 가운데(논리 px)를 기억했다가 레이아웃 뒤 스크롤
  const pendingCenter = useRef<{ cx: number; cy: number } | null>(null);
  const frame = useRef(0);

  const measure = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const s = scaleRef.current;
    setView({
      x: el.scrollLeft / s,
      y: el.scrollTop / s,
      w: el.clientWidth / s,
      h: el.clientHeight / s,
      overflow: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
    });
  }, []);

  // 폭에 맞춘 기본 배율 — ResizeObserver 는 observe 직후 한 번 알려 주므로 첫 측정도 여기서 된다
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setFit(Math.max(el.clientWidth, MIN_STAGE) / FLOOR.width);
      measure();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const measureSoon = useCallback(() => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(measure);
  }, [measure]);

  // 배율이 바뀌면 스크롤을 먼저 맞추고(그리기 전) 다음 프레임에 미니맵 사각형을 잰다
  useLayoutEffect(() => {
    scaleRef.current = scale;
    const el = viewportRef.current;
    const center = pendingCenter.current;
    if (el && center) {
      pendingCenter.current = null;
      el.scrollLeft = center.cx * scale - el.clientWidth / 2;
      el.scrollTop = center.cy * scale - el.clientHeight / 2;
    }
    measureSoon();
  }, [scale, measureSoon]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const changeZoom = (idx: number) => {
    const el = viewportRef.current;
    if (el) {
      pendingCenter.current = { cx: (el.scrollLeft + el.clientWidth / 2) / scale, cy: (el.scrollTop + el.clientHeight / 2) / scale };
    }
    setZoomIdx(idx);
  };

  const stageStyle = { width: FLOOR.width * scale, height: FLOOR.height * scale };
  const floorStyle = { width: FLOOR.width, height: FLOOR.height };

  return (
    <section className={styles.canvas} aria-labelledby={titleId}>
      <div className={styles.canvasHead}>
        <div className={styles.canvasText}>
          <span className={styles.canvasEyebrow}>FLOOR PLAN</span>
          <h2 id={titleId} className={styles.canvasTitle}>
            좌석 배치도{branchName && <small>· {branchName}</small>}
          </h2>
          <p className={styles.canvasCaption} role="status" aria-live="polite">
            {caption}
          </p>
        </div>
        <button type="button" className={styles.waitBtn} disabled={!waitlist.enabled} onClick={waitlist.onOpen}>
          <BellIcon />
          {waitlist.done ? "예약대기 신청됨" : "예약대기"}
        </button>
      </div>

      {toolbar && <div className={styles.toolbar}>{toolbar}</div>}

      <div className={styles.viewportWrap}>
        <div ref={viewportRef} className={styles.viewport} onScroll={measureSoon} tabIndex={0} aria-label="좌석 배치도 — 스크롤 · 확대할 수 있어요">
          <div className={styles.stage} style={stageStyle}>
            <div className={styles.scaled} style={{ ...floorStyle, transform: `scale(${scale})` }}>
              <CafeFloorPlan
                plan={plan}
                seats={seats}
                chairs={chairs}
                statuses={statuses}
                mine={mine}
                selected={selected}
                interactive={interactive}
                dimSeats={dimSeats}
                recommendedSeats={recommendedSeats}
                recommendedChairs={recommendedChairs}
                onToggle={onToggle}
              />
            </div>
          </div>
        </div>

        {dimmed && (
          <div className={styles.dim}>
            <p>{dimmed}</p>
          </div>
        )}

        {view.overflow && (
          <div className={styles.minimap} style={{ width: FLOOR.width * MINI, height: FLOOR.height * MINI }} aria-hidden>
            <div className={styles.scaled} style={{ ...floorStyle, transform: `scale(${MINI})` }}>
              <CafeFloorPlan plan={plan} seats={seats} chairs={chairs} statuses={statuses} mine={mine} selected={selected} interactive={false} compact dimSeats={dimSeats} />
            </div>
            <div
              className={styles.minimapView}
              style={{ left: view.x * MINI, top: view.y * MINI, width: view.w * MINI, height: view.h * MINI }}
            />
          </div>
        )}

        <div className={styles.zoom} role="group" aria-label="배치도 확대 · 축소">
          <button type="button" className={styles.zoomBtn} aria-label="확대" disabled={zoomIdx >= ZOOMS.length - 1} onClick={() => changeZoom(zoomIdx + 1)}>
            <PlusIcon />
          </button>
          <button type="button" className={styles.zoomBtn} aria-label="축소" disabled={zoomIdx === 0} onClick={() => changeZoom(zoomIdx - 1)}>
            <MinusIcon />
          </button>
          <button type="button" className={styles.zoomBtn} aria-label="원래 크기" disabled={zoomIdx === 0} onClick={() => changeZoom(0)}>
            <FitIcon />
          </button>
        </div>
      </div>

      <SeatLegend summary={summary} />
    </section>
  );
}
