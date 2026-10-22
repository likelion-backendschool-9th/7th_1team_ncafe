package com.newcafe.backend.repository;

import com.newcafe.backend.entity.Menu;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 기본 CRUD는 JpaRepository가 제공한다.
//   목록 조회: findAll()
//   상세 조회: findById(id)
//   등록: save(menu)  (id가 없는 새 엔티티)
//   수정: save(menu)  (id가 있는 엔티티)
//   삭제: deleteById(id) / delete(menu)
public interface MenuRepository extends JpaRepository<Menu, Long> {
    // 메뉴 목록 조회 (삭제되지 않은 메뉴, 사이즈 포함)
    @EntityGraph(attributePaths = "sizes")
    List<Menu> findAllByDeletedFalseOrderByIdAsc();

    // 메뉴 상세 조회 (삭제되지 않은 메뉴, 사이즈 포함)
    @EntityGraph(attributePaths = "sizes")
    Optional<Menu> findByIdAndDeletedFalse(Long id);

    // 메뉴 등록: 상속받은 save(menu) 사용. 사이즈는 menu.sizes에 담아 함께 저장(cascade).

    // 메뉴 수정 (기본 정보). 변경된 행 수를 반환하며 0이면 대상 메뉴가 없거나 삭제된 상태.
    // 사이즈 변경은 영속 상태의 menu.sizes를 수정한 뒤 save(menu)로 반영한다.
    @Modifying(clearAutomatically = true)
    @Query("""
            update Menu m
               set m.nameKor = :nameKor,
                   m.nameEng = :nameEng,
                   m.description = :description,
                   m.image = :image,
                   m.label = :label
             where m.id = :id and m.deleted = false
            """)
    int updateById(@Param("id") Long id,
                   @Param("nameKor") String nameKor,
                   @Param("nameEng") String nameEng,
                   @Param("description") String description,
                   @Param("image") String image,
                   @Param("label") String label);

    // 메뉴 삭제 (논리 삭제). 변경된 행 수를 반환하며 0이면 대상 메뉴가 없거나 이미 삭제된 상태.
    @Modifying(clearAutomatically = true)
    @Query("update Menu m set m.deleted = true where m.id = :id and m.deleted = false")
    int deleteLogicallyById(@Param("id") Long id);
}
