"use client";

import { FLOOR, tableRect } from "../_lib/geometry";
import { SECTION_LABEL } from "../_lib/labels";
import type { Chair as ChairModel, ChairStatusMap, FloorFixture, FloorPlan, Seat } from "../_types";
import Chair from "./Chair";
import { ArrowRightIcon, CupIcon } from "./icons";
import styles from "./seat.module.css";

const NONE: ReadonlySet<string> = new Set();

interface CafeFloorPlanProps {
  plan: FloorPlan;
  seats: Seat[];
  chairs: ChairModel[];
  statuses: ChairStatusMap | null; // null 이면 아직 모름 — 전부 이용 가능처럼 그린다(캔버스가 덮개로 가린다)
  mine: Set<string>;
  selected: Set<string>;
  interactive: boolean;
  /** 미니맵 — 글자 없이 모양만 */
  compact?: boolean;
  /** 필터에 맞지 않는 자리(seat id) — 반투명 */
  dimSeats?: ReadonlySet<string>;
  /** 추천 테이블(seat id) — 금색 테두리 + ★ */
  recommendedSeats?: ReadonlySet<string>;
  /** 추천 바석의 의자 id — 금색 테두리 */
  recommendedChairs?: ReadonlySet<string>;
  onToggle?: (id: string) => void;
}

function pct(box: { x: number; y: number; w: number; h: number }) {
  return { left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` };
}

/**
 * 평면도(지시서 13절) — 창문 · 바 테이블 · 카운터 · 화장실 · 출입구 · 통로 같은 구조물과 구역, 테이블, 의자를
 * FLOOR(900×640) 상자 안에 절대 배치한다. 구조물 · 구역은 데이터의 % 를 그대로 쓰고, 테이블 · 의자는 geometry 가 px 로 바꾼다.
 * 좌표만 바꾸면 위치가 바뀐다. HTML table 은 쓰지 않는다. 배율은 바깥(SeatCanvas · 미니맵)이 transform 으로 정한다.
 * 필터에 맞지 않는 자리는 반투명(지시서 19절), 추천 자리는 금색 + ★(지시서 20절).
 */
export default function CafeFloorPlan({
  plan,
  seats,
  chairs,
  statuses,
  mine,
  selected,
  interactive,
  compact = false,
  dimSeats = NONE,
  recommendedSeats = NONE,
  recommendedChairs = NONE,
  onToggle,
}: CafeFloorPlanProps) {
  return (
    <div className={`${styles.floor} ${compact ? styles.floorCompact : ""}`} style={{ width: FLOOR.width, height: FLOOR.height }}>
      {plan.sections.map((zone) => (
        <div key={zone.section} className={styles.zone} style={pct(zone)}>
          {!compact && (
            <span className={styles.zoneLabel}>
              <strong>{SECTION_LABEL[zone.section].en}</strong>
              <small>· {SECTION_LABEL[zone.section].ko}</small>
            </span>
          )}
        </div>
      ))}

      {plan.fixtures.map((fixture) => (
        <Fixture key={fixture.id} fixture={fixture} compact={compact} />
      ))}

      {seats
        .filter((seat) => seat.type === "TABLE")
        .map((seat) => {
          const rect = tableRect(seat);
          const recommended = recommendedSeats.has(seat.id);
          const dim = dimSeats.has(seat.id);
          return (
            <div
              key={seat.id}
              className={`${styles.table} ${recommended ? styles.tableRecommended : ""} ${dim ? styles.tableDim : ""}`}
              style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
              data-recommended={recommended ? "true" : undefined}
            >
              {!compact && (
                <>
                  <span className={styles.tableId}>{seat.id}</span>
                  <span className={styles.tableCap}>{seat.capacity}인</span>
                  {recommended && (
                    <span className={styles.star} aria-hidden>
                      ★
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}

      {chairs.map((chair) => (
        <Chair
          key={chair.id}
          chair={chair}
          status={statuses?.[chair.id] ?? "AVAILABLE"}
          mine={mine.has(chair.id)}
          selected={selected.has(chair.id)}
          interactive={interactive}
          compact={compact}
          dim={dimSeats.has(chair.seat.id)}
          star={recommendedChairs.has(chair.id)}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

function Fixture({ fixture, compact }: { fixture: FloorFixture; compact: boolean }) {
  const style = pct(fixture);
  switch (fixture.kind) {
    case "WINDOW":
      return (
        <div className={`${styles.fixture} ${styles.fixtureWindow}`} style={style}>
          {!compact && (
            <span>
              {fixture.label}
              {fixture.labelKo && <small className={styles.fixtureSub}>{fixture.labelKo}</small>}
            </span>
          )}
        </div>
      );
    case "BAR":
      return (
        <div className={`${styles.fixture} ${styles.fixtureBar}`} style={style}>
          {!compact && <span>{fixture.label}</span>}
        </div>
      );
    case "COUNTER":
    case "RESTROOM":
      return (
        <div className={`${styles.fixture} ${styles.fixtureBox}`} style={style}>
          {!compact && (
            <span>
              {fixture.kind === "COUNTER" && <CupIcon className={styles.fixtureIcon} />}
              {fixture.label}
              {fixture.labelKo && <small className={styles.fixtureSub}>{fixture.labelKo}</small>}
            </span>
          )}
        </div>
      );
    case "ENTRANCE":
      return (
        <div className={`${styles.fixture} ${styles.fixtureEntrance}`} style={style}>
          {!compact && (
            <span>
              {fixture.label} <ArrowRightIcon className={styles.fixtureIcon} />
            </span>
          )}
        </div>
      );
    case "AISLE":
      return <div className={`${styles.fixtureAisle} ${fixture.w === 0 ? styles.fixtureAisleV : ""}`} style={style} aria-hidden />;
    default:
      return null;
  }
}
