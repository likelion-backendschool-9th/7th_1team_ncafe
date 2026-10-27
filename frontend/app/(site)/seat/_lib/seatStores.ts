// 좌석 서버 데이터 저장소 — /seat · 메인 · /my 가 UserProvider 를 거쳐 함께 쓴다(같은 저장소라 요청도 하나).
import { createRemoteStore } from "@/lib/remoteStore";
import type { SeatReservation } from "@/types/common";
import { getMySeatReservations } from "./seatService";

const NO_RESERVATIONS: SeatReservation[] = [];

/** 내 예약 · 예약대기, 최신순(로그인하지 않았으면 빈 목록) — 예약 · 대기 · 취소 · 로그인/로그아웃 때 refresh().
 *  30초마다 다시 불러와 예약대기의 "자리 났어요"(notifiedAt)가 페이지를 새로고침하지 않아도 뜬다 */
export const mySeatReservationsStore = createRemoteStore(getMySeatReservations, NO_RESERVATIONS, 30_000);
