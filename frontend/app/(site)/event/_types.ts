// 이벤트 도메인 타입 — /event · /event/[id] · /my(내 이벤트 참여) · 관리자 이벤트 관리(/admin/event)가 eventService 를 통해 쓴다.
// 필드는 ERD(events · events_applies) 칼럼과 같은 이름(camelCase)이고 백엔드 응답(dto/event)과 같은 모양이다.

/** 진행 상태 — 진행 중 · 예정 · 종료 */
export type EventStatus = "ONGOING" | "UPCOMING" | "ENDED";

/**
 * events — 이벤트는 쿠폰 지급 이벤트(coupon true)와 일반 참여 이벤트로 나뉜다. 둘 다 참여 신청을 받는다(사용자 결정 2026-10-27).
 * 쿠폰 지급 이벤트는 선착순 이벤트다 — 신청할 때마다 참여 인원(crowded)이 1 늘고, 선착순 마감 인원(capacity)과 같아지면 "선착순 마감"이다.
 * 일반 참여 이벤트는 couponAmount · capacity · crowded 를 쓰지 않고(null) 신청 인원 제한도 쿠폰 지급도 없다.
 * 누가 신청했는지는 events_applies 에 남고, 그 수가 applyCount 다(중복 신청 방지 · 인원 확인).
 */
export interface CafeEvent {
  id: number;
  branchId: string; // branch_id — 작성한 지점(branches.id FK, 지점 목록은 seat/_data/branches.ts)
  title: string; // "FIRST GATE 30"
  thumbnail: string | null; // 목록 카드 이미지 경로("/events/..."), 없으면 이미지 칸 없이 티켓만
  imageHero: string | null; // 상세 머리 위 넓은 이미지
  imageDetail: string | null; // 상세 아래 긴 안내 이미지
  description: string; // 카드 · 상세 머리 한 줄 설명
  howTo: string; // how_to TEXT — 참여 방법, 한 줄에 하나(순서대로)
  notes: string; // notes TEXT — 유의 사항, 한 줄에 하나
  dateStart: string | null; // KST "YYYY-MM-DD" — null 이면 이미 시작(서버는 그날 00:00 KST 로 저장)
  dateEnd: string | null; // KST "YYYY-MM-DD"(그날까지 진행) — null 이면 상시(서버는 그날 23:59:59 KST 로 저장)
  coupon: boolean; // 쿠폰 지급(선착순) 이벤트인가 — 신청자가 생기면 바꿀 수 없다
  couponAmount: number | null; // 한 명에게 주는 쿠폰 수 — 쿠폰 지급 이벤트만, 신청자가 생기면 바꿀 수 없다
  capacity: number | null; // 선착순 마감 인원 — 쿠폰 지급 이벤트만(관리자 입력)
  crowded: number | null; // 선착순 참여 인원 — 쿠폰 지급 이벤트만, 신청할 때마다 1 늘어난다(관리자가 고치지 않는다)
  applyCount: number; // 신청 기록(events_applies) 수 — 일반 참여 이벤트의 "N명 참여" 표시 · 신청자 유무
  visible: boolean; // 노출 허가 — 켜면 진행 중이 아니어도(예정 · 종료) /event 에 보인다. 진행 중은 늘 보인다
  status: EventStatus | null; // 관리자가 직접 지정한 상태 — null 이면 날짜로 자동(사용자 결정 2026-10-14)
}

/** 관리자 등록 · 수정 폼 값 — 참여 인원 · 신청 기록 수는 신청으로만 바뀐다 */
export type CafeEventInput = Omit<CafeEvent, "id" | "crowded" | "applyCount">;

/** events_applies — 회원은 한 이벤트에 한 번 신청하고, 취소는 없다(사용자 결정 2026-10-27) */
export interface EventApply {
  applyId: number;
  eventId: number;
  eventTitle: string;
  branchId: string;
  coupon: boolean;
  couponAmount: number | null; // 받은 쿠폰 수(쿠폰 지급 이벤트) — 신청자가 생기면 관리자가 바꿀 수 없어 같다
  memberNo: number;
  appliedDate: string; // ISO 시각
}
