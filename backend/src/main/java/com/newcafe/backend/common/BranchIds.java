package com.newcafe.backend.common;

import java.util.regex.Pattern;

import com.newcafe.backend.common.exception.BadRequestException;

// 지점 id(branches.id, 예: "gangnam") 형식 검사.
// 지점(branches) 엔티티가 main에 들어오면 형식 대신 실제로 있는 지점인지 확인하도록 바꾼다.
public final class BranchIds {

    private static final Pattern FORMAT = Pattern.compile("^[a-z0-9-]{1,50}$");

    private BranchIds() {
    }

    public static String require(String branchId) {
        if (branchId == null || !FORMAT.matcher(branchId).matches()) {
            throw new BadRequestException("BRANCH_ID_INVALID", "지점 id는 영문 소문자·숫자·하이픈만 사용할 수 있습니다: " + branchId);
        }
        return branchId;
    }
}
