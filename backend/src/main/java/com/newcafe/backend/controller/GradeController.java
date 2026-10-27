package com.newcafe.backend.controller;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.newcafe.backend.dto.grade.GradeResponse;
import com.newcafe.backend.repository.GradeRepository;

import lombok.RequiredArgsConstructor;

// 회원 등급 목록 API (로그인 필요). 내 등급(/auth/me의 gradeId)과 메뉴 해금 등급을 비교하거나, 관리자가 해금 등급을 고를 때 쓴다.
@RestController
@RequestMapping("/api/v1/grades")
@RequiredArgsConstructor
public class GradeController {

    private final GradeRepository gradeRepository;

    // GET /api/v1/grades → 낮은 등급부터
    @GetMapping
    @Transactional(readOnly = true)
    public List<GradeResponse> findAll() {
        return gradeRepository.findAllByOrderByMinTotalCouponsAsc().stream().map(GradeResponse::from).toList();
    }
}
