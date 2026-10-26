package com.newcafe.backend.dto.race.admin;

// 관리자 출전마 수정 요청 (말 관리번호는 경로로 받고 바꾸지 않는다)
public record HorseRequest(
        String nameKor,
        String nameEng,
        String color,
        String colorName,
        String image,
        String personality,
        String trait,
        String description) {
}
