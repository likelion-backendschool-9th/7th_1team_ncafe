package com.newcafe.backend.dto.seat;

// 시간대별 의자 상태 (프론트 SeatStatus 타입). 저장하지 않고 예약 · 수리 중 여부로 계산한다
// 응답은 의자 id → 상태 Map이며, AVAILABLE인 의자는 빠진다 (프론트는 없는 의자를 AVAILABLE로 본다)
public enum ChairStatus {
    AVAILABLE, // 이용 가능
    USING,     // 사용 중 (지금 진행 중인 시간대의 예약 자리)
    RESERVED,  // 예약
    REPAIR     // 수리 중
}
