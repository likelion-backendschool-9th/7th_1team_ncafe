package com.newcafe.backend.dto.race;

import com.newcafe.backend.entity.Horse;

// 출전마 응답 (출전표 · 관리자 출전마 목록)
public record HorseResponse(
        Long id,
        String nameKor,
        String nameEng,
        String color,
        String colorName,
        String image,
        String personality,
        String trait,
        String description) {

    public static HorseResponse from(Horse horse) {
        return new HorseResponse(
                horse.getId(),
                horse.getNameKor(),
                horse.getNameEng(),
                horse.getColor(),
                horse.getColorName(),
                horse.getImage(),
                horse.getPersonality(),
                horse.getTrait().name(),
                horse.getDescription());
    }
}
