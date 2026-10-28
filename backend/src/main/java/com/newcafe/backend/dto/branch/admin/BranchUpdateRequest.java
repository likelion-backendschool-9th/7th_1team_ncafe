package com.newcafe.backend.dto.branch.admin;

// PUT은 전체 교체이며 지점 ID와 등록일은 변경하지 않는다.
// sort(손님 화면 지점 순서)만 선택 — 보내지 않으면 지금 값을 그대로 둔다(순서 입력이 없는 화면도 저장할 수 있게).
public record BranchUpdateRequest(String name, String address,
        String sections, String fixtures, Boolean open, Integer sort) {
}
