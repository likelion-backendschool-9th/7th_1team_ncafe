package com.newcafe.backend.dto.category.admin;

import java.util.List;

// 관리자 카테고리 순서 변경 요청. 모든 카테고리 id를 원하는 순서대로 담는다.
public record CategoryOrderRequest(List<Integer> ids) {
}
