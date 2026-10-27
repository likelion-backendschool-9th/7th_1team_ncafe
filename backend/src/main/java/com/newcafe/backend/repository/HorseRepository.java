package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Horse;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

// 기본 CRUD는 JpaRepository가 제공한다.
//   상세 조회: findById(id)
//   수정: 영속 상태의 horse를 수정한 뒤 save(horse)
// 7마리는 horses_data.sql이 처음에 넣는다(등록·삭제 API 없음).
public interface HorseRepository extends JpaRepository<Horse, Long> {
    // 출전마 목록 (말 관리번호 순 = 시뮬레이션에 넘기는 순서. 순서가 바뀌면 순위가 달라진다)
    List<Horse> findAllByOrderByIdAsc();

    // 다른 말이 이미 쓰는 영문 이름인지 (대소문자 무시)
    boolean existsByNameEngIgnoreCaseAndIdNot(String nameEng, Long id);

    // 다른 말이 이미 쓰는 한글 이름인지
    boolean existsByNameKorAndIdNot(String nameKor, Long id);
}
