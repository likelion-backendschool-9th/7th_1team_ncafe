package com.newcafe.backend.dto.menu.admin;

import com.newcafe.backend.entity.MenuAvailability.SaleStatus;

// 관리자 지점별 메뉴 판매 상태 변경 요청 (ON_SALE / SOLD_OUT / HIDDEN)
public record BranchMenuStatusRequest(SaleStatus status) {
}
