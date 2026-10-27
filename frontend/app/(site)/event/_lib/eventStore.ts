// 이벤트 서버 데이터 저장소(lib/remoteStore) — 손님 화면 이벤트 목록 · 내 신청 기록 · 관리자 이벤트 목록.
// 화면은 _hooks/useEvents 의 훅으로 구독하고, 신청 · 관리자 쓰기 뒤에는 refresh() 로 다시 불러온다.
import { createRemoteStore } from "@/lib/remoteStore";
import type { CafeEvent, EventApply } from "../_types";
import { getAdminEvents, getEvents, getMyApplies } from "./eventService";

const NO_EVENTS: CafeEvent[] = [];
const NO_APPLIES: EventApply[] = [];

/** 손님 화면에 보이는 이벤트(진행 중 · 노출 허가) — 다른 손님의 신청으로 참여 인원이 바뀌므로 자주 다시 불러온다 */
export const eventsStore = createRemoteStore(getEvents, NO_EVENTS, 30_000);

/** 내 신청 기록, 최신순(로그인하지 않았으면 빈 목록) — 신청 · 로그인/로그아웃 때 refresh() */
export const myAppliesStore = createRemoteStore(getMyApplies, NO_APPLIES, 60_000);

/** 관리자 이벤트 목록(숨긴 이벤트 포함) — ADMIN 이 아니면 error(401 · 403). /admin/event 만 구독한다 */
export const adminEventsStore = createRemoteStore(getAdminEvents, NO_EVENTS, 30_000);
