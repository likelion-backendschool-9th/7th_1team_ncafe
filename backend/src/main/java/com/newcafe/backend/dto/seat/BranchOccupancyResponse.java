package com.newcafe.backend.dto.seat;

import java.time.LocalDate;
import java.util.List;

import com.newcafe.backend.entity.Branch;

// 메인 "지점별 좌석 현황" 응답 — 지점마다 그 날 시간대별 잔여석
// date는 오늘, 오늘 시간대가 모두 지났으면 내일
public record BranchOccupancyResponse(
        LocalDate date,
        List<Item> branches) {

    public record Item(
            BranchSummary branch,
            List<SlotAvailabilityResponse> slots) {
    }

    // 프론트 Branch 타입 (id · name · address만)
    public record BranchSummary(
            String id,
            String name,
            String address) {

        public static BranchSummary from(Branch branch) {
            return new BranchSummary(branch.getId(), branch.getName(), branch.getAddress());
        }
    }
}
